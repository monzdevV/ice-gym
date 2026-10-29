"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crearOportunidadVentas, type DatosOportunidad } from "@/app/crm/acciones/ventas";
import { nombreCompleto, tonoColor } from "@/lib/b2b";
import type { CatalogosVentas } from "@/lib/datos/ventas";
import { esFechaValida, leerImporte, rutaVentas, type EmpresaVentas } from "@/lib/ventas";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { Selector } from "@/components/crm/actividad/Selector";
import { ElegirEmpresa } from "@/components/crm/ventas/ficha/Elegir";
import { EstrellasEditables } from "./Estrellas";

/** Lo que llega rellenado al abrir: desde una columna, un día del calendario o un enlace. */
export type Prefill = Omit<DatosOportunidad, "ingresos" | "probabilidad"> & { ingresos?: string; probabilidad?: string };

const claseEtiqueta = "text-[0.8125rem] font-medium text-tinta";
const claseSecundario = "h-9 rounded-md border border-linea px-4 text-sm font-medium text-tinta hover:bg-placa-2 disabled:opacity-50";

/** Con `error`, el texto sale debajo con el id `idError` (el campo lo enlaza con aria-describedby). */
function Campo({ etiqueta, children, className = "", error, idError }: { etiqueta: string; children: React.ReactNode; className?: string; error?: string | false; idError?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className={claseEtiqueta}>{etiqueta}</span>
      {children}
      {error && (
        <span id={idError} className="text-xs font-medium text-critico">
          {error}
        </span>
      )}
    </label>
  );
}

