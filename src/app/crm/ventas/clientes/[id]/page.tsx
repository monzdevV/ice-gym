import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Funnel, Plus } from "@phosphor-icons/react/dist/ssr";
import { actividadesDe, catalogosVentas, mensajesDe, obtenerCliente, oportunidadesDeCliente } from "@/lib/datos/ventas";
import { ruta } from "@/lib/b2b";
import { dinero, fecha, numero } from "@/lib/formato";
import { rutaVentas } from "@/lib/ventas";
import { Seccion } from "@/components/crm/Primitivas";
import { Avatar, Responsable } from "@/components/crm/b2b/Piezas";
import { ListaOportunidades } from "@/components/crm/ventas/clientes/ListaOportunidades";
import { FormularioCliente } from "@/components/crm/ventas/clientes/FormularioCliente";
import { AccionesCliente, ChatterCliente } from "@/components/crm/ventas/clientes/ControlesCliente";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await obtenerCliente(id);
  return { title: cliente?.nombre ?? "Cliente" };
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

  const abiertas = oportunidades.filter((o) => o.estado === "abierta");
  const ganadas = oportunidades.filter((o) => o.estado === "ganada");
  const importeAbierto = abiertas.reduce((s, o) => s + o.ingresos, 0);
  const importeGanado = ganadas.reduce((s, o) => s + o.ingresos, 0);

  return (
    <main className="flex flex-col gap-5 px-4 pb-12 pt-5 lg:px-8">
      <Link href={rutaVentas.clientes} className="inline-flex items-center gap-1.5 self-start text-[0.8125rem] text-tinta-2 hover:text-tinta">
        <ArrowLeft className="size-4" aria-hidden />
        Clientes
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <Avatar nombre={cliente.nombre} tamano="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="rotulo flex flex-wrap items-center gap-2 text-[1.9rem] text-tinta">
            {cliente.nombre}
            {!cliente.activo && <span className="rounded bg-placa-2 px-2 py-0.5 font-sans text-xs font-medium normal-case text-tinta-2">Archivado</span>}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tinta-2">
            <span>{cliente.puesto ?? "Persona"}</span>
            {cliente.empresa && (
              <>
                <span className="text-linea" aria-hidden>·</span>
                <Link href={ruta.empresa(cliente.empresa.id)} className="text-acento-tinta underline-offset-4 hover:underline">
                  {cliente.empresa.nombre}
                </Link>
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
            <FormularioCliente key={cliente.updated_at} cliente={cliente} empresas={cats.empresas} comerciales={cats.comerciales} />
          </Seccion>

          <Seccion titulo="Oportunidades" extra={<span className="text-xs tabular-nums text-tinta-2">{numero(oportunidades.length)}</span>}>
            <ListaOportunidades oportunidades={oportunidades} etapas={cats.etapas} vacio="Crea una con «Nueva oportunidad» para empezar a venderle." />
          </Seccion>
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
