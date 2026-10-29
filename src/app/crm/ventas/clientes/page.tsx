import type { Metadata } from "next";
import { Buildings } from "@phosphor-icons/react/dist/ssr";
import { catalogos } from "@/lib/datos/b2b";
import { catalogosVentas, listarClientes } from "@/lib/datos/ventas";
import { numero } from "@/lib/formato";
import { Encabezado, claseBotonSecundario } from "@/components/crm/Primitivas";
import { NuevaEmpresa } from "@/components/crm/empresas/NuevaEmpresa";
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

  const [todos, cats, catsB2B] = await Promise.all([listarClientes(q, archivados), catalogosVentas(), catalogos()]);
  const conteo: Record<TipoCliente, number> = {
    todos: todos.length,
    personas: todos.filter((c) => c.tipo === "persona").length,
    empresas: todos.filter((c) => c.tipo === "empresa").length,
  };
  const filas = tipo === "todos" ? todos : todos.filter((c) => c.tipo === (tipo === "empresas" ? "empresa" : "persona"));
  const hayClientes = todos.length > 0 || !!q || archivados || cats.clientes.length > 0;

  return (
    <main className="flex flex-col px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Clientes"
        meta={
          <span>
            <span className="font-medium tabular-nums text-tinta">{numero(conteo.personas)}</span> {conteo.personas === 1 ? "persona" : "personas"} ·{" "}
            <span className="font-medium tabular-nums text-tinta">{numero(conteo.empresas)}</span> {conteo.empresas === 1 ? "empresa" : "empresas"}
          </span>
        }
        className="px-0 lg:px-0"
      >
        <div className="flex flex-wrap items-center gap-2">
          <NuevaEmpresa catalogos={catsB2B}>
            <button type="button" className={claseBotonSecundario}>
              <Buildings className="size-4" aria-hidden />
              Nueva empresa
            </button>
          </NuevaEmpresa>
          <NuevoCliente empresas={cats.empresas} comerciales={cats.comerciales} />
        </div>
      </Encabezado>
      <VistaClientes filas={filas} q={q} tipo={tipo} archivados={archivados} vista={vista} conteo={conteo} hayClientes={hayClientes} />
    </main>
  );
}
