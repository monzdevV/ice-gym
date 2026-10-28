import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Funnel, Plus, UserPlus } from "@phosphor-icons/react/dist/ssr";
import {
  actividadesDe,
  catalogosVentas,
  contactosDeCliente,
  mensajesDe,
  obtenerCliente,
  oportunidadesDeCliente,
} from "@/lib/datos/ventas";
import { dinero, fecha, numero } from "@/lib/formato";
import { rutaVentas, type ClienteCompleto, type ClienteVentas } from "@/lib/ventas";
import { Seccion, SinDatos } from "@/components/crm/Primitivas";
import { Avatar, LogoEmpresa, Responsable } from "@/components/crm/b2b/Piezas";
import { Estrellas, SenalEstadoVenta } from "@/components/crm/ventas/Piezas";
import { FormularioCliente } from "@/components/crm/ventas/clientes/FormularioCliente";
import { NuevoCliente } from "@/components/crm/ventas/clientes/NuevoCliente";
import { AccionesCliente, ChatterCliente } from "@/components/crm/ventas/clientes/ControlesCliente";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await obtenerCliente(id);
  return { title: cliente?.nombre ?? "Cliente" };
}

/** Sólo las columnas de la tabla: al formulario no le hacen falta las relaciones. */
function soloCliente(c: ClienteCompleto): ClienteVentas {
  const copia: Partial<ClienteCompleto> = { ...c };
  delete copia.empresa;
  delete copia.comercial;
  return copia as ClienteVentas;
}

const claseSmart =
  "flex min-w-36 items-center gap-3 rounded-xl bg-placa px-3.5 py-2.5 shadow-placa transition-colors hover:bg-placa-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta";

