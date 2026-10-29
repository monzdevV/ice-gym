"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Archive, CaretDown, CaretRight, CaretUpDown, Trash, UserSwitch, XCircle, ArrowsLeftRight } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { accionLoteVentas } from "@/app/crm/acciones/ventas";
import { nombreCompleto } from "@/lib/b2b";
import { dinero, numero, porcentaje } from "@/lib/formato";
import {
  COLUMNAS_ORDEN_VENTAS,
  ingresoEsperado,
  plazoMasUrgente,
  quienVenta,
  rutaVentas,
  textoPlazo,
  TINTA_PLAZO,
  type EtapaVentas,
  type FiltrosVentas,
  type OportunidadVentasCompleta,
  type OrdenVentas,
} from "@/lib/ventas";
import { Responsable, Senal } from "@/components/crm/b2b/Piezas";
import { Etiquetas } from "@/components/crm/ventas/Piezas";
import { DialogoPerdida } from "@/components/crm/ventas/DialogoPerdida";
import { useFlujo } from "./Contexto";
import { agrupar, type Grupo } from "./utiles";

const cmpTexto = (a?: string | null, b?: string | null) => (a ?? "￿").localeCompare(b ?? "￿", "es");
const cmpFecha = (a?: string | null, b?: string | null) => (a ?? "9999").localeCompare(b ?? "9999");

function comparador(orden: OrdenVentas, etapas: EtapaVentas[]) {
  const c: Record<OrdenVentas, (a: OportunidadVentasCompleta, b: OportunidadVentasCompleta) => number> = {
    nombre: (a, b) => cmpTexto(a.nombre, b.nombre),
    cliente: (a, b) => cmpTexto(quienVenta(a), quienVenta(b)),
    email: (a, b) => cmpTexto(a.email, b.email),
    comercial: (a, b) => cmpTexto(a.comercial?.nombre, b.comercial?.nombre),
    ingresos: (a, b) => a.ingresos - b.ingresos,
    probabilidad: (a, b) => a.probabilidad - b.probabilidad,
    etapa: (a, b) => etapas.findIndex((e) => e.id === a.etapa_id) - etapas.findIndex((e) => e.id === b.etapa_id),
    cierre: (a, b) => cmpFecha(a.cierre_previsto, b.cierre_previsto),
    actividad: (a, b) => cmpFecha(a.actividades[0]?.vence, b.actividades[0]?.vence),
    creada: (a, b) => a.created_at.localeCompare(b.created_at),
  };
  return c[orden];
}

const DERECHA: OrdenVentas[] = ["ingresos", "probabilidad"];
const COLUMNAS = Object.keys(COLUMNAS_ORDEN_VENTAS) as OrdenVentas[];

