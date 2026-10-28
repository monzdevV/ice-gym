import type { Metadata } from "next";
import { catalogosVentas, listarClientes } from "@/lib/datos/ventas";
import { numero } from "@/lib/formato";
import { Encabezado } from "@/components/crm/Primitivas";
import { NuevoCliente } from "@/components/crm/ventas/clientes/NuevoCliente";
import { VistaClientes, type TipoCliente } from "@/components/crm/ventas/clientes/VistaClientes";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

export default async function PaginaClientesVentas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const uno = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v ?? "").trim();
  };
  const q = uno("q").slice(0, 80);
  const tipoTxt = uno("tipo");
  const tipo: TipoCliente = tipoTxt === "personas" || tipoTxt === "empresas" ? tipoTxt : "todos";
  const archivados = uno("archivados") === "1";
  const vista = uno("vista") === "tarjetas" ? "tarjetas" : "lista";

  const [todos, cats] = await Promise.all([listarClientes(q, archivados), catalogosVentas()]);
  const conteo: Record<TipoCliente, number> = {
    todos: todos.length,
    personas: todos.filter((c) => !c.es_empresa).length,
    empresas: todos.filter((c) => c.es_empresa).length,
  };
  const filas = tipo === "todos" ? todos : todos.filter((c) => c.es_empresa === (tipo === "empresas"));
  const hayClientes = todos.length > 0 || !!q || archivados || cats.clientes.length > 0;

  return (
    <main className="flex flex-col px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Clientes"
        meta={
          <span>
            <span className="font-medium tabular-nums text-tinta">{numero(cats.clientes.length)}</span> clientes activos
          </span>
        }
        className="px-0 lg:px-0"
      >
        <NuevoCliente empresas={cats.clientes} comerciales={cats.comerciales} />
      </Encabezado>
      <VistaClientes filas={filas} q={q} tipo={tipo} archivados={archivados} vista={vista} conteo={conteo} hayClientes={hayClientes} />
    </main>
  );
}