export default async function PaginaClienteVentas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cliente, oportunidades, actividades, mensajes, cats] = await Promise.all([
    obtenerCliente(id),
    oportunidadesDeCliente(id),
    actividadesDe({ cliente: id }),
    mensajesDe({ cliente: id }),
    catalogosVentas(),
  ]);
  if (!cliente) notFound();
  const contactos = cliente.es_empresa ? await contactosDeCliente(id) : [];

  const etapa = new Map(cats.etapas.map((e) => [e.id, e.nombre]));
  const abiertas = oportunidades.filter((o) => o.estado === "abierta");
  const ganadas = oportunidades.filter((o) => o.estado === "ganada");
  const importeAbierto = abiertas.reduce((s, o) => s + o.ingresos, 0);
  const importeGanado = ganadas.reduce((s, o) => s + o.ingresos, 0);
  const subtitulo = cliente.es_empresa
    ? [cliente.ciudad, cliente.pais].filter(Boolean).join(", ")
    : [cliente.puesto, cliente.empresa?.nombre].filter(Boolean).join(" · ");

  return (
    <main className="flex flex-col gap-5 px-4 pb-12 pt-5 lg:px-8">
      <Link href={rutaVentas.clientes} className="inline-flex items-center gap-1.5 self-start text-[0.8125rem] text-tinta-2 hover:text-tinta">
        <ArrowLeft className="size-4" aria-hidden />
        Clientes
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        {cliente.es_empresa ? <LogoEmpresa nombre={cliente.nombre} tamano="lg" /> : <Avatar nombre={cliente.nombre} tamano="lg" />}
        <div className="min-w-0 flex-1">
          <h1 className="rotulo flex flex-wrap items-center gap-2 text-[1.9rem] text-tinta">
            {cliente.nombre}
            {!cliente.activo && <span className="rounded bg-placa-2 px-2 py-0.5 font-sans text-xs font-medium normal-case text-tinta-2">Archivado</span>}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tinta-2">
            <span>{cliente.es_empresa ? "Empresa" : "Persona"}</span>
            {subtitulo && (
              <>
                <span className="text-linea" aria-hidden>·</span>
                {cliente.empresa ? (
                  <span>
                    {cliente.puesto ? `${cliente.puesto} · ` : ""}
                    <Link href={rutaVentas.cliente(cliente.empresa.id)} className="text-acento-tinta underline-offset-4 hover:underline">
                      {cliente.empresa.nombre}
                    </Link>
                  </span>
                ) : (
                  <span>{subtitulo}</span>
                )}
              </>
            )}
            {cliente.comercial && (
              <>
                <span className="text-linea" aria-hidden>·</span>
                <Responsable m={cliente.comercial} />
              </>
            )}
          </p>
        </div>
        <AccionesCliente id={cliente.id} nombre={cliente.nombre} activo={cliente.activo} nOportunidades={oportunidades.length} />
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Accesos del cliente">
        <Link href={`${rutaVentas.flujo}?cliente=${id}&f=abiertas,ganadas,perdidas`} className={claseSmart}>
          <Funnel className="size-5 text-acento-tinta" aria-hidden />
          <span className="flex flex-col leading-tight">
            <span className="cifra text-lg text-tinta">{numero(oportunidades.length)}</span>
            <span className="text-xs text-tinta-2">{oportunidades.length === 1 ? "Oportunidad" : "Oportunidades"}</span>
          </span>
        </Link>
        <div className="flex min-w-36 flex-col justify-center rounded-xl bg-placa px-3.5 py-2.5 leading-tight shadow-placa">
          <span className="cifra text-lg text-tinta">{dinero(importeAbierto)}</span>
          <span className="text-xs text-tinta-2">Abierto · {numero(abiertas.length)}</span>
        </div>
        <div className="flex min-w-36 flex-col justify-center rounded-xl bg-placa px-3.5 py-2.5 leading-tight shadow-placa">
          <span className="cifra text-lg text-tinta">{dinero(importeGanado)}</span>
          <span className="text-xs text-tinta-2">Ganado · {numero(ganadas.length)}</span>
        </div>
        <Link href={`${rutaVentas.flujo}?nuevo=1&cliente=${id}`} className={claseSmart}>
          <Plus className="size-5 text-acento-tinta" weight="bold" aria-hidden />
          <span className="text-sm font-medium text-tinta">Nueva oportunidad</span>
        </Link>
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Seccion titulo="Datos del cliente" extra={<span className="text-xs text-tinta-2">Alta: {fecha(cliente.created_at)}</span>}>
            <FormularioCliente key={cliente.updated_at} cliente={soloCliente(cliente)} empresaActual={cliente.empresa} empresas={cats.clientes} comerciales={cats.comerciales} />
          </Seccion>

          <Seccion titulo="Oportunidades" extra={<span className="text-xs tabular-nums text-tinta-2">{numero(oportunidades.length)}</span>}>
            {oportunidades.length === 0 ? (
              <SinDatos titulo="Sin oportunidades" texto="Crea una con «Nueva oportunidad» para empezar a venderle." />
            ) : (
              <ul className="-mx-2 flex flex-col">
                {oportunidades.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={rutaVentas.oportunidad(o.id)}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 transition-colors hover:bg-placa-2/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-tinta">{o.nombre}</span>
                        <span className="block truncate text-xs text-tinta-2">
                          {(o.etapa_id && etapa.get(o.etapa_id)) ?? "Sin etapa"}
                          {o.cierre_previsto ? ` · cierre ${fecha(o.cierre_previsto)}` : ""}
                        </span>
                      </span>
                      <Estrellas n={o.prioridad} tamano="size-3.5" />
                      <SenalEstadoVenta estado={o.estado} />
                      <span className={`cifra w-24 text-right ${o.estado === "perdida" ? "text-tinta-2 line-through decoration-1" : "text-tinta"}`}>
                        {dinero(o.ingresos)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          {cliente.es_empresa && (
            <Seccion
              titulo="Contactos"
              extra={
                <NuevoCliente empresas={cats.clientes} comerciales={cats.comerciales} empresa={cliente.id}>
                  <button type="button" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-acento-tinta underline-offset-4 hover:underline">
                    <UserPlus className="size-4" aria-hidden />
                    Añadir persona
                  </button>
                </NuevoCliente>
              }
            >
              {contactos.length === 0 ? (
                <p className="text-sm text-tinta-2">Nadie de esta empresa todavía.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {contactos.map((c) => (
                    <li key={c.id}>
                      <Link href={rutaVentas.cliente(c.id)} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-placa-2/60">
                        <Avatar nombre={c.nombre} tamano="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-tinta">{c.nombre}</span>
                          <span className="block truncate text-xs text-tinta-2">{c.email ?? c.telefono ?? "Sin datos de contacto"}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
          )}
        </div>

        <ChatterCliente
          clienteId={cliente.id}
          pendientes={actividades.pendientes}
          mensajes={mensajes}
          tipos={cats.tipos}
          planes={cats.planes}
          comerciales={cats.comerciales}
          asignado={cliente.comercial_id ?? cats.yo}
        />
      </div>
    </main>
  );
}