function Cabecera({ col, f, cambiar }: { col: OrdenVentas; f: FiltrosVentas; cambiar: (c: Partial<FiltrosVentas>) => void }) {
  const activa = f.orden === col;
  const Icono = !activa ? CaretUpDown : f.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={activa ? (f.dir === "asc" ? "ascending" : "descending") : "none"} className={`py-2 pr-4 font-normal ${DERECHA.includes(col) ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => cambiar({ orden: col, dir: activa ? (f.dir === "asc" ? "desc" : "asc") : ["nombre", "cliente", "email", "comercial"].includes(col) ? "asc" : "desc" })}
        className={`inline-flex items-center gap-1 rounded transition-colors hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento ${activa ? "font-medium text-tinta" : ""}`}
      >
        {COLUMNAS_ORDEN_VENTAS[col]}
        <Icono className={`size-3.5 ${activa ? "" : "opacity-50"}`} aria-hidden />
      </button>
    </th>
  );
}

const claseCasilla = "size-4 cursor-pointer rounded border-linea accent-[var(--acento)]";

function Fila({
  o,
  etapas,
  marcada,
  alMarcar,
}: {
  o: OportunidadVentasCompleta;
  etapas: EtapaVentas[];
  marcada: boolean;
  alMarcar: (v: boolean) => void;
}) {
  const router = useRouter();
  const plazo = plazoMasUrgente(o.actividades);
  const proxima = o.actividades[0];
  return (
    <tr
      onClick={() => router.push(rutaVentas.oportunidad(o.id))}
      className={`group cursor-pointer border-b border-linea/70 transition-colors hover:bg-placa-2/60 ${marcada ? "bg-acento-suave/60" : ""}`}
    >
      <td className="w-10 py-2 pl-4" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={marcada} onChange={(e) => alMarcar(e.target.checked)} aria-label={`Seleccionar ${o.nombre}`} className={claseCasilla} />
      </td>
      <td className="max-w-[260px] py-2 pr-4">
        <Link href={rutaVentas.oportunidad(o.id)} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-tinta outline-none group-hover:text-acento-tinta focus-visible:underline">
          {o.nombre}
        </Link>
        {o.etiquetas.length > 0 && (
          <span className="mt-0.5 block">
            <Etiquetas lista={o.etiquetas} max={2} />
          </span>
        )}
      </td>
      <td className="max-w-[200px] truncate py-2 pr-4 text-tinta">{quienVenta(o) ?? <span className="text-tinta-2">—</span>}</td>
      <td className="max-w-[200px] truncate py-2 pr-4 text-tinta-2">{o.email ?? "—"}</td>
      <td className="max-w-[160px] py-2 pr-4">
        <Responsable m={o.comercial} />
      </td>
      <td className="py-2 pr-4 text-right font-medium tabular-nums text-tinta">{dinero(o.ingresos)}</td>
      <td className="py-2 pr-4 text-right tabular-nums text-tinta-2">{porcentaje(o.probabilidad)}</td>
      <td className="whitespace-nowrap py-2 pr-4">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-tinta">{etapas.find((e) => e.id === o.etapa_id)?.nombre ?? "—"}</span>
          {o.estado === "ganada" && <Senal tipo="exito">Ganada</Senal>}
          {o.estado === "perdida" && <Senal tipo="critico">Perdida</Senal>}
        </span>
      </td>
      <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-tinta-2">{o.cierre_previsto ? textoFecha(o.cierre_previsto) : "—"}</td>
      <td className="max-w-[220px] py-2 pr-4">
        {proxima && plazo ? (
          <span className="flex min-w-0 items-baseline gap-1.5 text-[0.8125rem]">
            <span className="shrink-0 font-semibold" style={{ color: TINTA_PLAZO[plazo] }}>
              {textoPlazo(proxima.vence)}
            </span>
            <span className="truncate text-tinta-2">{proxima.resumen ?? ""}</span>
          </span>
        ) : (
          <span className="text-tinta-2">—</span>
        )}
      </td>
      <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-tinta-2">{textoFecha(o.created_at)}</td>
    </tr>
  );
}

const fechaCorta = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "2-digit", timeZone: "Europe/Madrid" });
const textoFecha = (iso: string) => fechaCorta.format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)).replace(".", "");

function suma(filas: OportunidadVentasCompleta[]) {
  return { n: filas.length, ingresos: filas.reduce((s, o) => s + o.ingresos, 0), esperado: filas.reduce((s, o) => s + ingresoEsperado(o), 0) };
}

export function ListaVentas({
  filas,
  filtros: f,
  cambiar,
}: {
  filas: OportunidadVentasCompleta[];
  filtros: FiltrosVentas;
  cambiar: (c: Partial<FiltrosVentas>) => void;
}) {
  const router = useRouter();
  const { catalogos } = useFlujo();
  const { etapas } = catalogos;
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [plegados, setPlegados] = useState<Set<string>>(new Set());
  const [perdida, setPerdida] = useState<string[]>([]);
  const [borrar, setBorrar] = useState(false);
  const [pendiente, empezar] = useTransition();

  const ordenadas = useMemo(() => {
    const cmp = comparador(f.orden, etapas);
    const signo = f.dir === "asc" ? 1 : -1;
    return [...filas].sort((a, b) => signo * cmp(a, b) || b.created_at.localeCompare(a.created_at));
  }, [filas, f.orden, f.dir, etapas]);

  // Si una oportunidad deja de estar en la vista, deja de estar seleccionada.
  const visibles = new Set(filas.map((o) => o.id));
  const seleccion = [...marcadas].filter((id) => visibles.has(id));
  const todas = ordenadas.length > 0 && seleccion.length === ordenadas.length;

  const marcar = (ids: string[], v: boolean) =>
    setMarcadas((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (v) n.add(id);
        else n.delete(id);
      }
      return n;
    });

  const alternarGrupo = (clave: string) =>
    setPlegados((s) => {
      const n = new Set(s);
      if (n.has(clave)) n.delete(clave);
      else n.add(clave);
      return n;
    });

  function lote(accion: Parameters<typeof accionLoteVentas>[1]) {
    empezar(async () => {
      const r = await accionLoteVentas(seleccion, accion);
      if (r.ok) {
        toast.success(r.mensaje);
        setMarcadas(new Set());
        setBorrar(false);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  const columnas = COLUMNAS.length + 1;
  const total = suma(filas);

  function filasDe(lista: OportunidadVentasCompleta[]) {
    return lista.map((o) => <Fila key={o.id} o={o} etapas={etapas} marcada={marcadas.has(o.id)} alMarcar={(v) => marcar([o.id], v)} />);
  }

  function cabeceraGrupo(g: Grupo, clave: string, nivel: number) {
    const abierto = !plegados.has(clave);
    const s = suma(g.filas);
    const Icono = abierto ? CaretDown : CaretRight;
    return (
      <tr className={`border-b border-linea ${nivel === 0 ? "bg-placa-2/70" : "bg-placa-2/35"}`}>
        <td colSpan={5} className="py-1.5 pl-4 pr-4" style={{ paddingLeft: `${1 + nivel * 1.5}rem` }}>
          <button type="button" onClick={() => alternarGrupo(clave)} aria-expanded={abierto} className="inline-flex items-center gap-1.5 text-sm font-semibold text-tinta">
            <Icono className="size-3.5 text-tinta-2" weight="bold" aria-hidden />
            {g.texto}
            <span className="font-normal tabular-nums text-tinta-2">({numero(s.n)})</span>
          </button>
        </td>
        <td className="py-1.5 pr-4 text-right font-semibold tabular-nums text-tinta">{dinero(s.ingresos)}</td>
        <td colSpan={columnas - 6} />
      </tr>
    );
  }

  function cuerpo() {
    if (!f.agrupar.length) return filasDe(ordenadas);
    const [uno, dos] = f.agrupar;
    return agrupar(ordenadas, uno, etapas)
      .filter((g) => g.filas.length)
      .map((g) => {
        const clave = `${uno}:${g.clave}`;
        return (
          <Fragment key={clave}>
            {cabeceraGrupo(g, clave, 0)}
            {!plegados.has(clave) &&
              (dos
                ? agrupar(g.filas, dos, etapas)
                    .filter((h) => h.filas.length)
                    .map((h) => {
                      const clave2 = `${clave}/${dos}:${h.clave}`;
                      return (
                        <Fragment key={clave2}>
                          {cabeceraGrupo(h, clave2, 1)}
                          {!plegados.has(clave2) && filasDe(h.filas)}
                        </Fragment>
                      );
                    })
                : filasDe(g.filas))}
          </Fragment>
        );
      });
  }

  const claseLote = "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium text-tinta hover:bg-placa-2 disabled:opacity-50";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {seleccion.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-acento-suave px-2 py-1" role="toolbar" aria-label="Acciones con la selección">
          <span className="px-2 text-sm font-semibold text-tinta">
            {numero(seleccion.length)} {seleccion.length === 1 ? "seleccionada" : "seleccionadas"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" disabled={pendiente} className={claseLote}>
                <UserSwitch className="size-4" aria-hidden />
                Asignar comercial
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              <DropdownMenuItem onSelect={() => lote({ tipo: "comercial", valor: null })}>Sin asignar</DropdownMenuItem>
              {catalogos.comerciales
                .filter((c) => c.activo)
                .map((c) => (
                  <DropdownMenuItem key={c.id} onSelect={() => lote({ tipo: "comercial", valor: c.id })}>
                    {nombreCompleto(c)}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" disabled={pendiente} className={claseLote}>
                <ArrowsLeftRight className="size-4" aria-hidden />
                Mover a etapa
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {etapas.map((e) => (
                <DropdownMenuItem key={e.id} onSelect={() => lote({ tipo: "etapa", valor: e.id })}>
                  {e.nombre}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" disabled={pendiente} onClick={() => setPerdida(seleccion)} className={claseLote}>
            <XCircle className="size-4" aria-hidden />
            Marcar como perdido
          </button>
          <button type="button" disabled={pendiente} onClick={() => lote({ tipo: "archivar" })} className={claseLote}>
            <Archive className="size-4" aria-hidden />
            Archivar
          </button>
          <button type="button" disabled={pendiente} onClick={() => setBorrar(true)} className={`${claseLote} text-critico hover:bg-critico-suave`}>
            <Trash className="size-4" aria-hidden />
            Borrar
          </button>
          <button type="button" onClick={() => setMarcadas(new Set())} className={`${claseLote} ml-auto text-tinta-2`}>
            Quitar selección
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-linea bg-placa">
        <div className="relative min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
            <caption className="sr-only">Oportunidades, ordenadas por {COLUMNAS_ORDEN_VENTAS[f.orden].toLowerCase()}</caption>
            <thead className="sticky top-0 z-10 bg-placa">
              <tr className="border-b border-linea text-[0.8125rem] text-tinta-2">
                <th scope="col" className="w-10 py-2 pl-4">
                  <input
                    type="checkbox"
                    checked={todas}
                    ref={(el) => {
                      if (el) el.indeterminate = seleccion.length > 0 && !todas;
                    }}
                    onChange={(e) => marcar(ordenadas.map((o) => o.id), e.target.checked)}
                    aria-label="Seleccionar todas"
                    className={claseCasilla}
                  />
                </th>
                {COLUMNAS.map((c) => (
                  <Cabecera key={c} col={c} f={f} cambiar={cambiar} />
                ))}
              </tr>
            </thead>
            <tbody>{cuerpo()}</tbody>
            <tfoot className="sticky bottom-0 bg-placa">
              <tr className="border-t border-linea text-sm">
                <td colSpan={5} className="py-2.5 pl-4 pr-4 text-tinta-2">
                  {numero(total.n)} {total.n === 1 ? "oportunidad" : "oportunidades"} · ponderado {dinero(total.esperado)}
                </td>
                <td className="py-2.5 pr-4 text-right font-semibold tabular-nums text-tinta">{dinero(total.ingresos)}</td>
                <td colSpan={columnas - 6} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <DialogoPerdida
        ids={perdida}
        titulo={perdida.length > 1 ? `${perdida.length} oportunidades` : filas.find((o) => o.id === perdida[0])?.nombre}
        motivos={catalogos.motivos}
        onCerrar={(ok) => {
          setPerdida([]);
          if (ok) setMarcadas(new Set());
        }}
      />

      <Dialog open={borrar} onOpenChange={(v) => !pendiente && setBorrar(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Borrar {seleccion.length === 1 ? "la oportunidad" : `${seleccion.length} oportunidades`}?</DialogTitle>
            <DialogDescription>Se borran con su historial y sus actividades. No se puede deshacer; si sólo quieres quitarlas de en medio, archívalas.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setBorrar(false)} disabled={pendiente} className="h-9 rounded-md border border-linea px-4 text-sm font-medium text-tinta hover:bg-placa-2">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => lote({ tipo: "borrar" })}
              disabled={pendiente}
              className="inline-flex h-9 items-center rounded-lg bg-critico px-4 text-sm font-semibold text-sobre-critico hover:bg-critico/90 disabled:opacity-50"
            >
              {pendiente ? "Borrando…" : "Borrar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
