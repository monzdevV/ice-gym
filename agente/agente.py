#!/usr/bin/env python3
"""
Agente lector de facturas de Ice Gym.

Vive en el servidor y está siempre encendido: vigila las carpetas de facturas
del disco (Proveedores, Suministros, Gastos-viaje…) y, por cada PDF o foto
nueva, hace siempre lo mismo:

  1. DISCO   el agente coge la factura de la carpeta.
  2. CLAUDE  se la manda a Claude (vía OpenRouter) con el prompt del sistema
             y la herramienta `guardar_factura`. Claude la lee (también si es
             una foto), saca los datos y pide usar la herramienta con un JSON.
  3. INSERT  el agente ejecuta `guardar_factura`: manda el JSON a la API REST
             de Supabase y Supabase hace el INSERT en la tabla `facturas`.
  4. FIN     no se vuelve a llamar a Claude.

Claude nunca toca la base de datos. No hay memoria: cada factura es una
conversación nueva.

Uso:
    python agente.py                         # siempre encendido, vigila ./facturas
    python agente.py --una-vez               # una pasada y termina
    python agente.py --carpeta /srv/facturas --intervalo 60
    python agente.py --dry-run               # una pasada, muestra el JSON y no inserta
"""

from __future__ import annotations

import argparse
import base64
import json
import logging
import os
import re
import signal
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Annotated, Any, Optional

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import BaseTool, InjectedToolArg, tool
from langchain_openai import ChatOpenAI

AQUI = Path(__file__).resolve().parent
load_dotenv(AQUI / ".env")

# Consola de Windows: forzar UTF-8 para las tildes.
for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except Exception:
        pass

log = logging.getLogger("agente")


# ==========================================================================
# Las partes del agente
# ==========================================================================

# --- Modelo (el cerebro). Cambiar de modelo es cambiar este nombre. ---------

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODELO_POR_DEFECTO = "anthropic/claude-sonnet-5.5"

# --- Prompt del sistema. Siempre el mismo, con cada factura. -----------------

PROMPT_SISTEMA = (
    "Eres un asistente de administración.\n"
    "Lee la factura que te paso (PDF o foto).\n"
    "Saca: número, fecha, proveedor, NIF,\n"
    "base imponible, IVA y total.\n"
    "Si un dato no aparece, déjalo vacío.\n"
    "No inventes nada.\n"
    "Cuando lo tengas, llama a guardar_factura."
)

# --- Herramienta: guardar_factura. Más abajo, en `crear_guardar_factura`. ----

# --- Memoria: ninguna. Cada factura empieza de cero (ver `mensajes_factura`).

# --- Bucle: agente -> Claude -> agente ejecuta la herramienta -> fin. --------
#     Ver `procesar_factura`.


# ==========================================================================
# Carpetas (en el disco del servidor)
# ==========================================================================

EXTENSIONES_IMAGEN = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
EXTENSIONES = set(EXTENSIONES_IMAGEN) | {".pdf"}
TAMANO_MAXIMO = 20 * 1024 * 1024  # 20 MB
# Un archivo modificado hace menos de esto puede estar copiándose todavía.
ESPERA_ESCRITURA = 10  # segundos


def listar_facturas(raiz: Path) -> list[Path]:
    return sorted(
        p for p in raiz.rglob("*")
        if p.is_file() and p.suffix.lower() in EXTENSIONES and not p.name.startswith(".")
    )


def bloque_de_archivo(ruta: Path) -> dict[str, Any]:
    """El fichero tal cual, en base64, como bloque de contenido para OpenRouter."""
    b64 = base64.b64encode(ruta.read_bytes()).decode("ascii")
    ext = ruta.suffix.lower()
    if ext == ".pdf":
        return {"type": "file", "file": {"filename": ruta.name, "file_data": f"data:application/pdf;base64,{b64}"}}
    return {"type": "image_url", "image_url": {"url": f"data:{EXTENSIONES_IMAGEN[ext]};base64,{b64}"}}


# ==========================================================================
# Normalización del JSON de Claude
# ==========================================================================

def texto_o_none(valor: Any) -> Optional[str]:
    if valor is None:
        return None
    s = str(valor).strip()
    return s or None


