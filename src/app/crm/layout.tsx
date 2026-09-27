import { Suspense } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { ArrowSquareOut, SignOut } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { EnlaceConfiguracion, MenuLateral, NavegacionInferior, TituloSeccion } from "@/components/crm/Navegacion";
import { InterruptorTema } from "@/components/crm/InterruptorTema";
import { ClaseCuerpo } from "@/components/crm/ClaseCuerpo";
import { BotonPaleta, PaletaComandos } from "@/components/crm/PaletaComandos";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BotonCrear } from "@/components/crm/dashboard/BotonCrear";
import { ETAPAS_ABIERTAS } from "@/lib/tipos";
import { ETAPAS_ABIERTAS_B2B } from "@/lib/b2b";
import { catalogos as cargarCatalogos } from "@/lib/datos/b2b";
import { salir } from "./acciones/sesion";

const inter = Inter({ subsets: ["latin"], variable: "--font-crm", display: "swap" });

export default async function LayoutCrm({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // El proxy ya ha validado la sesión: aquí basta con leer las claims del JWT.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const clases = `crm ${inter.variable}`;
  const raiz = `${clases} min-h-dvh bg-fondo text-tinta`;

  // La pantalla de acceso se pinta entera, sin menú.
  if (!user) return <div className={raiz}>{children}</div>;

  // Contadores del menú y catálogos del botón «Crear», todo a la vez.
  const [leads, oportunidades, tareas, catalogos] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).in("estado", [...ETAPAS_ABIERTAS]),
    supabase.from("oportunidades").select("id", { count: "exact", head: true }).in("etapa", [...ETAPAS_ABIERTAS_B2B]),
    supabase.from("interacciones").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    cargarCatalogos(),
  ]);
  const contadores = { leads: leads.count ?? 0, oportunidades: oportunidades.count ?? 0, tareas: tareas.count ?? 0 };

  const nombre = String(user.email ?? "").split("@")[0];

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`${raiz} md:flex`}>
        <ClaseCuerpo clases={clases} />
        <a
          href="#contenido"
          className="sr-only z-50 rounded-md bg-acento px-4 py-2 text-sm text-sobre-campo focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
        >
          Saltar al contenido
        </a>

        {/* Menú lateral */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-linea bg-placa px-3 py-4 md:flex">
          <Link href="/crm" className="mb-6 flex items-center gap-2.5 px-2.5" aria-label="Ice Gym, ir al dashboard">
            <span className="grid size-8 place-items-center rounded-lg bg-acento text-xs font-bold text-sobre-campo">IG</span>
            <span className="flex flex-col leading-tight">
              <span className="text-[0.95rem] font-semibold tracking-tight">Ice Gym</span>
              <span className="text-xs text-tinta-2">CRM comercial</span>
            </span>
          </Link>

          <Suspense>
            <MenuLateral contadores={contadores} />
          </Suspense>

          <div className="mt-auto flex flex-col gap-0.5 border-t border-linea pt-3">
            <Suspense>
              <EnlaceConfiguracion />
            </Suspense>
            <Link
              href="/"
              className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
            >
              <ArrowSquareOut className="size-[18px]" aria-hidden />
              Web pública
            </Link>
            <div className="mt-2 flex items-center gap-2.5 rounded-md px-2.5 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-placa-2 text-xs font-semibold uppercase">
                {nombre.slice(0, 2)}
              </span>
              <span className="flex-1 truncate text-sm font-medium" title={String(user.email ?? "")}>
                {nombre}
              </span>
              <form action={salir}>
                <button
                  type="submit"
                  aria-label="Salir"
                  className="grid size-8 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
                >
                  <SignOut className="size-[18px]" aria-hidden />
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-linea bg-fondo/85 px-4 backdrop-blur md:px-6">
            <div className="md:hidden">
              <Suspense>
                <TituloSeccion />
              </Suspense>
            </div>
            <div className="hidden flex-1 md:block">
              <BotonPaleta />
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="md:hidden">
                <BotonPaleta compacto />
              </div>
              <Suspense>
                <BotonCrear catalogos={catalogos} />
              </Suspense>
              <InterruptorTema />
              <form action={salir} className="md:hidden">
                <button type="submit" aria-label="Salir" className="grid size-8 place-items-center rounded-md text-tinta-2">
                  <SignOut className="size-[18px]" aria-hidden />
                </button>
              </form>
            </div>
          </header>

          <div id="contenido" className="flex-1 pb-20 md:pb-0">
            {children}
          </div>
        </div>

        <Suspense>
          <NavegacionInferior contadores={contadores} />
          <PaletaComandos />
        </Suspense>
      </div>
    </TooltipProvider>
  );
}
