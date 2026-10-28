import { notFound } from "next/navigation";
import {
  actividadesDe,
  catalogosVentas,
  listarOportunidadesVentas,
  mensajesDe,
  obtenerOportunidadVentas,
} from "@/lib/datos/ventas";
import { BarraEtapas, BarraFicha, BotonesEstado, BotonesResumen, type Paginador } from "@/components/crm/ventas/ficha/Cabecera";
import { CamposFicha } from "@/components/crm/ventas/ficha/CamposFicha";
import { Historial } from "@/components/crm/ventas/ficha/Historial";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await obtenerOportunidadVentas(id);
  return { title: o?.nombre ?? "Oportunidad" };
}

/** "7 min", "5 h", "3 días": cuánto lleva en la etapa actual. */
function tiempoDesde(iso: string, ahora = Date.now()) {
  const minutos = Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60_000));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h`;
  const dias = Math.floor(horas / 24);
  return `${dias} ${dias === 1 ? "día" : "días"}`;
}

export default async function PaginaOportunidadVentas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [o, catalogos, actividades, mensajes] = await Promise.all([
    obtenerOportunidadVentas(id),
    catalogosVentas(),
    actividadesDe({ oportunidad: id }),
    mensajesDe({ oportunidad: id }),
  ]);
  if (!o) notFound();

  // Paginador sobre el flujo por defecto, en el orden del tablero: columna a columna y, dentro, de arriba abajo.
  const columna = new Map(catalogos.etapas.map((e, k) => [e.id, k]));
  const ids = (await listarOportunidadesVentas({}, catalogos.yo))
    .map((x, k) => ({ id: x.id, columna: columna.get(x.etapa_id ?? "") ?? catalogos.etapas.length, posicion: x.posicion, k }))
    .sort((a, b) => a.columna - b.columna || a.posicion - b.posicion || a.k - b.k)
    .map((x) => x.id);
  const i = ids.indexOf(o.id);
  const paginador: Paginador | null =
    i < 0 ? null : { posicion: i + 1, total: ids.length, anterior: ids[i - 1] ?? null, siguiente: ids[i + 1] ?? null };

  const tiposReunion = new Set(catalogos.tipos.filter((t) => t.icono === "reunion").map((t) => t.id));
  const reuniones = actividades.pendientes.filter((a) => a.tipo_id && tiposReunion.has(a.tipo_id)).length;
  const motivo = o.estado === "perdida" ? o.motivo : null;

  return (
    <main className="flex flex-col gap-4 px-4 pb-12 pt-5 lg:px-8">
      <BarraFicha o={o} paginador={paginador} motivos={catalogos.motivos} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <BotonesEstado o={o} motivos={catalogos.motivos} />
        <BarraEtapas o={o} etapas={catalogos.etapas} tiempo={tiempoDesde(o.etapa_desde)} />
      </div>

      {o.estado === "perdida" && (motivo || o.nota_cierre) && (
        <p className="rounded-lg bg-critico-suave px-3 py-2 text-sm text-tinta">
          {motivo && (
            <>
              <span className="font-semibold text-critico">Razón de pérdida:</span> {motivo.nombre}
            </>
          )}
          {o.nota_cierre && <span className={`block whitespace-pre-line ${motivo ? "mt-1 text-tinta-2" : ""}`}>{o.nota_cierre}</span>}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <article className="relative rounded-2xl bg-placa p-5 shadow-placa md:p-7">
          <div className="mb-5 flex justify-end md:absolute md:right-7 md:top-7 md:mb-0">
            <BotonesResumen reuniones={reuniones} pendientes={actividades.pendientes.length} />
          </div>
          <CamposFicha o={o} catalogos={catalogos} />
        </article>

        <Historial
          oportunidad={o.id}
          email={o.email}
          comercial={o.comercial_id}
          pendientes={actividades.pendientes}
          mensajes={mensajes}
          catalogos={catalogos}
        />
      </div>
    </main>
  );
}