def normalizar_nif(valor: Any) -> Optional[str]:
    """NIF/CIF en mayúsculas, sin espacios, guiones ni puntos."""
    s = texto_o_none(valor)
    if s is None:
        return None
    return re.sub(r"[\s\-.]", "", s).upper() or None


def normalizar_importe(valor: Any) -> Optional[float]:
    """'1.234,56 €' / '1234.56' / 1234.56 -> 1234.56. Lo que no se entienda -> None."""
    if valor is None or isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float)):
        return round(float(valor), 2)
    s = re.sub(r"[^\d,.\-]", "", str(valor))
    if not s or s in {"-", ".", ","}:
        return None
    if "," in s and "." in s:
        # El último separador es el decimal.
        s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def normalizar_fecha(valor: Any) -> Optional[str]:
    """AAAA-MM-DD o None. Acepta también DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA y DD/MM/AA."""
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


# ==========================================================================
# Supabase (PostgreSQL). El agente le habla por su API REST: cada POST a
# /rest/v1/facturas se convierte en un INSERT.
# ==========================================================================

class Supabase:
    """Sesión de un usuario del CRM (rol authenticated, sujeto a RLS). Nunca service_role."""

    def __init__(self) -> None:
        from supabase import create_client

        faltan = [v for v in ("SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "CRM_EMAIL", "CRM_PASSWORD") if not os.getenv(v)]
        if faltan:
            sys.exit(f"Faltan variables en .env: {', '.join(faltan)}")
        self.cliente = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_PUBLISHABLE_KEY"])
        self._empresas: Optional[dict[str, str]] = None
        self.entrar()

    def entrar(self) -> None:
        try:
            sesion = self.cliente.auth.sign_in_with_password(
                {"email": os.environ["CRM_EMAIL"], "password": os.environ["CRM_PASSWORD"]}
            )
        except Exception as e:
            sys.exit(f"No se pudo iniciar sesión en Supabase: {e}")
        log.info("Sesión iniciada en Supabase como %s", sesion.user.email if sesion.user else os.environ["CRM_EMAIL"])

    def mantener_sesion(self) -> None:
        """Renueva el token si ha caducado; si ya no se puede, vuelve a entrar."""
        try:
            if self.cliente.auth.get_session() is not None:
                return
        except Exception:
            pass
        self.entrar()

    def ya_guardada(self, archivo: str) -> bool:
        filas = self.cliente.table("facturas").select("id").eq("archivo", archivo).limit(1).execute().data
        return bool(filas)

    def empresa_por_nif(self, nif: Optional[str]) -> Optional[str]:
        """Id de la empresa del CRM cuyo `cif` coincide con el NIF de la factura."""
        if not nif:
            return None
        if self._empresas is None:
            self._empresas = {}
            desde, paso = 0, 1000
            while True:
                filas = self.cliente.table("empresas").select("id,cif").range(desde, desde + paso - 1).execute().data or []
                for fila in filas:
                    cif = normalizar_nif(fila.get("cif"))
                    if cif:
                        self._empresas.setdefault(cif, fila["id"])
                if len(filas) < paso:
                    break
                desde += paso
        return self._empresas.get(nif)

    def olvidar_empresas(self) -> None:
        """Las empresas cambian mientras el agente está encendido: se recargan en cada ronda."""
        self._empresas = None

    def insertar_factura(self, fila: dict[str, Any]) -> dict[str, Any]:
        # POST /rest/v1/facturas con Prefer: return=representation.
        return (self.cliente.table("facturas").insert(fila).execute().data or [{}])[0]


def es_duplicada(error: Exception) -> bool:
    """`archivo` es único: otro agente (u otra ronda) ya guardó esta factura."""
    return getattr(error, "code", None) == "23505"


# ==========================================================================
# Herramienta guardar_factura. Claude solo pide usarla; la ejecuta el agente.
# ==========================================================================

def crear_guardar_factura(bd: Optional[Supabase], modelo: str) -> BaseTool:
    """`bd` es None en --dry-run: entonces la herramienta enseña el JSON y no inserta."""

    @tool(parse_docstring=True)
    def guardar_factura(
        archivo: Annotated[str, InjectedToolArg],
        numero: Optional[str] = None,
        fecha: Optional[str] = None,
        proveedor: Optional[str] = None,
        nif: Optional[str] = None,
        base: Optional[float] = None,
        iva: Optional[float] = None,
        total: Optional[float] = None,
    ) -> str:
        """Guarda una factura en Supabase.

        Args:
            archivo: Ruta de la factura dentro de la carpeta. La pone el agente, no Claude.
            numero: Número de la factura tal como aparece.
            fecha: Fecha de emisión en formato AAAA-MM-DD.
            proveedor: Nombre o razón social del emisor de la factura.
            nif: NIF/CIF del proveedor.
            base: Base imponible en euros.
            iva: Cuota de IVA en euros.
            total: Importe total de la factura en euros.
        """
        datos = normalizar_factura(
            {"numero": numero, "fecha": fecha, "proveedor": proveedor, "nif": nif, "base": base, "iva": iva, "total": total}
        )
        fila = {**datos, "archivo": archivo, "modelo": modelo}

        if bd is None:
            log.info("   [dry-run] no se inserta:\n%s", json.dumps(fila, ensure_ascii=False, indent=2))
            return "dry-run"

        empresa_id = bd.empresa_por_nif(datos["nif"])
        if empresa_id:
            fila["empresa_id"] = empresa_id
        nueva = bd.insertar_factura(fila)
        log.info(
            "   INSERT en facturas -> 201 Created (id %s, %s)",
            nueva.get("id", "?"),
            f"empresa {empresa_id}" if empresa_id else "sin empresa del CRM",
        )
        return f"guardada {nueva.get('id', '')}".strip()

    return guardar_factura


# ==========================================================================
# Claude, vía OpenRouter
# ==========================================================================

def crear_llm(modelo: str, herramienta: BaseTool) -> Any:
    clave = os.getenv("OPENROUTER_API_KEY")
    if not clave:
        sys.exit("Falta OPENROUTER_API_KEY en .env")
    llm = ChatOpenAI(model=modelo, api_key=clave, base_url=OPENROUTER_BASE_URL, temperature=0, max_retries=2, timeout=120)
    # Claude responde siempre pidiendo guardar_factura.
    return llm.bind_tools([herramienta], tool_choice=herramienta.name)


def mensajes_factura(ruta: Path) -> list[Any]:
    """Sin memoria: cada factura es una conversación nueva con el mismo prompt."""
    return [
        SystemMessage(content=PROMPT_SISTEMA),
        HumanMessage(content=[{"type": "text", "text": f"Factura: {ruta.name}"}, bloque_de_archivo(ruta)]),
    ]


# ==========================================================================
# El bucle del agente, para una factura
# ==========================================================================

def procesar_factura(ruta: Path, archivo: str, llm: Any, herramienta: BaseTool) -> None:
    # 1. agente -> Claude: «esta es la factura».
    log.info("   2. CLAUDE  -> leyendo la factura")
    respuesta = llm.invoke(mensajes_factura(ruta))

    # 2. Claude -> agente: «usa guardar_factura con estos datos».
    llamada = next((c for c in respuesta.tool_calls if c["name"] == herramienta.name), None)
    if llamada is None:
        raise RuntimeError(f"Claude no pidió {herramienta.name}")
    log.info("   2. CLAUDE  -> pide %s(%s)", herramienta.name, json.dumps(llamada["args"], ensure_ascii=False))

    # 3. el agente ejecuta guardar_factura -> INSERT en Supabase.
    log.info("   3. INSERT  -> el agente ejecuta %s", herramienta.name)
    herramienta.invoke({**normalizar_factura(llamada["args"]), "archivo": archivo})

    # 4. fin: el agente para aquí.


# ==========================================================================
# El servidor: el agente siempre encendido
# ==========================================================================

class Agente:
    def __init__(self, raiz: Path, dry_run: bool) -> None:
        self.raiz = raiz
        self.modelo = os.getenv("OPENROUTER_MODEL") or MODELO_POR_DEFECTO
        self.bd = None if dry_run else Supabase()
        self.herramienta = crear_guardar_factura(self.bd, self.modelo)
        self.llm = crear_llm(self.modelo, self.herramienta)
        # Archivo -> (tamaño, fecha de modificación) ya resuelto (guardado, saltado o con error).
        # Un archivo con error sólo se reintenta si cambia, para no pagar a Claude en cada ronda.
        self.vistos: dict[str, tuple[int, float]] = {}

    def ronda(self) -> tuple[int, int, int]:
        """Procesa las facturas nuevas. Devuelve (guardadas, saltadas, errores)."""
        guardadas = saltadas = errores = 0
        pendientes: list[tuple[Path, str, tuple[int, float]]] = []
        ahora = time.time()
        for ruta in listar_facturas(self.raiz):
            archivo = ruta.relative_to(self.raiz).as_posix()
            st = ruta.stat()
            firma = (st.st_size, st.st_mtime)
            if self.vistos.get(archivo) == firma or ahora - st.st_mtime < ESPERA_ESCRITURA:
                continue
            pendientes.append((ruta, archivo, firma))

        if not pendientes:
            return 0, 0, 0
        if self.bd is not None:
            self.bd.mantener_sesion()
            self.bd.olvidar_empresas()

        for ruta, archivo, firma in pendientes:
            self.vistos[archivo] = firma
            log.info("%s", archivo)
            if firma[0] > TAMANO_MAXIMO:
                log.warning("   1. DISCO   -> demasiado grande (%.1f MB), se salta", firma[0] / 1_048_576)
                saltadas += 1
                continue
            if self.bd is not None and self.bd.ya_guardada(archivo):
                log.info("   1. DISCO   -> ya estaba guardada, se salta")
                saltadas += 1
                continue
            log.info("   1. DISCO   -> leída (%.0f KB)", firma[0] / 1024)
            try:
                procesar_factura(ruta, archivo, self.llm, self.herramienta)
                guardadas += 1
            except Exception as e:
                if es_duplicada(e):
                    log.info("   3. INSERT  -> ya estaba guardada, se salta")
                    saltadas += 1
                    continue
                errores += 1
                log.error("   ERROR: %s", e)

        etiqueta = "procesadas (dry-run)" if self.bd is None else "guardadas"
        log.info("Ronda: %d %s · %d saltadas · %d con error", guardadas, etiqueta, saltadas, errores)
        return guardadas, saltadas, errores

    def vigilar(self, intervalo: int) -> None:
        log.info("Vigilando %s cada %d s (Ctrl+C para parar)", self.raiz, intervalo)
        while True:
            try:
                self.ronda()
            except Exception as e:  # red caída, Supabase sin servicio…: se reintenta en la siguiente ronda
                log.error("Ronda fallida: %s", e)
            time.sleep(intervalo)


def parar(*_: Any) -> None:
    """systemd y Docker paran con SIGTERM: salir igual que con Ctrl+C."""
    raise KeyboardInterrupt


def main() -> int:
    parser = argparse.ArgumentParser(description="Agente lector de facturas: carpetas -> Claude (OpenRouter) -> INSERT en Supabase.")
    parser.add_argument(
        "--carpeta", type=Path, default=Path(os.getenv("FACTURAS_CARPETA") or AQUI / "facturas"),
        help="Carpeta raíz con las subcarpetas de facturas (por defecto FACTURAS_CARPETA o ./facturas).",
    )
    parser.add_argument("--intervalo", type=int, default=30, help="Segundos entre rondas cuando está encendido (por defecto 30).")
    parser.add_argument("--una-vez", action="store_true", help="Una sola pasada por las carpetas y termina.")
    parser.add_argument("--dry-run", action="store_true", help="Una pasada que extrae y muestra el JSON sin insertar (no conecta con Supabase).")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    signal.signal(signal.SIGTERM, parar)

    raiz: Path = args.carpeta.resolve()
    if not raiz.is_dir():
        sys.exit(f"No existe la carpeta: {raiz}")

    agente = Agente(raiz, args.dry_run)
    log.info("Agente listo · modelo %s · carpeta %s%s", agente.modelo, raiz, " · dry-run" if args.dry_run else "")
    try:
        if args.una_vez or args.dry_run:
            _, _, errores = agente.ronda()
            return 1 if errores else 0
        agente.vigilar(max(5, args.intervalo))
    except KeyboardInterrupt:
        log.info("Agente parado")
    return 0


if __name__ == "__main__":
    sys.exit(main())
