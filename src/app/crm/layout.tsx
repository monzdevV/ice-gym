import Link from "next/link";
import { Inter } from "next/font/google";
import { ArrowSquareOut, SignOut } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { MenuLateral, NavegacionInferior, TituloSeccion } from "@/components/crm/Navegacion";
import { ControlTema } from "@/components/crm/ControlTema";
import { salir } from "./acciones/sesion";

const inter = Inter({ subsets: ["latin"], variable: "--font-crm", display: "swap" });

export default async function LayoutCrm({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const raiz = `crm ${inter.variable} min-h-dvh bg-fondo text-tinta`;

  // La pantalla de acceso se pinta entera, sin menú.
  if (!user) return <div className={raiz}>{children}</div>;

  const nombre = (user.email ?? "").split("@")[0];

  return (
    <div className={`${raiz} md:flex`}>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-acento px-4 py-2 text-sm text-sobre-campo focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
      >
        Saltar al contenido
      </a>

      {/* Menú lateral */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-linea bg-placa px-3 py-4 md:flex">
        <Link href="/crm" className="mb-6 flex items-center gap-2.5 px-2.5" aria-label="Ice Gym, ir al panel">
          <span className="grid size-7 place-items-center rounded-md bg-acento text-xs font-bold text-sobre-campo">IG</span>
          <span className="text-[0.95rem] font-semibold tracking-tight">Ice Gym CRM</span>
        </Link>

        <p className="mb-1.5 px-2.5 text-[0.7rem] font-medium uppercase tracking-wider text-tinta-2">General</p>
        <MenuLateral />

        <div className="mt-auto flex flex-col gap-0.5 border-t border-linea pt-3">
          <Link
            href="/"
            className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
          >
            <ArrowSquareOut className="size-[18px]" aria-hidden />
            Web pública
          </Link>
          <div className="mt-2 flex items-center gap-2.5 rounded-md px-2.5 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-placa-2 text-xs font-semibold uppercase">
              {nombre.slice(0, 2)}
            </span>
            <span className="flex-1 truncate text-sm font-medium" title={user.email ?? ""}>
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
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-linea bg-placa/85 px-4 backdrop-blur md:px-6">
          <TituloSeccion />
          <div className="flex items-center gap-3">
            <ControlTema />
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

      <NavegacionInferior />
    </div>
  );
}
