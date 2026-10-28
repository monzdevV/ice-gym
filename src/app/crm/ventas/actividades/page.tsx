import type { Metadata } from "next";
import Link from "next/link";
import { actividadesEntre, actividadesPendientes, catalogosVentas } from "@/lib/datos/ventas";
import { hoyISO, normalizarTexto, plazoDe, rutaVentas, sumarDias, type ActividadVentasCompleta, type Plazo } from "@/lib/ventas";
import { incluye } from "@/lib/b2b";
import { dinero } from "@/lib/formato";
import { Seccion, SinDatos, claseEnlace } from "@/components/crm/Primitivas";
import { ListaActividades } from "@/components/crm/ventas/ListaActividades";
import { AnalisisActividades } from "@/components/crm/ventas/actividades/Analisis";
import { ControlesActividades, PLAZOS_FILTRO, type PlazoFiltro } from "@/components/crm/ventas/actividades/Controles";

export const metadata: Metadata = { title: "Mis actividades" };
export const dynamic = "force-dynamic";

const GRUPOS: { plazo: Plazo; filtro: PlazoFiltro; titulo: string }[] = [
  { plazo: "vencida", filtro: "vencidas", titulo: "Vencidas" },
  { plazo: "hoy", filtro: "hoy", titulo: "Hoy" },
  { plazo: "planificada", filtro: "futuras", titulo: "Próximas" },
];

export default async function PaginaMisActividades({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const catalogos = await catalogosVentas();
  const vista = sp.vista === "analisis" ? "analisis" : "lista";
  const plazo: PlazoFiltro = incluye(PLAZOS_FILTRO, sp.plazo) ? sp.plazo : "todas";
  const q = (sp.q ?? "").trim().slice(0, 80);
  // Sin ficha en el equipo no hay «mías»: se ven las de todos.
  const equipo = sp.quien === "equipo" || !catalogos.yo;
  const asignado = equipo ? null : catalogos.yo;
  const hoy = hoyISO();

  const cabecera = (
    <header className="flex flex-col gap-1 pb-5 pt-6">
      <h1 className="rotulo text-[2rem] text-tinta">{equipo ? "Actividades del equipo" : "Mis actividades"}</h1>
      <p className="text-sm text-tinta-2">Lo que hay que hacer en las oportunidades y clientes de ventas, del más urgente al último.</p>
    </header>
  );

  if (vista === "analisis") {
    const actividades = await actividadesEntre(sumarDias(hoy, -30), sumarDias(hoy, 30));
    return (
      <main className="flex flex-col gap-5 px-4 pb-12 lg:px-8">
        {cabecera}
        <ControlesActividades vista={vista} plazo={plazo} equipo={equipo} q={q} cuentas={{ todas: 0, vencidas: 0, hoy: 0, futuras: 0 }} puedeSoloMias={!!catalogos.yo} />
        <AnalisisActividades
          actividades={asignado ? actividades.filter((a) => a.asignado_id === asignado) : actividades}
          tipos={catalogos.tipos}
          comerciales={catalogos.comerciales}
          hoy={hoy}
        />
      </main>
    );
  }

  let todas = await actividadesPendientes(asignado);
  const t = normalizarTexto(q);
  if (t) {
    todas = todas.filter((a) =>
      normalizarTexto([a.resumen, a.nota, a.tipo?.nombre, a.oportunidad?.nombre, a.cliente?.nombre].filter(Boolean).join(" ")).includes(t)
    );
  }
  const porPlazo = (p: Plazo) => todas.filter((a) => plazoDe(a.vence, hoy) === p);
  const grupos = GRUPOS.map((g) => ({ ...g, items: porPlazo(g.plazo) }));
  const cuentas: Record<PlazoFiltro, number> = {
    todas: todas.length,
    vencidas: grupos[0].items.length,
    hoy: grupos[1].items.length,
    futuras: grupos[2].items.length,
  };
  const visibles = grupos.filter((g) => g.items.length && (plazo === "todas" || g.filtro === plazo));

  return (
    <main className="flex flex-col gap-5 px-4 pb-12 lg:px-8">
      {cabecera}
      <ControlesActividades vista={vista} plazo={plazo} equipo={equipo} q={q} cuentas={cuentas} puedeSoloMias={!!catalogos.yo} />

      {!catalogos.yo && (
        <p className="rounded-lg bg-placa-2 px-3 py-2 text-sm text-tinta-2">
          Tu usuario ({catalogos.email ?? "sin correo"}) no está en el equipo comercial, así que no tienes actividades propias: aquí ves las de todo
          el equipo. Añádete en <Link href="/crm/configuracion" className={claseEnlace}>Configuración</Link> para tener las tuyas.
        </p>
      )}

      {visibles.length === 0 ? (
        <SinDatos
          titulo={q ? "Nada coincide con la búsqueda" : "Nada pendiente por aquí"}
          texto={
            q
              ? "Prueba con otras palabras o quita la búsqueda."
              : "No hay actividades planificadas en este plazo. Planifica la siguiente llamada o reunión desde una oportunidad para que nada se enfríe."
          }
          accion={
            <Link href={rutaVentas.flujo} className={claseEnlace}>
              Ir al flujo de ventas
            </Link>
          }
        />
      ) : (
        visibles.map((g) => (
          <Seccion
            key={g.plazo}
            id={`plazo-${g.plazo}`}
            titulo={`${g.titulo} · ${g.items.length}`}
            extra={<Importe items={g.items} />}
          >
            <ListaActividades actividades={g.items} tipos={catalogos.tipos} planes={catalogos.planes} comerciales={catalogos.comerciales} conOrigen />
          </Seccion>
        ))
      )}
    </main>
  );
}

/** Lo que está en juego en un grupo: oportunidades distintas y sus ingresos esperados. */
function Importe({ items }: { items: ActividadVentasCompleta[] }) {
  const oportunidades = new Map(items.filter((a) => a.oportunidad).map((a) => [a.oportunidad!.id, a.oportunidad!.ingresos]));
  if (!oportunidades.size) return null;
  const total = [...oportunidades.values()].reduce((s, v) => s + v, 0);
  return (
    <span className="text-xs text-tinta-2">
      {oportunidades.size} {oportunidades.size === 1 ? "oportunidad" : "oportunidades"} ·{" "}
      <span className="cifra text-sm text-tinta">{dinero(total)}</span>
    </span>
  );
}
