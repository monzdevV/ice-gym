"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DotsThreeVertical, EnvelopeSimple, MagnifyingGlass, Plus, WarningCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  archivarEquipoVentas,
  borrarEquipoVentas,
  colorEquipoVentas,
  guardarEquipoVentas,
} from "@/app/crm/acciones/ventas";
import { COLORES_EQUIPO, nombreCompleto, tonoColor, type ColorEquipo, type Miembro } from "@/lib/b2b";
import type { ResumenEquipo } from "@/lib/datos/ventas";
import { dinero, numero } from "@/lib/formato";
import { leerImporte, normalizarTexto, rutaVentas, type EquipoVentas } from "@/lib/ventas";
import { SinDatos, claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { Avatar, Responsable } from "@/components/crm/b2b/Piezas";
import {
  BorrarConConfirmacion,
  Campo,
  DialogoFormulario,
  NOMBRE_COLOR,
  SelectorColor,
  claseIcono,
  claseSecundario,
  useAccion,
} from "@/components/crm/ventas/configuracion/Comun";

const RESUMEN_VACIO: ResumenEquipo = { abiertas: 0, ingresos: 0, ganadoMes: 0, actividadesVencidas: 0 };
const flujoDe = (id: string, extra = "") => `${rutaVentas.flujo}?equipo=${id}${extra}`;

/* -------------------------------- Formulario ------------------------------- */

function FormularioEquipo({ equipo, comerciales, onCerrar }: { equipo: EquipoVentas | null; comerciales: Miembro[]; onCerrar: () => void }) {
  const { ejecutar, pendiente } = useAccion();
  const [color, setColor] = useState<ColorEquipo | string>(equipo?.color ?? "azul");
  const [miembros, setMiembros] = useState<string[]>(equipo?.miembros ?? []);
  const [objetivoMalo, setObjetivoMalo] = useState(false);
  const disponibles = comerciales.filter((c) => c.activo || miembros.includes(c.id));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        // Objetivo a la española («12.000»): si no se entiende, no se guarda.
        const textoObjetivo = String(fd.get("objetivo") ?? "").trim();
        const objetivo = textoObjetivo ? leerImporte(textoObjetivo) : null;
        if (textoObjetivo && (objetivo == null || objetivo < 0)) {
          setObjetivoMalo(true);
          return void toast.error("Objetivo mensual: escribe una cantidad, p. ej. 12.000");
        }
        setObjetivoMalo(false);
        ejecutar(
          () =>
            guardarEquipoVentas({
              id: equipo?.id,
              nombre: String(fd.get("nombre") ?? ""),
              email: String(fd.get("email") ?? ""),
              color,
              lider_id: String(fd.get("lider_id") ?? "") || null,
              objetivo,
              miembros,
            }),
          onCerrar
        );
      }}
      className="flex flex-col gap-4"
    >
      <Campo etiqueta="Nombre del equipo">
        <input name="nombre" required minLength={2} maxLength={120} defaultValue={equipo?.nombre ?? ""} autoFocus placeholder="p. ej. Ventas empresas" className={claseCampo} />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Alias de correo">
          <input name="email" type="email" maxLength={200} defaultValue={equipo?.email ?? ""} placeholder="ventas@icegym.es" className={claseCampo} />
        </Campo>
        <Campo etiqueta="Objetivo mensual (€)">
          <input
            name="objetivo"
            inputMode="decimal"
            defaultValue={equipo?.objetivo == null ? "" : String(equipo.objetivo).replace(".", ",")}
            placeholder="Facturación a ganar cada mes"
            aria-invalid={objetivoMalo || undefined}
            onChange={() => setObjetivoMalo(false)}
            className={`${claseCampo} tabular-nums`}
          />
        </Campo>
      </div>
      <Campo etiqueta="Líder del equipo">
        <select name="lider_id" defaultValue={equipo?.lider_id ?? ""} className={claseCampo}>
          <option value="">Sin líder</option>
          {disponibles.map((c) => (
            <option key={c.id} value={c.id}>
              {nombreCompleto(c)}
            </option>
          ))}
        </select>
      </Campo>
      <SelectorColor valor={color} onCambio={setColor} />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[0.8125rem] font-medium text-tinta">
          Miembros <span className="font-normal text-tinta-2">· {miembros.length}</span>
        </legend>
        {disponibles.length === 0 ? (
          <p className="text-[0.8125rem] text-tinta-2">Añade personas al equipo comercial en Configuración.</p>
        ) : (
          <ul className="grid max-h-56 gap-1 overflow-y-auto rounded-lg bg-placa-2 p-2 sm:grid-cols-2">
            {disponibles.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-placa">
                  <input
                    type="checkbox"
                    checked={miembros.includes(c.id)}
                    onChange={(e) => setMiembros((m) => (e.target.checked ? [...m, c.id] : m.filter((x) => x !== c.id)))}
                    className="size-4 accent-[var(--acento)]"
                  />
                  <Avatar nombre={c.nombre} apellidos={c.apellidos} tono={tonoColor(c.color)} tamano="xs" />
                  <span className="truncate text-sm text-tinta">{nombreCompleto(c)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <div className="flex items-center gap-2">
        {equipo && (
          <BorrarConConfirmacion
            titulo={`¿Borrar el equipo ${equipo.nombre}?`}
            descripcion="Sus oportunidades se conservan, sin equipo. Si sólo quieres ocultarlo, archívalo. No se puede deshacer."
            etiqueta="Borrar equipo"
            onBorrar={async () => {
              const r = await borrarEquipoVentas(equipo.id);
              if (r.ok) onCerrar();
              return r;
            }}
          />
        )}
        <button type="button" onClick={onCerrar} className={`${claseSecundario} ml-auto`}>
          Cancelar
        </button>
        <button type="submit" disabled={pendiente} className={claseBotonPrincipal}>
          {pendiente ? "Guardando…" : equipo ? "Guardar" : "Crear equipo"}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------- Menú ---------------------------------- */

function MenuEquipo({ e, onEditar }: { e: EquipoVentas; onEditar: () => void }) {
  const { ejecutar } = useAccion();
  return (
    // Sin modo modal: «Configuración» abre un diálogo y no debe quedar bloqueado el puntero.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={claseIcono} aria-label={`Opciones de ${e.nombre}`}>
          <DotsThreeVertical className="size-5" weight="bold" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>Ver</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={flujoDe(e.id)}>Oportunidades</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={flujoDe(e.id, "&vista=actividad")}>Actividades</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Nuevo</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={`${rutaVentas.flujo}?nuevo=1&equipo=${e.id}`}>Oportunidad</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Informes</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={flujoDe(e.id, "&vista=analisis")}>Análisis de oportunidades</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="size-3 rounded-full" style={{ background: tonoColor(e.color) }} aria-hidden />
            Color
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={e.color} onValueChange={(c) => ejecutar(() => colorEquipoVentas(e.id, c))}>
              {COLORES_EQUIPO.map((c) => (
                <DropdownMenuRadioItem key={c} value={c}>
                  <span className="size-3 rounded-full" style={{ background: tonoColor(c) }} aria-hidden />
                  {NOMBRE_COLOR[c]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={onEditar}>Configuración</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => ejecutar(() => archivarEquipoVentas(e.id, e.activo))}>{e.activo ? "Archivar" : "Restaurar"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* --------------------------------- Tarjeta -------------------------------- */

const esControl = (ev: MouseEvent) => (ev.target as HTMLElement).closest("a, button, [role=menu], [role=menuitem]") !== null;

function Tarjeta({ e, r, comerciales, onEditar }: { e: EquipoVentas; r: ResumenEquipo; comerciales: Miembro[]; onEditar: () => void }) {
  const router = useRouter();
  const lider = comerciales.find((c) => c.id === e.lider_id) ?? null;
  const miembros = e.miembros.map((id) => comerciales.find((c) => c.id === id)).filter((c): c is Miembro => !!c);
  const avance = e.objetivo ? Math.min(100, (r.ganadoMes / e.objetivo) * 100) : null;

  return (
    <li
      onClick={(ev) => !esControl(ev) && router.push(flujoDe(e.id))}
      className={`group relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded-2xl bg-placa p-4 pl-5 shadow-placa transition-[background-color,transform] duration-150 hover:bg-placa-2/40 active:scale-[0.99] ${
        e.activo ? "" : "border border-dashed border-linea"
      }`}
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: tonoColor(e.color) }} aria-hidden />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link href={flujoDe(e.id)} className="block truncate text-base font-semibold text-tinta group-hover:text-acento-tinta">
            {e.nombre}
          </Link>
          {e.email ? (
            <a href={`mailto:${e.email}`} className="mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate text-[0.8125rem] text-tinta-2 hover:text-tinta hover:underline">
              <EnvelopeSimple className="size-3.5 shrink-0" aria-hidden />
              {e.email}
            </a>
          ) : (
            <p className="mt-0.5 text-[0.8125rem] text-tinta-2">Sin alias de correo</p>
          )}
        </div>
        {!e.activo && <span className="rounded bg-placa-2 px-1.5 text-[0.6875rem] font-medium text-tinta-2">Archivado</span>}
        <MenuEquipo e={e} onEditar={onEditar} />
      </div>

      <dl className="grid grid-cols-2 gap-2 rounded-xl bg-placa-2/60 px-3 py-2.5">
        <div>
          <dt className="text-xs text-tinta-2">Abiertas</dt>
          <dd className="cifra text-lg text-tinta">{numero(r.abiertas)}</dd>
        </div>
        <div>
          <dt className="text-xs text-tinta-2">Importe abierto</dt>
          <dd className="cifra truncate text-lg text-tinta">{dinero(r.ingresos)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
          <span className="text-tinta-2">Ganado este mes</span>
          <span className="tabular-nums text-tinta">
            <span className="font-semibold">{dinero(r.ganadoMes)}</span>
            {e.objetivo ? <span className="text-tinta-2"> / {dinero(e.objetivo)}</span> : null}
          </span>
        </div>
        {avance != null ? (
          <span
            className="h-1.5 overflow-hidden rounded-full bg-placa-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(avance)}
            aria-label="Objetivo del mes"
          >
            <span className={`block h-full rounded-full ${avance >= 100 ? "bg-exito" : "bg-acento"}`} style={{ width: `${avance}%` }} />
          </span>
        ) : (
          <button type="button" onClick={onEditar} className="self-start text-xs text-acento-tinta underline-offset-4 hover:underline">
            Poner objetivo mensual
          </button>
        )}
      </div>

      <div className="mt-auto flex items-center gap-3">
        {lider ? (
          <span className="flex min-w-0 items-center gap-1 text-xs text-tinta-2">
            Líder <Responsable m={lider} />
          </span>
        ) : (
          <span className="text-xs text-tinta-2">Sin líder</span>
        )}
        <span className="ml-auto flex -space-x-1.5" title={miembros.map((m) => nombreCompleto(m)).join(", ") || "Sin miembros"}>
          {miembros.slice(0, 5).map((m) => (
            <span key={m.id} className="rounded-full ring-2 ring-placa">
              <Avatar nombre={m.nombre} apellidos={m.apellidos} tono={tonoColor(m.color)} tamano="xs" />
            </span>
          ))}
          {miembros.length > 5 && <span className="grid size-5 place-items-center rounded-full bg-placa-2 text-[0.6rem] text-tinta-2 ring-2 ring-placa">+{miembros.length - 5}</span>}
          <span className="sr-only">{miembros.length} miembros</span>
        </span>
      </div>

      {r.actividadesVencidas > 0 && (
        <Link
          href={flujoDe(e.id, "&f=estancadas")}
          className="inline-flex items-center gap-1.5 self-start rounded-md bg-critico-suave px-2 py-1 text-xs font-medium text-critico hover:brightness-105"
        >
          <WarningCircle className="size-3.5" weight="fill" aria-hidden />
          {numero(r.actividadesVencidas)} {r.actividadesVencidas === 1 ? "actividad vencida" : "actividades vencidas"}
        </Link>
      )}
    </li>
  );
}

/* ---------------------------------- Vista --------------------------------- */

/** Equipos de ventas en tarjetas, como en el CRM de ventas: cada una lleva a su flujo. */
export function VistaEquipos({
  equipos,
  resumen,
  comerciales,
}: {
  equipos: EquipoVentas[];
  resumen: Record<string, ResumenEquipo>;
  comerciales: Miembro[];
}) {
  const [q, setQ] = useState("");
  const [archivados, setArchivados] = useState(false);
  const [editando, setEditando] = useState<EquipoVentas | "nuevo" | null>(null);

  const t = normalizarTexto(q.trim());
  const visibles = equipos.filter((e) => e.activo !== archivados && (!t || normalizarTexto(`${e.nombre} ${e.email ?? ""}`).includes(t)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Buscar equipos</span>
          <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-tinta-2" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar equipo…" className={`${claseCampo} h-8 pl-8`} />
        </label>
        <label className="flex items-center gap-2 text-[0.8125rem] text-tinta-2">
          <Switch checked={archivados} onCheckedChange={setArchivados} aria-label="Ver archivados" />
          Archivados
        </label>
        <button type="button" onClick={() => setEditando("nuevo")} className={`${claseBotonPrincipal} ml-auto h-8 px-3`}>
          <Plus className="size-4" weight="bold" aria-hidden />
          Nuevo equipo
        </button>
      </div>

      {visibles.length === 0 ? (
        <SinDatos
          titulo={archivados ? "No hay equipos archivados" : t ? "Ningún equipo con ese nombre" : "Aún no hay equipos"}
          texto={
            archivados || t
              ? "Prueba con otra búsqueda o vuelve a los equipos activos."
              : "Agrupa a los comerciales por equipos para repartir el flujo y seguir sus objetivos."
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((e) => (
            <Tarjeta key={e.id} e={e} r={resumen[e.id] ?? RESUMEN_VACIO} comerciales={comerciales} onEditar={() => setEditando(e)} />
          ))}
        </ul>
      )}

      <DialogoFormulario
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        titulo={editando === "nuevo" ? "Nuevo equipo de ventas" : "Configuración del equipo"}
        descripcion="Las oportunidades de sus miembros se asignan a este equipo."
      >
        {editando !== null && (
          <FormularioEquipo
            key={editando === "nuevo" ? "n" : editando.id}
            equipo={editando === "nuevo" ? null : editando}
            comerciales={comerciales}
            onCerrar={() => setEditando(null)}
          />
        )}
      </DialogoFormulario>
    </div>
  );
}
