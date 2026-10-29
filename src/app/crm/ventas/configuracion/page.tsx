import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { catalogosVentas } from "@/lib/datos/ventas";
import { oportunidadesPorEtapa } from "@/lib/datos/ventas-gestion";
import { rutaVentas } from "@/lib/ventas";
import { Encabezado } from "@/components/crm/Primitivas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Etapas } from "@/components/crm/ventas/configuracion/Etapas";
import { Etiquetas, Razones, TiposActividad } from "@/components/crm/ventas/configuracion/Catalogos";
import { Planes } from "@/components/crm/ventas/configuracion/Planes";

export const metadata: Metadata = { title: "Ajustes de ventas" };
export const dynamic = "force-dynamic";

const PESTANAS = [
  { valor: "etapas", texto: "Etapas" },
  { valor: "etiquetas", texto: "Etiquetas" },
  { valor: "razones", texto: "Razones de pérdida" },
  { valor: "tipos", texto: "Tipos de actividad" },
  { valor: "planes", texto: "Planes de actividad" },
] as const;

export default async function PaginaAjustesVentas({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const inicial = PESTANAS.some((p) => p.valor === tab) ? tab! : "etapas";
  const [cats, conteo] = await Promise.all([catalogosVentas(), oportunidadesPorEtapa()]);

  const disparador =
    "h-9 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-sm font-medium text-tinta-2 shadow-none hover:text-tinta data-[state=active]:border-acento-tinta data-[state=active]:bg-transparent data-[state=active]:text-tinta data-[state=active]:shadow-none";

  return (
    <main className="flex flex-col px-4 pb-10 lg:px-8">
      <Encabezado titulo="Ajustes de ventas" meta="Etapas del flujo, etiquetas, razones de pérdida y actividades." className="px-0 lg:px-0">
        <Link href={rutaVentas.equipos} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-placa px-3 text-[0.8125rem] font-medium text-tinta shadow-placa hover:bg-placa-2">
          Equipos de ventas
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Encabezado>

      <Tabs defaultValue={inicial} className="gap-5">
        <TabsList variant="line" className="-mx-4 h-auto w-auto justify-start gap-1 overflow-x-auto rounded-none p-0 px-4 lg:-mx-8 lg:px-8">
          {PESTANAS.map((p) => (
            <TabsTrigger key={p.valor} value={p.valor} className={disparador}>
              {p.texto}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="etapas">
          <Etapas etapas={cats.etapas} conteo={conteo} />
        </TabsContent>
        <TabsContent value="etiquetas">
          <Etiquetas etiquetas={cats.etiquetas} />
        </TabsContent>
        <TabsContent value="razones">
          <Razones motivos={cats.motivos} />
        </TabsContent>
        <TabsContent value="tipos">
          <TiposActividad tipos={cats.tipos} />
        </TabsContent>
        <TabsContent value="planes">
          <Planes planes={cats.planes} tipos={cats.tipos} comerciales={cats.comerciales} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
