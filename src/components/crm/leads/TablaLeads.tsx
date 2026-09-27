"use client";

import { useEscritorio } from "@/components/crm/MostrarMas";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarBlank, DotsThree, Tag as IconoTag, ArrowsLeftRight } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { etiquetarLeads, moverLead, moverLeads } from "@/app/crm/acciones/leads";
import { accionVencida, totales } from "@/lib/oportunidad";
import { codigoCentro } from "@/design/tokens";
import { dinero, numero } from "@/lib/formato";
import { ESTADOS_LEAD, ETIQUETA_ACTIVIDAD, ETIQUETA_LEAD, ETIQUETA_ORIGEN, TONO_ORIGEN, type EstadoLead } from "@/lib/tipos";
import { SinDatos } from "@/components/crm/Primitivas";
import { BarraProbabilidad, MarcaNivel, Sparkline, Tag, TagEtapa } from "./Piezas";
import type { FilaLead } from "./filtros";

const diaMes = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});
const fechaCorta = (iso: string) => diaMes.format(new Date(iso)).replace(".", "");

const casilla =
  "size-4 cursor-pointer appearance-none rounded border border-tinta-2/50 bg-transparent transition-colors checked:border-acento checked:bg-acento focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento/50 bg-no-repeat bg-center checked:bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3E%3Cpath d='M12.2 4.6 6.7 10.1 3.8 7.2l-1 1 3.9 3.9 6.5-6.5z'/%3E%3C/svg%3E\")]";

function Etiquetas({ lead, max = 2 }: { lead: FilaLead; max?: number }) {
  const extra = [
    { texto: ETIQUETA_ORIGEN[lead.origen], tono: TONO_ORIGEN[lead.origen] },
    ...lead.etiquetas.map((e) => ({ texto: e, tono: "var(--relleno-gris)" })),
  ];
  const visibles = extra.slice(0, max);
  const resto = extra.length - visibles.length;
  return (
    <span className="flex flex-wrap items-center gap-1">
      <TagEtapa estado={lead.estado} />
      {visibles.map((t) => (
        <Tag key={t.texto} tono={t.tono}>
          {t.texto}
        </Tag>
      ))}
      {resto > 0 && (
        <Tag tono="var(--relleno-gris)">
          <span
            title={extra
              .slice(max)
              .map((t) => t.texto)
              .join(", ")}
          >
            +{resto}
          </span>
        </Tag>
      )}
    </span>
  );
}

function UltimaInteraccion({ lead }: { lead: FilaLead }) {
  const u = lead.resumen.ultima;
  if (!u) return <span className="text-sm text-tinta-2">Sin contacto</span>;
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap text-sm">
      <CalendarBlank className="size-4 text-tinta-2" aria-hidden />
      <span className="tabular-nums text-tinta">{fechaCorta(u.fecha)}</span>
      <span className="text-tinta-2">· {ETIQUETA_ACTIVIDAD[u.tipo]}</span>
    </span>
  );
}

function ProximaAccion({ lead }: { lead: FilaLead }) {
  if (!lead.proxima_accion && !lead.proxima_accion_fecha) {
    return <span className="text-sm text-tinta-2">—</span>;
  }
  const vencida = accionVencida(lead);
  return (
    <span className="flex min-w-0 flex-col text-sm leading-tight">
      <span className="truncate text-tinta">{lead.proxima_accion ?? "Seguimiento"}</span>
      {lead.proxima_accion_fecha && (
        <span className={`tabular-nums ${vencida ? "font-medium text-critico" : "text-tinta-2"}`}>
          {vencida ? "Vencida · " : ""}
          {fechaCorta(lead.proxima_accion_fecha)}
        </span>
      )}
    </span>
  );
}

