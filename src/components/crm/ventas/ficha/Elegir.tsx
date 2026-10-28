"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { Buildings, CaretUpDown, Check, MagnifyingGlass, Plus, User, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { guardarClienteVentas, guardarEtiquetaVentas } from "@/app/crm/acciones/ventas";
import { COLORES_EQUIPO } from "@/lib/b2b";
import { normalizarTexto, type ClienteMini, type EtiquetaVentas } from "@/lib/ventas";
import { EtiquetaChip, PuntoColor } from "@/components/crm/ventas/Piezas";
import { claseEnLinea } from "./Editables";

type Opcion = { valor: string; texto: string; detalle?: string; icono?: ReactNode; elegida?: boolean };

/**
 * Lista con buscador y, si lo escrito no existe, «Crear «texto»». Teclado:
 * flechas para moverse, intro para elegir.
 */
function ListaBuscable({
  opciones,
  onElegir,
  onCrear,
  creando,
  vacio,
}: {
  opciones: Opcion[];
  onElegir: (valor: string) => void;
  onCrear?: (texto: string) => void;
  creando?: boolean;
  vacio: string;
}) {
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(0);
  const idLista = useId();
  const t = normalizarTexto(q.trim());
  const filtradas = useMemo(() => (t ? opciones.filter((o) => normalizarTexto(`${o.texto} ${o.detalle ?? ""}`).includes(t)) : opciones), [opciones, t]);
  const exacta = opciones.some((o) => normalizarTexto(o.texto) === t);
  const puedeCrear = !!onCrear && q.trim().length >= 2 && !exacta;
  const total = filtradas.length + (puedeCrear ? 1 : 0);

  function elegir(n: number) {
    if (n < filtradas.length) onElegir(filtradas[n].valor);
    else if (puedeCrear) onCrear!(q.trim());
  }

  return (
    <>
      <label className="flex items-center gap-2 border-b border-linea px-3">
        <MagnifyingGlass className="size-4 shrink-0 text-tinta-2" aria-hidden />
        <span className="sr-only">Buscar</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActivo(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActivo((a) => Math.min(a + 1, total - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActivo((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              elegir(activo);
            }
          }}
          placeholder="Buscar…"
          aria-controls={idLista}
          aria-activedescendant={total ? `${idLista}-${activo}` : undefined}
          className="h-9 w-full bg-transparent text-sm text-tinta outline-none placeholder:text-tinta-2"
        />
      </label>
      <ul id={idLista} role="listbox" className="max-h-64 overflow-y-auto p-1">
        {total === 0 && <li className="px-2 py-3 text-sm text-tinta-2">{vacio}</li>}
        {filtradas.map((o, n) => (
          <li
            key={o.valor}
            id={`${idLista}-${n}`}
            role="option"
            aria-selected={!!o.elegida}
            data-activo={n === activo}
            onMouseEnter={() => setActivo(n)}
            onClick={() => elegir(n)}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[activo=true]:bg-placa-2"
          >
            {o.icono}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-tinta">{o.texto}</span>
              {o.detalle && <span className="truncate text-xs text-tinta-2">{o.detalle}</span>}
            </span>
            {o.elegida && <Check className="size-4 shrink-0 text-acento-tinta" weight="bold" aria-hidden />}
          </li>
        ))}
        {puedeCrear && (
          <li
            id={`${idLista}-${filtradas.length}`}
            role="option"
            aria-selected={false}
            aria-disabled={creando}
            data-activo={activo === filtradas.length}
            onMouseEnter={() => setActivo(filtradas.length)}
            onClick={() => !creando && elegir(filtradas.length)}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-acento-tinta data-[activo=true]:bg-placa-2"
          >
            <Plus className="size-4 shrink-0" weight="bold" aria-hidden />
            <span className="truncate">{creando ? "Creando…" : `Crear «${q.trim()}»`}</span>
          </li>
        )}
      </ul>
    </>
  );
}

/** Cliente de la oportunidad: buscar entre los clientes o crearlo con lo escrito. */
export function ElegirCliente({
  id,
  valor,
  clientes,
  onCambio,
}: {
  id?: string;
  valor: ClienteMini | null;
  clientes: ClienteMini[];
  onCambio: (clienteId: string | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [creando, empezar] = useTransition();
  const opciones = useMemo<Opcion[]>(
    () =>
      clientes.map((c) => ({
        valor: c.id,
        texto: c.nombre,
        detalle: [c.email, c.ciudad].filter(Boolean).join(" · ") || undefined,
        icono: c.es_empresa ? <Buildings className="size-4 shrink-0 text-tinta-2" aria-hidden /> : <User className="size-4 shrink-0 text-tinta-2" aria-hidden />,
        elegida: c.id === valor?.id,
      })),
    [clientes, valor?.id]
  );

  function crear(nombre: string) {
    empezar(async () => {
      const r = await guardarClienteVentas({ nombre });
      if (!r.ok || !r.id) return void toast.error(r.mensaje);
      toast.success(r.mensaje);
      onCambio(r.id);
      setAbierto(false);
    });
  }

  return (
    <Popover modal open={abierto} onOpenChange={setAbierto}>
      <div className="relative">
        <PopoverTrigger asChild>
          <button id={id} type="button" aria-haspopup="listbox" aria-expanded={abierto} className={`${claseEnLinea} flex items-center gap-2 text-left ${valor ? "pr-8" : ""}`}>
            <span className={`min-w-0 flex-1 truncate ${valor ? "text-tinta" : "text-tinta-2/80"}`}>{valor?.nombre ?? "Elige o crea un cliente"}</span>
            {!valor && <CaretUpDown className="size-3.5 shrink-0 text-tinta-2" aria-hidden />}
          </button>
        </PopoverTrigger>
        {valor && (
          <button
            type="button"
            onClick={() => onCambio(null)}
            aria-label="Quitar cliente"
            className="absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-tinta-2 hover:bg-placa-2 hover:text-tinta"
          >
            <X className="size-3" aria-hidden />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 gap-0 bg-placa p-0 text-tinta shadow-lg">
        <ListaBuscable
          opciones={opciones}
          onElegir={(v) => {
            onCambio(v);
            setAbierto(false);
          }}
          onCrear={crear}
          creando={creando}
          vacio="No hay clientes con ese nombre."
        />
      </PopoverContent>
    </Popover>
  );
}

/** Etiquetas: se marcan y desmarcan en la lista; lo escrito que no exista se crea. */
export function ElegirEtiquetas({
  id,
  elegidas,
  etiquetas,
  onCambio,
}: {
  id?: string;
  elegidas: EtiquetaVentas[];
  etiquetas: EtiquetaVentas[];
  onCambio: (ids: string[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [creando, empezar] = useTransition();

  // Selección local: varios clics seguidos se suman antes de que vuelva el servidor.
  const deServidor = elegidas.map((e) => e.id);
  const [base, setBase] = useState(deServidor.join());
  const [ids, setIds] = useState(deServidor);
  const [creadas, setCreadas] = useState<EtiquetaVentas[]>([]);
  if (deServidor.join() !== base) {
    setBase(deServidor.join());
    setIds(deServidor);
  }
  const actuales = useRef(ids);
  useEffect(() => {
    actuales.current = ids;
  }, [ids]);

  const todas = [...etiquetas, ...creadas.filter((c) => !etiquetas.some((e) => e.id === c.id))];
  const visibles = ids.map((id) => todas.find((e) => e.id === id) ?? elegidas.find((e) => e.id === id)).filter((e): e is EtiquetaVentas => !!e);
  const opciones = todas.map((e) => ({ valor: e.id, texto: e.nombre, icono: <PuntoColor color={e.color} />, elegida: ids.includes(e.id) }));

  function cambiar(siguiente: string[]) {
    actuales.current = siguiente;
    setIds(siguiente);
    onCambio(siguiente);
  }

  function alternar(v: string) {
    const ahora = actuales.current;
    cambiar(ahora.includes(v) ? ahora.filter((x) => x !== v) : [...ahora, v]);
  }

  function crear(nombre: string) {
    empezar(async () => {
      const color = COLORES_EQUIPO[todas.length % COLORES_EQUIPO.length];
      const r = await guardarEtiquetaVentas({ nombre, color });
      if (!r.ok || !r.id) return void toast.error(r.mensaje);
      const id = r.id;
      setCreadas((c) => [...c, { id, nombre, color }]);
      cambiar([...actuales.current, id]);
    });
  }

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1 px-2">
      {visibles.map((e) => (
        <span key={e.id} className="inline-flex items-center">
          <EtiquetaChip e={e} />
          <button
            type="button"
            onClick={() => alternar(e.id)}
            aria-label={`Quitar etiqueta ${e.nombre}`}
            className="-ml-0.5 grid size-5 place-items-center rounded text-tinta-2 hover:text-critico"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <Popover modal open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            aria-expanded={abierto}
            className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[0.8125rem] text-tinta-2 hover:bg-placa-2 hover:text-tinta"
          >
            <Plus className="size-3.5" weight="bold" aria-hidden />
            {visibles.length ? "Etiqueta" : "Añadir etiquetas"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 gap-0 bg-placa p-0 text-tinta shadow-lg">
          <ListaBuscable opciones={opciones} onElegir={alternar} onCrear={crear} creando={creando} vacio="Escribe para crear una etiqueta." />
        </PopoverContent>
      </Popover>
    </div>
  );
}
