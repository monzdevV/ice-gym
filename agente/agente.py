#!/usr/bin/env python3
"""
Agente lector de facturas (versión "de servidor").

Recorre las carpetas de facturas del disco del servidor y, por cada factura
(PDF o foto jpg/png/webp):

  1. DISCO   -> la coge del disco.
  2. CLAUDE  -> la manda a Claude (vía OpenRouter) con un prompt fijo y la
                herramienta `guardar_factura` vinculada. Claude solo LEE la
                factura y devuelve una llamada a la herramienta con los datos.
  3. INSERT  -> el agente (este script, no Claude) ejecuta `guardar_factura`,
                que hace el INSERT en la tabla `facturas` de Supabase.

Claude nunca toca la base de datos. Sin memoria: cada factura empieza de cero.

Uso:
    python agente.py                      # procesa ./facturas
    python agente.py --carpeta /srv/facturas
    python agente.py --dry-run            # extrae y muestra el JSON, sin insertar
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI

# --------------------------------------------------------------------------
# Configuración
# --------------------------------------------------------------------------

AQUI = Path(__file__).resolve().parent
load_dotenv(AQUI / ".env")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODELO_POR_DEFECTO = "anthropic/claude-sonnet-4.5"

EXTENSIONES_IMAGEN = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
EXTENSIONES_PDF = {".pdf"}
EXTENSIONES = set(EXTENSIONES_IMAGEN) | EXTENSIONES_PDF

TAMANO_MAXIMO = 20 * 1024 * 1024  # 20 MB

PROMPT_SISTEMA = (
    "Eres un asistente de administración.\n"
    "Lee la factura que te paso (PDF o foto).\n"
    "Saca: número, fecha, proveedor, NIF,\n"
    "base imponible, IVA y total.\n"
    "Si un dato no aparece, déjalo vacío.\n"
    "No inventes nada.\n"
    "Cuando lo tengas, llama a guardar_factura."
)

# Consola de Windows: forzar UTF-8 para las tildes.
for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except Exception:
        pass


# --------------------------------------------------------------------------
# Normalización
# --------------------------------------------------------------------------

def texto_o_none(valor: Any) -> Optional[str]:
    """Cadenas vacías (o solo espacios) -> None."""
    if valor is None:
        return None
    s = str(valor).strip()
    return s or None


def normalizar_nif(valor: Any) -> Optional[str]:
    """NIF/CIF en mayúsculas, sin espacios, guiones ni puntos."""
    s = texto_o_none(valor)
    if s is None:
        return None
    s = re.sub(r"[\s\-\.]", "", s).upper()
    return s or None


def normalizar_importe(valor: Any) -> Optional[float]:
    """'1.234,56 €' / '1234.56' / 1234.56 -> 1234.56. Lo que no se entienda -> None."""
    if valor is None or isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float)):
        return round(float(valor), 2)
    s = str(valor).strip()
    if not s:
        return None
    s = re.sub(r"[^\d,.\-]", "", s)  # quita €, EUR, espacios...
    if not s or s in {"-", ".", ","}:
        return None
    if "," in s and "." in s:
        # El último separador es el decimal.
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def normalizar_fecha(valor: Any) -> Optional[str]:
    """Devuelve AAAA-MM-DD o None. Acepta también DD/MM/AAAA y DD-MM-AAAA."""
    s = texto_o_none(valor)
    if s is None:
        return None
    for formato in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y/%m/%d", "%d/%m/%y"):
        try:
            return datetime.strptime(s[:10] if formato == "%Y-%m-%d" else s, formato).date().isoformat()
        except ValueError:
            continue
    return None


def normalizar_factura(datos: dict[str, Any]) -> dict[str, Any]:
    return {
        "numero": texto_o_none(datos.get("numero")),
        "fecha": normalizar_fecha(datos.get("fecha")),
        "proveedor": texto_o_none(datos.get("proveedor")),
        "nif": normalizar_nif(datos.get("nif")),
        "base": normalizar_importe(datos.get("base")),
        "iva": normalizar_importe(datos.get("iva")),
        "total": normalizar_importe(datos.get("total")),
    }


# --------------------------------------------------------------------------
# Contexto de la factura en curso (lo rellena el agente, no Claude)
# --------------------------------------------------------------------------

CONTEXTO: dict[str, Any] = {
    "supabase": None,   # cliente autenticado (None en --dry-run)
    "archivo": None,    # ruta relativa de la factura en curso
    "modelo": None,     # modelo de OpenRouter usado
    "dry_run": False,
    "empresas": None,   # caché {cif_normalizado: id}
}


def buscar_empresa_id(nif: Optional[str]) -> Optional[str]:
    """Busca en `empresas` por `cif` normalizado. Devuelve el id o None."""
    sb = CONTEXTO["supabase"]
    if not nif or sb is None:
        return None
    if CONTEXTO["empresas"] is None:
        cache: dict[str, Any] = {}
        desde, paso = 0, 1000
        while True:
            filas = sb.table("empresas").select("id,cif").range(desde, desde + paso - 1).execute().data or []
            for fila in filas:
                cif = normalizar_nif(fila.get("cif"))
                if cif and cif not in cache:
                    cache[cif] = fila["id"]
            if len(filas) < paso:
                break
            desde += paso
        CONTEXTO["empresas"] = cache
    return CONTEXTO["empresas"].get(nif)


# --------------------------------------------------------------------------
# La herramienta. Claude solo la "pide"; quien la ejecuta es el agente.
# --------------------------------------------------------------------------

@tool(parse_docstring=True)
def guardar_factura(
    numero: Optional[str] = None,
    fecha: Optional[str] = None,
    proveedor: Optional[str] = None,
    nif: Optional[str] = None,
    base: Optional[float] = None,
    iva: Optional[float] = None,
    total: Optional[float] = None,
) -> str:
    """Guarda los datos de una factura en la base de datos.

    Args:
        numero: Número de la factura tal como aparece.
        fecha: Fecha de emisión en formato AAAA-MM-DD.
        proveedor: Nombre o razón social del emisor de la factura.
        nif: NIF/CIF del proveedor.
        base: Base imponible en euros.
        iva: Cuota de IVA en euros.
        total: Importe total de la factura en euros.
    """
    datos = normalizar_factura(
        {"numero": numero, "fecha": fecha, "proveedor": proveedor, "nif": nif,
         "base": base, "iva": iva, "total": total}
    )
    fila = {
        **datos,
        "archivo": CONTEXTO["archivo"],
        "origen": "carpeta",
        "modelo": CONTEXTO["modelo"],
    }

    if CONTEXTO["dry_run"]:
        print("   [dry-run] No se inserta. JSON extraído:")
        print("   " + json.dumps(fila, ensure_ascii=False, indent=2).replace("\n", "\n   "))
        return "dry-run"

    empresa_id = buscar_empresa_id(datos["nif"])
    if empresa_id is not None:
        fila["empresa_id"] = empresa_id

    respuesta = CONTEXTO["supabase"].table("facturas").insert(fila).execute()
    nuevo = (respuesta.data or [{}])[0]
    vinculo = f" · empresa {empresa_id}" if empresa_id else " · sin empresa vinculada"
    print(f"   INSERT en facturas OK (id {nuevo.get('id', '?')}){vinculo}")
    print("   " + json.dumps(datos, ensure_ascii=False))
    return f"guardada {nuevo.get('id', '')}".strip()


# --------------------------------------------------------------------------
# Paso 1: disco
# --------------------------------------------------------------------------

def listar_facturas(raiz: Path) -> list[Path]:
    return sorted(
        p for p in raiz.rglob("*")
        if p.is_file() and p.suffix.lower() in EXTENSIONES and not p.name.startswith(".")
    )


def bloque_de_archivo(ruta: Path) -> dict[str, Any]:
    """Construye el bloque de contenido para el mensaje (formato OpenRouter)."""
    b64 = base64.b64encode(ruta.read_bytes()).decode("ascii")
    ext = ruta.suffix.lower()
    if ext in EXTENSIONES_PDF:
        return {
            "type": "file",
            "file": {"filename": ruta.name, "file_data": f"data:application/pdf;base64,{b64}"},
        }
    mime = EXTENSIONES_IMAGEN.get(ext) or mimetypes.guess_type(ruta.name)[0] or "image/jpeg"
    return {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}


# --------------------------------------------------------------------------
# Supabase
# --------------------------------------------------------------------------

def conectar_supabase():
    """Inicia sesión como usuario del CRM (rol authenticated). Nunca service_role."""
    from supabase import create_client

    faltan = [v for v in ("SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "CRM_EMAIL", "CRM_PASSWORD") if not os.getenv(v)]
    if faltan:
        sys.exit(f"Faltan variables en .env: {', '.join(faltan)}")

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_PUBLISHABLE_KEY"])
    try:
        sesion = sb.auth.sign_in_with_password(
            {"email": os.environ["CRM_EMAIL"], "password": os.environ["CRM_PASSWORD"]}
        )
    except Exception as e:  # credenciales malas, red, etc.
        sys.exit(f"No se pudo iniciar sesión en Supabase: {e}")
    print(f"Sesión iniciada en Supabase como {sesion.user.email if sesion.user else os.environ['CRM_EMAIL']}")
    return sb


def ya_guardada(sb, archivo: str) -> bool:
    filas = sb.table("facturas").select("id").eq("archivo", archivo).limit(1).execute().data
    return bool(filas)


# --------------------------------------------------------------------------
# Paso 2: Claude
# --------------------------------------------------------------------------

def crear_llm():
    clave = os.getenv("OPENROUTER_API_KEY")
    if not clave:
        sys.exit("Falta OPENROUTER_API_KEY en .env")
    modelo = os.getenv("OPENROUTER_MODEL") or MODELO_POR_DEFECTO
    llm = ChatOpenAI(
        model=modelo,
        api_key=clave,
        base_url=OPENROUTER_BASE_URL,
        temperature=0,
        max_retries=2,
        timeout=120,
    )
    # Claude está obligado a responder llamando a guardar_factura.
    return llm.bind_tools([guardar_factura], tool_choice="guardar_factura"), modelo


def leer_con_claude(llm_con_herramienta, ruta: Path) -> dict[str, Any]:
    """Una conversación nueva por factura (sin memoria). Devuelve los args del tool_call."""
    mensajes = [
        SystemMessage(content=PROMPT_SISTEMA),
        HumanMessage(content=[
            {"type": "text", "text": f"Factura: {ruta.name}"},
            bloque_de_archivo(ruta),
        ]),
    ]
    respuesta = llm_con_herramienta.invoke(mensajes)
    llamadas = [c for c in (respuesta.tool_calls or []) if c.get("name") == "guardar_factura"]
    if not llamadas:
        raise RuntimeError("Claude no devolvió la llamada a guardar_factura")
    return llamadas[0].get("args") or {}


# --------------------------------------------------------------------------
# Bucle principal
# --------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Agente lector de facturas: disco -> Claude (OpenRouter) -> INSERT en Supabase."
    )
    parser.add_argument(
        "--carpeta", type=Path, default=AQUI / "facturas",
        help="Carpeta raíz con las subcarpetas de facturas (por defecto: ./facturas junto al script).",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Extrae los datos y muestra el JSON sin insertar nada (no conecta con Supabase).",
    )
    args = parser.parse_args()

    raiz: Path = args.carpeta.resolve()
    if not raiz.is_dir():
        sys.exit(f"No existe la carpeta: {raiz}")

    facturas = listar_facturas(raiz)
    print(f"Carpeta: {raiz}")
    print(f"Facturas encontradas: {len(facturas)}" + ("  (modo dry-run)" if args.dry_run else ""))
    if not facturas:
        return 0

    llm, modelo = crear_llm()
    sb = None if args.dry_run else conectar_supabase()
    CONTEXTO.update(supabase=sb, modelo=modelo, dry_run=args.dry_run)
    print(f"Modelo: {modelo}\n")

    guardadas = saltadas = errores = 0
    for i, ruta in enumerate(facturas, 1):
        archivo = ruta.relative_to(raiz).as_posix()
        print(f"[{i}/{len(facturas)}] {archivo}")

        # 1. Disco
        tamano = ruta.stat().st_size
        if tamano > TAMANO_MAXIMO:
            print(f"   1. DISCO   -> demasiado grande ({tamano / 1_048_576:.1f} MB), se salta\n")
            saltadas += 1
            continue
        if sb is not None and ya_guardada(sb, archivo):
            print("   1. DISCO   -> ya estaba guardada, se salta\n")
            saltadas += 1
            continue
        print(f"   1. DISCO   -> leída ({tamano / 1024:.0f} KB)")

        try:
            # 2. Claude (solo lee y devuelve el tool_call)
            print("   2. CLAUDE  -> leyendo la factura...")
            datos = leer_con_claude(llm, ruta)
            print(f"   2. CLAUDE  -> pide guardar_factura({json.dumps(datos, ensure_ascii=False)})")

            # 3. El agente ejecuta la herramienta (INSERT). No se vuelve a llamar a Claude.
            print("   3. INSERT  -> el agente ejecuta guardar_factura")
            CONTEXTO["archivo"] = archivo
            guardar_factura.invoke(normalizar_factura(datos))  # normaliza antes de validar tipos
            guardadas += 1
        except Exception as e:
            errores += 1
            print(f"   ERROR: {e}")
        finally:
            CONTEXTO["archivo"] = None
        print()

    etiqueta = "procesadas (dry-run)" if args.dry_run else "guardadas"
    print(f"Resumen: {guardadas} {etiqueta} · {saltadas} saltadas · {errores} con error")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