/** Alta completa de una oportunidad («Nuevo»). */
export function DialogoNueva({
  prefill,
  catalogos,
  onCerrar,
}: {
  /** null: cerrado. */
  prefill: Prefill | null;
  catalogos: CatalogosVentas;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const idError = useId();
  const [pendiente, empezar] = useTransition();
  const [d, setD] = useState<Prefill>({});
  const [malos, setMalos] = useState<string[]>([]);
  const [abiertoCon, setAbiertoCon] = useState<Prefill | null>(null);
  if (prefill !== abiertoCon) {
    setAbiertoCon(prefill);
    setMalos([]);
    if (prefill) {
      setD({
        comercial_id: catalogos.yo,
        etapa_id: catalogos.etapas.find((e) => !e.ganada)?.id ?? null,
        prioridad: 0,
        etiquetas: [],
        ...prefill,
      });
    }
  }

  const poner = <K extends keyof Prefill>(k: K, v: Prefill[K]) => setD((a) => ({ ...a, [k]: v }));

  // Recién creada desde el selector: aún no está en el catálogo hasta refrescar.
  const [empresaCreada, setEmpresaCreada] = useState<EmpresaVentas | null>(null);
  const empresa = catalogos.empresas.find((e) => e.id === d.empresa_id) ?? (empresaCreada?.id === d.empresa_id ? empresaCreada : null);

  function elegirCliente(id: string) {
    const c = catalogos.clientes.find((x) => x.id === id);
    setD((a) => ({
      ...a,
      cliente_id: id || null,
      // Sin empresa elegida, la del cliente.
      empresa_id: a.empresa_id || c?.empresa_id || null,
      email: a.email || c?.email || "",
      telefono: a.telefono || c?.telefono || "",
    }));
  }

  function elegirEmpresa(e: EmpresaVentas | null) {
    if (e && !catalogos.empresas.some((x) => x.id === e.id)) setEmpresaCreada(e);
    setD((a) => ({ ...a, empresa_id: e?.id ?? null }));
  }

  function elegirEtapa(id: string) {
    setD((a) => ({ ...a, etapa_id: id || null }));
  }

  function crear(abrir: boolean) {
    // Importes a la española («1.234,56»): lo que no se entienda no se manda.
    const ingresos = d.ingresos?.trim() ? leerImporte(d.ingresos) : null;
    const probabilidad = d.probabilidad?.trim() ? leerImporte(d.probabilidad) : null;
    const malos = [
      d.ingresos?.trim() && (ingresos == null || ingresos < 0) && "ingresos",
      d.probabilidad?.trim() && (probabilidad == null || probabilidad < 0 || probabilidad > 100) && "probabilidad",
      d.cierre_previsto && !esFechaValida(d.cierre_previsto) && "cierre_previsto",
    ].filter(Boolean) as string[];
    setMalos(malos);
    if (malos.length) return void toast.error("Revisa los campos marcados: importe, probabilidad (0 a 100) o fecha.");

    empezar(async () => {
      const r = await crearOportunidadVentas({ ...d, ingresos, probabilidad, comercial_id: d.comercial_id ?? null });
      if (!r.ok) return void toast.error(r.mensaje);
      toast.success(r.mensaje);
      onCerrar();
      if (abrir && r.id) router.push(rutaVentas.oportunidad(r.id));
      else router.refresh();
    });
  }

  const etiquetas = d.etiquetas ?? [];
  const etapa = catalogos.etapas.find((e) => e.id === d.etapa_id);

  return (
    <Dialog open={!!prefill} onOpenChange={(v) => !v && !pendiente && onCerrar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva oportunidad</DialogTitle>
          <DialogDescription>Lo mínimo es un nombre, un cliente o una empresa; el resto se puede completar después en la ficha.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            crear(false);
          }}
          className="flex flex-col gap-4"
        >
          <Campo etiqueta="Oportunidad">
            <input
              value={d.nombre ?? ""}
              onChange={(e) => poner("nombre", e.target.value)}
              maxLength={200}
              autoFocus
              placeholder="p. ej. Renovación del contrato de mantenimiento"
              className={`${claseCampo} h-10 text-base`}
            />
          </Campo>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${idError}-cliente`} className={claseEtiqueta}>
                Cliente
              </label>
              <Selector
                id={`${idError}-cliente`}
                name="cliente_id"
                valor={d.cliente_id ?? ""}
                onCambio={elegirCliente}
                placeholder="Elige un cliente"
                vacio="Ningún cliente coincide. Escribe el contacto abajo."
                opciones={catalogos.clientes.map((c) => ({ valor: c.id, texto: c.nombre, detalle: [c.email, c.ciudad].filter(Boolean).join(" · ") }))}
              />
            </div>
            <Campo etiqueta="Comercial">
              <select value={d.comercial_id ?? ""} onChange={(e) => poner("comercial_id", e.target.value || null)} className={claseCampo}>
                <option value="">Sin asignar</option>
                {catalogos.comerciales
                  .filter((c) => c.activo || c.id === d.comercial_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {nombreCompleto(c)}
                    </option>
                  ))}
              </select>
            </Campo>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${idError}-empresa`} className={claseEtiqueta}>
                Empresa
              </label>
              <ElegirEmpresa id={`${idError}-empresa`} valor={empresa} empresas={catalogos.empresas} onCambio={elegirEmpresa} sinElegir="Elige o crea una empresa" claseBoton={claseCampo} />
            </div>
            {!d.cliente_id && (
              <Campo etiqueta="Contacto">
                <input value={d.contacto_nombre ?? ""} onChange={(e) => poner("contacto_nombre", e.target.value)} maxLength={200} placeholder="Nombre de la persona" className={claseCampo} />
              </Campo>
            )}

            <Campo etiqueta="Correo electrónico">
              <input type="email" value={d.email ?? ""} onChange={(e) => poner("email", e.target.value)} maxLength={200} placeholder="p. ej. nombre@empresa.es" className={claseCampo} />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input type="tel" value={d.telefono ?? ""} onChange={(e) => poner("telefono", e.target.value)} maxLength={60} className={claseCampo} />
            </Campo>

            <Campo etiqueta="Ingresos esperados (€)" error={malos.includes("ingresos") && "Escribe una cantidad, por ejemplo 1.500 o 1.234,56."} idError={`${idError}-ingresos`}>
              <input
                inputMode="decimal"
                value={d.ingresos ?? ""}
                onChange={(e) => poner("ingresos", e.target.value)}
                placeholder="p. ej. 1.500"
                aria-invalid={malos.includes("ingresos") || undefined}
                aria-describedby={malos.includes("ingresos") ? `${idError}-ingresos` : undefined}
                className={`${claseCampo} tabular-nums`}
              />
            </Campo>
            <Campo etiqueta="Probabilidad (%)" error={malos.includes("probabilidad") && "Escribe un número del 0 al 100."} idError={`${idError}-probabilidad`}>
              <input
                inputMode="decimal"
                value={d.probabilidad ?? ""}
                onChange={(e) => poner("probabilidad", e.target.value)}
                aria-invalid={malos.includes("probabilidad") || undefined}
                aria-describedby={malos.includes("probabilidad") ? `${idError}-probabilidad` : undefined}
                placeholder={etapa ? `${etapa.probabilidad} (la de la etapa)` : "Según la etapa"}
                className={`${claseCampo} tabular-nums`}
              />
            </Campo>

            <Campo etiqueta="Etapa">
              <select value={d.etapa_id ?? ""} onChange={(e) => elegirEtapa(e.target.value)} className={claseCampo}>
                {catalogos.etapas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Equipo de ventas">
              <select value={d.equipo_id ?? ""} onChange={(e) => poner("equipo_id", e.target.value || null)} className={claseCampo}>
                <option value="">El del comercial</option>
                {catalogos.equipos
                  .filter((e) => e.activo || e.id === d.equipo_id)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
              </select>
            </Campo>

            <Campo etiqueta="Cierre previsto" error={malos.includes("cierre_previsto") && "Esa fecha no existe."} idError={`${idError}-cierre`}>
              <input
                type="date"
                value={d.cierre_previsto ?? ""}
                onChange={(e) => poner("cierre_previsto", e.target.value || null)}
                aria-invalid={malos.includes("cierre_previsto") || undefined}
                aria-describedby={malos.includes("cierre_previsto") ? `${idError}-cierre` : undefined}
                className={claseCampo}
              />
            </Campo>
            <div className="flex flex-col gap-1.5">
              <span className={claseEtiqueta} aria-hidden>
                Prioridad
              </span>
              <span className="flex h-9 items-center">
                <EstrellasEditables valor={d.prioridad ?? 0} onCambio={(n) => poner("prioridad", n)} tamano="size-5" />
              </span>
            </div>
          </div>

          {catalogos.etiquetas.length > 0 && (
            <fieldset>
              <legend className={`${claseEtiqueta} mb-1.5`}>Etiquetas</legend>
              <div className="flex flex-wrap gap-1.5">
                {catalogos.etiquetas.map((e) => {
                  const on = etiquetas.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => poner("etiquetas", on ? etiquetas.filter((x) => x !== e.id) : [...etiquetas, e.id])}
                      className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors ${
                        on ? "border-acento bg-acento/10 text-acento-tinta" : "border-linea text-tinta-2 hover:text-tinta"
                      }`}
                    >
                      <span className="size-2 rounded-full" style={{ background: tonoColor(e.color) }} aria-hidden />
                      {e.nombre}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <DialogFooter className="gap-2 sm:justify-start">
            <button type="submit" disabled={pendiente} className={claseBotonPrincipal}>
              {pendiente ? "Creando…" : "Crear"}
            </button>
            <button type="button" onClick={() => crear(true)} disabled={pendiente} className={claseSecundario}>
              Crear y abrir
            </button>
            <button type="button" onClick={onCerrar} disabled={pendiente} className={`${claseSecundario} sm:ml-auto`}>
              Descartar
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