function MenuFila({ lead, onMover }: { lead: FilaLead; onMover: (e: EstadoLead) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${lead.nombre}`}
          className="grid size-8 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
        >
          <DotsThree className="size-5" weight="bold" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/crm/leads/${lead.id}`}>Abrir ficha</Link>
        </DropdownMenuItem>
        {lead.telefono && (
          <DropdownMenuItem asChild>
            <a href={`tel:${lead.telefono.replace(/\s/g, "")}`}>Llamar</a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a href={`mailto:${lead.email}`}>Enviar email</a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Mover a…</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {ESTADOS_LEAD.filter((e) => e !== lead.estado && e !== "convertido").map((e) => (
              <DropdownMenuItem key={e} onSelect={() => onMover(e)}>
                {ETIQUETA_LEAD[e]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccionesLote({ ids, limpiar }: { ids: string[]; limpiar: () => void }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [etiqueta, setEtiqueta] = useState("");

  function ejecutar(fn: () => Promise<{ ok: boolean | null; mensaje: string }>) {
    empezar(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.mensaje);
        limpiar();
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <div
      role="toolbar"
      aria-label="Acciones sobre la selección"
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-acento/40 bg-acento/10 px-3 py-1.5 text-sm ${pendiente ? "opacity-60" : ""}`}
    >
      <span className="font-medium text-tinta">{ids.length} seleccionados</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex h-7 items-center gap-1.5 rounded-md px-2 text-tinta hover:bg-placa-2">
            <ArrowsLeftRight className="size-4" aria-hidden /> Mover a…
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Etapa</DropdownMenuLabel>
          {ESTADOS_LEAD.filter((e) => e !== "convertido").map((e) => (
            <DropdownMenuItem key={e} onSelect={() => ejecutar(() => moverLeads(ids, e))}>
              {ETIQUETA_LEAD[e]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-7 items-center gap-1.5 rounded-md px-2 text-tinta hover:bg-placa-2">
            <IconoTag className="size-4" aria-hidden /> Etiquetar
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ejecutar(() => etiquetarLeads(ids, etiqueta));
              setEtiqueta("");
            }}
          >
            <input
              autoFocus
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              placeholder="p. ej. verano"
              aria-label="Etiqueta"
              className="h-8 flex-1 rounded-md border border-linea bg-placa px-2 text-sm text-tinta outline-none focus:border-acento"
            />
            <button type="submit" className="h-8 rounded-md bg-acento px-3 text-sm font-medium text-sobre-campo">
              Añadir
            </button>
          </form>
        </PopoverContent>
      </Popover>
      <button type="button" onClick={limpiar} className="ml-auto h-7 rounded-md px-2 text-tinta-2 hover:text-tinta">
        Cancelar
      </button>
    </div>
  );
}

export function TablaLeads({ filas }: { filas: FilaLead[] }) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [, empezar] = useTransition();
  const escritorio = useEscritorio();

  const visibles = useMemo(() => new Set(filas.map((f) => f.id)), [filas]);
  const elegidos = [...seleccion].filter((id) => visibles.has(id));
  const todos = filas.length > 0 && elegidos.length === filas.length;
  const suma = totales(filas);

  function alternar(id: string) {
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function mover(lead: FilaLead, destino: EstadoLead) {
    empezar(async () => {
      const r = await moverLead(lead.id, destino, lead.estado);
      if (r.ok) {
        toast.success(`${lead.nombre} pasa a ${ETIQUETA_LEAD[destino].toLowerCase()}`);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  if (filas.length === 0) {
    return (
      <SinDatos
        titulo="Ningún lead con estos filtros"
        texto="Prueba a quitar algún filtro o crea un lead nuevo con el botón de arriba."
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {elegidos.length > 0 && <AccionesLote ids={elegidos} limpiar={() => setSeleccion(new Set())} />}

      {/* Escritorio: tabla. Móvil: tarjetas. Solo se pinta una de las dos. */}
      {escritorio ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-linea bg-placa">
          <div className="relative min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-placa">
                <tr className="border-b border-linea text-[0.8125rem] text-tinta-2">
                  <th className="w-10 py-2.5 pl-4 font-normal">
                    <input
                      type="checkbox"
                      className={casilla}
                      checked={todos}
                      aria-label="Seleccionar todos"
                      ref={(el) => {
                        if (el) el.indeterminate = elegidos.length > 0 && !todos;
                      }}
                      onChange={() => setSeleccion(todos ? new Set() : new Set(filas.map((f) => f.id)))}
                    />
                  </th>
                  <th className="py-2.5 pr-4 font-normal">Lead</th>
                  <th className="py-2.5 pr-4 font-normal">Etapa y etiquetas</th>
                  <th className="py-2.5 pr-4 font-normal">Centro</th>
                  <th className="py-2.5 pr-4 text-right font-normal">Valor anual</th>
                  <th className="py-2.5 pr-4 font-normal">Probabilidad</th>
                  <th className="py-2.5 pr-4 font-normal">Actividad</th>
                  <th className="py-2.5 pr-4 font-normal">Última interacción</th>
                  <th className="py-2.5 pr-4 font-normal">Próxima acción</th>
                  <th className="py-2.5 pr-4 font-normal">Prioridad</th>
                  <th className="w-12 py-2.5 pr-3 font-normal">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((l) => {
                  const marcado = seleccion.has(l.id);
                  return (
                    <tr
                      key={l.id}
                      className={`group border-b border-linea/70 transition-colors last:border-0 hover:bg-placa-2/60 ${marcado ? "bg-acento/[0.07]" : ""}`}
                    >
                      <td className="py-2.5 pl-4">
                        <input
                          type="checkbox"
                          className={casilla}
                          checked={marcado}
                          onChange={() => alternar(l.id)}
                          aria-label={`Seleccionar ${l.nombre}`}
                        />
                      </td>
                      <td className="max-w-[220px] py-2.5 pr-4">
                        <Link href={`/crm/leads/${l.id}`} className="block min-w-0 outline-none focus-visible:underline">
                          <span className="block truncate font-medium text-tinta group-hover:text-acento-tinta">{l.nombre}</span>
                          <span className="block truncate text-[0.8125rem] text-tinta-2">{l.email}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">
                        <Etiquetas lead={l} />
                      </td>
                      <td className="py-2.5 pr-4 text-sm text-tinta-2" title={l.centro?.nombre}>
                        {l.centro ? codigoCentro(l.centro.nombre) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-sm font-medium tabular-nums text-tinta">
                        {l.valor > 0 ? dinero(l.valor) : <span className="text-tinta-2">—</span>}
                      </td>
                      <td className="py-2.5 pr-4">
                        <BarraProbabilidad valor={l.prob} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <Sparkline valores={l.resumen.semanas} etiqueta={`${l.resumen.total} interacciones en 8 semanas`} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <UltimaInteraccion lead={l} />
                      </td>
                      <td className="max-w-[180px] py-2.5 pr-4">
                        <ProximaAccion lead={l} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <MarcaNivel p={l.punt} />
                      </td>
                      <td className="py-2.5 pr-3">
                        <MenuFila lead={l} onMover={(e) => mover(l, e)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pie suma={suma} />
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {filas.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/crm/leads/${l.id}`}
                  className="block rounded-xl border border-linea bg-placa p-3.5 active:bg-placa-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-tinta">{l.nombre}</p>
                      <p className="truncate text-[0.8125rem] text-tinta-2">{l.email}</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-tinta">
                      {l.valor > 0 ? dinero(l.valor) : "—"}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <Etiquetas lead={l} max={1} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <BarraProbabilidad valor={l.prob} celdas={10} />
                    <UltimaInteraccion lead={l} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="overflow-hidden rounded-xl border border-linea bg-placa">
            <Pie suma={suma} />
          </div>
        </>
      )}
    </div>
  );
}

function Pie({ suma }: { suma: ReturnType<typeof totales> }) {
  const celdas = [
    { k: "En vista", v: numero(suma.n) },
    { k: "Suma del pipeline", v: dinero(suma.valor) },
    { k: "Valor ponderado", v: dinero(suma.ponderado) },
    { k: "Probabilidad media", v: `${Math.round(suma.probMedia)}%` },
  ];
  return (
    <dl className="grid grid-cols-2 border-t border-linea text-sm sm:grid-cols-4">
      {celdas.map((c, i) => (
        <div key={c.k} className={`flex items-baseline gap-2 px-4 py-2.5 ${i > 0 ? "sm:border-l sm:border-linea" : ""}`}>
          <dt className="order-2 text-tinta-2">{c.k}</dt>
          <dd className="order-1 font-semibold tabular-nums text-tinta">{c.v}</dd>
        </div>
      ))}
    </dl>
  );
}
