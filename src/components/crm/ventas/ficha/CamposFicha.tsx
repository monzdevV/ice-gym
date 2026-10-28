"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowCounterClockwise, ArrowSquareOut, EnvelopeSimple, Phone } from "@phosphor-icons/react";
import { nombreCompleto } from "@/lib/b2b";
import type { CatalogosVentas } from "@/lib/datos/ventas";
import { ingresoEsperado, rutaVentas, type OportunidadVentasCompleta } from "@/lib/ventas";
import { dinero } from "@/lib/formato";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { claseCampo } from "@/components/crm/Primitivas";
import { EstrellasEditables, Fila, NumeroEnLinea, SelectEnLinea, TextoEnLinea } from "./Editables";
import { ElegirCliente, ElegirEtiquetas } from "./Elegir";
import { useGuardar } from "./useGuardar";

const enlaceIcono = "grid size-7 shrink-0 place-items-center rounded-md text-acento-tinta hover:bg-placa-2";

/** Cuerpo de la ficha: título, importes, quién, propiedad, notas e información adicional. */
export function CamposFicha({ o, catalogos }: { o: OportunidadVentasCompleta; catalogos: CatalogosVentas }) {
  const { guardar, pendiente, estado } = useGuardar(o.id);
  const idCliente = useId();
  const idEtiquetas = useId();
  const etapa = catalogos.etapas.find((e) => e.id === o.etapa_id);
  const cerrada = o.estado !== "abierta";
  const comerciales = catalogos.comerciales
    .filter((c) => c.activo || c.id === o.comercial_id)
    .map((c) => ({ valor: c.id, texto: nombreCompleto(c) }));

  return (
    <div className={`flex flex-col gap-6 ${pendiente ? "cursor-progress" : ""}`}>
      {/* Cada campo se guarda al salir de él: el lector de pantalla oye que se ha guardado. */}
      <p role="status" className="sr-only">
        {pendiente ? "Guardando…" : estado === "guardado" ? "Cambios guardados." : ""}
      </p>
      <TextoEnLinea
        etiqueta="Nombre de la oportunidad"
        valor={o.nombre}
        onGuardar={(v) => guardar({ nombre: v })}
        sinFila
        className="rotulo h-auto -mx-2 py-1 text-[1.75rem] leading-tight"
        placeholder="p. ej. Equipamiento de la nueva sala"
      />

      {/* Importes: lo que se espera ingresar y con qué probabilidad. */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-tinta-2">Ingresos esperados</span>
          <NumeroEnLinea etiqueta="Ingresos esperados" valor={o.ingresos} unidad="€" onGuardar={(v) => guardar({ ingresos: v })} className="w-40 text-xl" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-tinta-2">Probabilidad</span>
          <span className="flex items-center gap-1">
            <NumeroEnLinea
              etiqueta="Probabilidad"
              valor={o.probabilidad}
              unidad="%"
              onGuardar={(v) => guardar({ probabilidad: v })}
              className="w-20 text-xl"
            />
            {o.probabilidad_manual && !cerrada && (
              <button
                type="button"
                onClick={() => guardar({ probabilidad: null }, "Probabilidad de la etapa recuperada.")}
                className="grid size-7 place-items-center rounded-md text-tinta-2 hover:bg-placa-2 hover:text-tinta"
                title={`Volver a la de la etapa${etapa ? ` (${etapa.probabilidad} %)` : ""}`}
                aria-label="Volver a la probabilidad de la etapa"
              >
                <ArrowCounterClockwise className="size-4" aria-hidden />
              </button>
            )}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 pb-1">
          <span className="text-xs font-medium text-tinta-2">Ponderado</span>
          <span className="cifra text-xl text-tinta-2">{dinero(ingresoEsperado(o))}</span>
        </div>
      </div>

      <div className="grid gap-x-10 gap-y-1 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Fila etiqueta="Cliente" htmlFor={idCliente}>
            <span className="flex items-center gap-1">
              <span className="min-w-0 flex-1">
                <ElegirCliente id={idCliente} valor={o.cliente} clientes={catalogos.clientes} onCambio={(v) => guardar({ cliente_id: v })} />
              </span>
              {o.cliente && (
                <Link href={rutaVentas.cliente(o.cliente.id)} className={enlaceIcono} title="Abrir el cliente" aria-label={`Abrir el cliente ${o.cliente.nombre}`}>
                  <ArrowSquareOut className="size-4" aria-hidden />
                </Link>
              )}
            </span>
          </Fila>
          <TextoEnLinea etiqueta="Contacto" valor={o.contacto_nombre} onGuardar={(v) => guardar({ contacto_nombre: v })} placeholder="Nombre de la persona" />
          <TextoEnLinea etiqueta="Empresa" valor={o.empresa_nombre} onGuardar={(v) => guardar({ empresa_nombre: v })} placeholder="Si aún no es cliente" />
          <ConEnlace href={o.email ? `mailto:${o.email}` : null} icono="email">
            <TextoEnLinea etiqueta="Correo electrónico" valor={o.email} tipo="email" onGuardar={(v) => guardar({ email: v })} placeholder="nombre@empresa.es" />
          </ConEnlace>
          <ConEnlace href={o.telefono ? `tel:${o.telefono.replace(/\s/g, "")}` : null} icono="telefono">
            <TextoEnLinea etiqueta="Teléfono" valor={o.telefono} tipo="tel" max={60} onGuardar={(v) => guardar({ telefono: v })} placeholder="+34 600 000 000" />
          </ConEnlace>
        </div>

        <div className="flex flex-col gap-1">
          <SelectEnLinea etiqueta="Comercial" valor={o.comercial_id} opciones={comerciales} onGuardar={(v) => guardar({ comercial_id: v })} />
          <Fila etiqueta="Cierre previsto" ayuda="Fecha en la que se espera cerrar la venta">
            <span className="flex items-center gap-2">
              <span className="min-w-0 flex-1">
                <TextoEnLinea etiqueta="Cierre previsto" valor={o.cierre_previsto} tipo="date" sinFila onGuardar={(v) => guardar({ cierre_previsto: v || null })} />
              </span>
              <EstrellasEditables n={o.prioridad} onCambio={(n) => guardar({ prioridad: n })} disabled={pendiente} />
            </span>
          </Fila>
          <Fila etiqueta="Etiquetas" htmlFor={idEtiquetas}>
            <ElegirEtiquetas id={idEtiquetas} elegidas={o.etiquetas} etiquetas={catalogos.etiquetas} onCambio={(ids) => guardar({ etiquetas: ids })} />
          </Fila>
        </div>
      </div>

      <Tabs defaultValue="notas" className="gap-3">
        <TabsList variant="line" className="border-b border-linea">
          <TabsTrigger value="notas" className="px-3">
            Notas
          </TabsTrigger>
          <TabsTrigger value="adicional" className="px-3">
            Información adicional
          </TabsTrigger>
        </TabsList>
        <TabsContent value="notas">
          <Notas valor={o.notas} onGuardar={(v) => guardar({ notas: v }, "Notas guardadas.")} />
        </TabsContent>
        <TabsContent value="adicional">
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            <Bloque titulo="Marketing">
              <TextoEnLinea etiqueta="Campaña" valor={o.campana} max={120} onGuardar={(v) => guardar({ campana: v })} placeholder="p. ej. Vuelta al cole" />
              <TextoEnLinea etiqueta="Medio" valor={o.medio} max={120} onGuardar={(v) => guardar({ medio: v })} placeholder="p. ej. Correo, redes" />
              <TextoEnLinea etiqueta="Origen" valor={o.origen} max={120} onGuardar={(v) => guardar({ origen: v })} placeholder="p. ej. Web, feria" />
              <TextoEnLinea etiqueta="Referido por" valor={o.referido} onGuardar={(v) => guardar({ referido: v })} />
            </Bloque>
            <div className="flex flex-col gap-6">
              <Bloque titulo="Propiedad">
                <SelectEnLinea
                  etiqueta="Equipo de ventas"
                  valor={o.equipo_id}
                  opciones={catalogos.equipos.filter((e) => e.activo || e.id === o.equipo_id).map((e) => ({ valor: e.id, texto: e.nombre }))}
                  onGuardar={(v) => guardar({ equipo_id: v })}
                  vacio="Sin equipo"
                />
              </Bloque>
              <Bloque titulo="Dirección">
                <TextoEnLinea etiqueta="Ciudad" valor={o.ciudad} max={120} onGuardar={(v) => guardar({ ciudad: v })} />
                <TextoEnLinea etiqueta="País" valor={o.pais} max={120} onGuardar={(v) => guardar({ pais: v })} />
              </Bloque>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-tinta-2">{titulo}</h3>
      {children}
    </section>
  );
}

/** Campo con un atajo a la derecha (escribir el correo, llamar). */
function ConEnlace({ href, icono, children }: { href: string | null; icono: "email" | "telefono"; children: React.ReactNode }) {
  const Icono = icono === "email" ? EnvelopeSimple : Phone;
  return (
    <div className="flex items-center gap-1">
      <div className="min-w-0 flex-1">{children}</div>
      {href ? (
        <a href={href} className={enlaceIcono} aria-label={icono === "email" ? "Escribir un correo" : "Llamar"} title={icono === "email" ? "Escribir un correo" : "Llamar"}>
          <Icono className="size-4" aria-hidden />
        </a>
      ) : (
        <span className="size-7 shrink-0" aria-hidden />
      )}
    </div>
  );
}

function Notas({ valor, onGuardar }: { valor: string | null; onGuardar: (v: string) => void }) {
  const original = valor ?? "";
  const [v, setV] = useState(original);
  const [base, setBase] = useState(original);
  if (original !== base) {
    setBase(original);
    setV(original);
  }
  return (
    <textarea
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() !== original.trim() && onGuardar(v)}
      rows={6}
      maxLength={10_000}
      aria-label="Notas"
      placeholder="Añade una descripción: qué necesita, con quién se habla, qué se ha ofrecido…"
      className={`${claseCampo} h-auto min-h-36 resize-y py-2 leading-relaxed`}
    />
  );
}
