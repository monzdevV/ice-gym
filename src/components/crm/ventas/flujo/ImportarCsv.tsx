"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileArrowUp } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { importarOportunidadesVentas, type DatosOportunidad } from "@/app/crm/acciones/ventas";
import { nombreCompleto } from "@/lib/b2b";
import type { CatalogosVentas } from "@/lib/datos/ventas";
import { esFechaValida, leerImporte, normalizarTexto } from "@/lib/ventas";
import { numero } from "@/lib/formato";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { leerCsv } from "./utiles";

/** Campos a los que se puede llevar cada columna del archivo, con los nombres que suelen tener. */
const CAMPOS = {
  nombre: { texto: "Oportunidad", pistas: ["oportunidad", "nombre", "asunto", "titulo", "lead", "name"] },
  contacto_nombre: { texto: "Contacto", pistas: ["contacto", "persona", "contact"] },
  empresa_nombre: { texto: "Empresa", pistas: ["empresa", "compania", "company", "cliente", "razon social"] },
  email: { texto: "Correo electrónico", pistas: ["email", "correo", "e-mail", "mail"] },
  telefono: { texto: "Teléfono", pistas: ["telefono", "movil", "phone", "tel"] },
  ciudad: { texto: "Ciudad", pistas: ["ciudad", "localidad", "city", "poblacion"] },
  pais: { texto: "País", pistas: ["pais", "country"] },
  ingresos: { texto: "Ingresos esperados", pistas: ["ingresos", "importe", "valor", "revenue", "cantidad"] },
  probabilidad: { texto: "Probabilidad", pistas: ["probabilidad", "probability"] },
  cierre_previsto: { texto: "Cierre previsto", pistas: ["cierre", "fecha cierre", "deadline"] },
  etapa: { texto: "Etapa (por nombre)", pistas: ["etapa", "stage", "fase"] },
  comercial: { texto: "Comercial (email o nombre)", pistas: ["comercial", "vendedor", "responsable", "salesperson"] },
  campana: { texto: "Campaña", pistas: ["campana", "campaign"] },
  medio: { texto: "Medio", pistas: ["medio", "medium"] },
  origen: { texto: "Origen", pistas: ["origen", "fuente", "source"] },
  referido: { texto: "Referido por", pistas: ["referido", "referral"] },
  notas: { texto: "Notas", pistas: ["notas", "descripcion", "comentarios", "notes"] },
} as const;
type Campo = keyof typeof CAMPOS;
type Destino = Campo | "";

function adivinar(cabecera: string): Destino {
  const t = normalizarTexto(cabecera.trim());
  for (const [campo, { pistas }] of Object.entries(CAMPOS) as [Campo, (typeof CAMPOS)[Campo]][]) {
    if (pistas.some((p) => t === p || t.startsWith(p))) return campo;
  }
  return "";
}

