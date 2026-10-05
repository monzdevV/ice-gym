import type { Metadata } from "next";
import { directorio, listarNominas, perfilRrhh } from "@/lib/datos/rrhh";
import { nombreEmpleado } from "@/lib/rrhh";
import { numero } from "@/lib/formato";
import { Encabezado, SinDatos } from "@/components/crm/Primitivas";
import { SinFichaRrhh } from "@/components/crm/rrhh/Acceso";
import { FiltrosRrhh } from "@/components/crm/rrhh/Filtros";
import { SubirNomina } from "@/components/crm/rrhh/Nominas";
import { Cifras } from "@/components/crm/rrhh/Piezas";
import { TablaNominas } from "@/components/crm/rrhh/TablaNominas";

export const metadata: Metadata = { title: "Nóminas" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function PaginaNominas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const perfil = await perfilRrhh();
  if (!perfil.empleado) {
    return (
      <main className="flex flex-col px-4 pb-10 lg:px-8">
        <Encabezado titulo="Nóminas" className="px-0 lg:px-0" />
        <SinFichaRrhh perfil={perfil} />
      </main>
    );
  }

  const sp = await searchParams;
  const yo = perfil.empleado.id;
  // Las nóminas son privadas: cada cual ve las suyas; sólo administración ve todas (RLS lo impone).
  const empleadoId = perfil.esAdmin ? (UUID.test(sp.empleado ?? "") ? sp.empleado : undefined) : yo;
  const [todas, dir] = await Promise.all([listarNominas({ empleadoId }), directorio()]);
  const personas = new Map(dir.map((e) => [e.id, e]));

  const lista = todas
    .filter((n) => !sp.anio || String(n.anio) === sp.anio)
    .filter((n) => (sp.firma === "firmada" ? !!n.firmada_at : sp.firma === "pendiente" ? !n.firmada_at : true));
  const pendientes = todas.filter((n) => !n.firmada_at).length;
  const anios = [...new Set(todas.map((n) => String(n.anio)))].sort().reverse();
  const conNominas = dir.filter((e) => e.id === sp.empleado || e.estado === "activo");

  return (
    <main className="flex flex-col gap-4 px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Nóminas"
        className="px-0 pb-1 lg:px-0"
        meta={
          <span>
            <span className={`font-medium tabular-nums ${pendientes ? "text-alarma-tinta" : "text-tinta"}`}>{numero(pendientes)}</span>{" "}
            {perfil.esAdmin ? "pendientes de firma" : pendientes === 1 ? "nómina tuya pendiente de firmar" : "nóminas tuyas pendientes de firmar"}
          </span>
        }
      >
        {perfil.esAdmin && <SubirNomina empleados={dir.filter((e) => e.estado === "activo")} empleadoId={empleadoId} />}
      </Encabezado>

      {perfil.esAdmin && (
        <Cifras
          items={[
            { k: "Nóminas", v: numero(todas.length) },
            { k: "Firmadas", v: numero(todas.length - pendientes) },
            { k: "Vistas sin firmar", v: numero(todas.filter((n) => !n.firmada_at && n.vista_at).length) },
            { k: "Sin abrir", v: numero(todas.filter((n) => !n.vista_at).length) },
          ]}
        />
      )}

      <FiltrosRrhh
        pildoras={[
          ...(perfil.esAdmin
            ? [{ clave: "empleado", etiqueta: "Empleado", todos: "Todos", opciones: conNominas.map((e) => ({ valor: e.id, texto: nombreEmpleado(e) })) }]
            : []),
          { clave: "anio", etiqueta: "Año", todos: "Todos", opciones: anios.map((a) => ({ valor: a, texto: a })) },
          {
            clave: "firma",
            etiqueta: "Firma",
            todos: "Todas",
            opciones: [
              { valor: "pendiente", texto: "Pendientes" },
              { valor: "firmada", texto: "Firmadas" },
            ],
          },
        ]}
      />

      {lista.length === 0 ? (
        <SinDatos
          titulo="No hay nóminas"
          texto={
            perfil.esAdmin
              ? "Sube el PDF de cada nómina: el empleado la verá aquí y podrá firmar su recepción."
              : "Cuando administración suba tus nóminas aparecerán aquí. Ábrelas y firma su recepción."
          }
        />
      ) : (
        <TablaNominas lista={lista} personas={personas} yoId={yo} esAdmin={perfil.esAdmin} conEmpleado={perfil.esAdmin} />
      )}
    </main>
  );
}