/** DD/MM/AAAA, DD-MM-AAAA o AAAA-MM-DD → AAAA-MM-DD; una fecha que no existe (31/02, formato inglés) → null. */
function fechaIso(v: string) {
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return esFechaValida(t.slice(0, 10)) ? t.slice(0, 10) : null;
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return null;
  const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
  const iso = `${ano}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return esFechaValida(iso) ? iso : null;
}

/** Celdas que no se van a poder leer: se marcan en la vista previa y se importan vacías. */
function celdaInvalida(campo: Destino, v: string) {
  if (!v.trim()) return false;
  if (campo === "cierre_previsto") return fechaIso(v) == null;
  if (campo === "ingresos" || campo === "probabilidad") return leerImporte(v) == null;
  return false;
}

export function ImportarCsv({ abierto, onCerrar, catalogos }: { abierto: boolean; onCerrar: () => void; catalogos: CatalogosVentas }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [archivo, setArchivo] = useState("");
  const [tabla, setTabla] = useState<string[][]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);

  const [cabecera, ...filas] = tabla;
  const malas = filas.reduce((n, f) => n + destinos.filter((campo, j) => celdaInvalida(campo, f[j] ?? "")).length, 0);

  function cerrar() {
    setArchivo("");
    setTabla([]);
    setDestinos([]);
    onCerrar();
  }

  async function leer(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const t = leerCsv(await f.text());
    if (t.length < 2) {
      toast.error("El archivo no tiene filas debajo de la cabecera.");
      return;
    }
    setArchivo(f.name);
    setTabla(t);
    setDestinos(t[0].map(adivinar));
  }

  function convertir(fila: string[]): DatosOportunidad {
    const d: DatosOportunidad & Record<string, unknown> = { comercial_id: null };
    destinos.forEach((campo, i) => {
      const v = (fila[i] ?? "").trim();
      if (!campo || !v) return;
      if (campo === "etapa") {
        d.etapa_id = catalogos.etapas.find((e) => normalizarTexto(e.nombre) === normalizarTexto(v))?.id ?? null;
      } else if (campo === "comercial") {
        const t = normalizarTexto(v);
        d.comercial_id = catalogos.comerciales.find((c) => c.email.toLowerCase() === v.toLowerCase() || normalizarTexto(nombreCompleto(c)) === t || normalizarTexto(c.nombre) === t)?.id ?? null;
      } else if (campo === "cierre_previsto") d.cierre_previsto = fechaIso(v);
      else if (campo === "ingresos" || campo === "probabilidad") d[campo] = leerImporte(v);
      else d[campo] = v;
    });
    return d;
  }

  function importar() {
    if (!destinos.includes("nombre") && !destinos.includes("empresa_nombre") && !destinos.includes("contacto_nombre")) {
      toast.error("Lleva alguna columna a «Oportunidad», «Empresa» o «Contacto».");
      return;
    }
    empezar(async () => {
      const r = await importarOportunidadesVentas(filas.map(convertir));
      if (r.ok) {
        toast.success(r.mensaje);
        cerrar();
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && !pendiente && cerrar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar oportunidades</DialogTitle>
          <DialogDescription>
            Un archivo CSV (desde Excel: «Guardar como → CSV»), con una fila de cabecera. Cada fila será una oportunidad en la primera etapa, salvo que el archivo diga otra.
          </DialogDescription>
        </DialogHeader>

        {!cabecera ? (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-linea px-6 py-10 text-center transition-colors hover:border-acento hover:bg-acento-suave/40 focus-within:border-acento">
            <FileArrowUp className="size-8 text-tinta-2" aria-hidden />
            <span className="text-sm font-semibold text-tinta">Elige un archivo .csv</span>
            <span className="text-[0.8125rem] text-tinta-2">Separado por «;» o por «,»: se detecta solo.</span>
            <input type="file" accept=".csv,text/csv" onChange={leer} className="sr-only" />
          </label>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-tinta-2">
              <span className="font-medium text-tinta">{archivo}</span> · {numero(filas.length)} {filas.length === 1 ? "fila" : "filas"}. Revisa a qué campo va cada columna.
            </p>
            <div className="overflow-auto rounded-xl border border-linea">
              <table className="w-full border-collapse text-left text-[0.8125rem]">
                <thead>
                  <tr className="border-b border-linea bg-placa-2/50">
                    {cabecera.map((c, i) => (
                      <th key={i} scope="col" className="min-w-40 p-2 align-top font-normal">
                        <span className="mb-1.5 block truncate font-semibold text-tinta" title={c}>
                          {c || `Columna ${i + 1}`}
                        </span>
                        <select
                          value={destinos[i] ?? ""}
                          onChange={(e) => setDestinos((d) => d.map((x, j) => (j === i ? (e.target.value as Destino) : x)))}
                          aria-label={`Campo para la columna ${c || i + 1}`}
                          className={`${claseCampo} h-8 px-2`}
                        >
                          <option value="">No importar</option>
                          {(Object.keys(CAMPOS) as Campo[]).map((k) => (
                            <option key={k} value={k}>
                              {CAMPOS[k].texto}
                            </option>
                          ))}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(0, 5).map((f, i) => (
                    <tr key={i} className="border-b border-linea/70 last:border-0">
                      {cabecera.map((_, j) => {
                        const mala = celdaInvalida(destinos[j], f[j] ?? "");
                        return (
                          <td
                            key={j}
                            title={mala ? "No se entiende: se importará vacío" : undefined}
                            className={`max-w-56 truncate p-2 ${mala ? "bg-critico-suave font-semibold text-critico" : destinos[j] ? "text-tinta" : "text-tinta-2/60"}`}
                          >
                            {f[j] ?? ""}
                            {mala && <span className="sr-only"> (no se entiende, se importará vacío)</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filas.length > 5 && <p className="text-xs text-tinta-2">Vista previa de las 5 primeras filas.</p>}
            {malas > 0 && (
              <p className="text-xs font-semibold text-critico">
                {numero(malas)} {malas === 1 ? "celda con una fecha o un importe que no se entiende" : "celdas con fechas o importes que no se entienden"}: se importarán vacías.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {cabecera && (
            <button type="button" onClick={() => setTabla([])} disabled={pendiente} className="h-9 rounded-md border border-linea px-4 text-sm font-medium text-tinta hover:bg-placa-2 sm:mr-auto">
              Otro archivo
            </button>
          )}
          <button type="button" onClick={cerrar} disabled={pendiente} className="h-9 rounded-md border border-linea px-4 text-sm font-medium text-tinta hover:bg-placa-2">
            Cancelar
          </button>
          {cabecera && (
            <button type="button" onClick={importar} disabled={pendiente} className={claseBotonPrincipal}>
              {pendiente ? "Importando…" : `Importar ${numero(filas.length)}`}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
