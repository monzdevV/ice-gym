import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logotipo } from "@/components/marca/Logotipo";
import { NavegacionInferior, PestanasSecciones } from "@/components/crm/Navegacion";
import { ControlTema } from "@/components/crm/ControlTema";
import { salir } from "./acciones/sesion";

export default async function LayoutCrm({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // La pantalla de acceso se pinta entera, sin la banda.
  if (!user) return <>{children}</>;

  const nombre = (user.email ?? "").split("@")[0];

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="condensada sr-only z-50 bg-acento px-4 py-2 text-sobre-campo focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
      >
        Saltar al contenido
      </a>

      {/* Banda superior de retransmisión */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-stretch border-b border-linea bg-placa">
        <Link
          href="/crm"
          className="flex items-center border-r border-linea px-5 text-[1.45rem]"
          aria-label="Ice Gym, ir al panel"
        >
          <Logotipo />
        </Link>

        <div className="flex flex-1 items-stretch pl-2">
          <PestanasSecciones />
        </div>

        <div className="flex items-center gap-5 px-4 lg:px-5">
          <ControlTema />
          <span className="hidden h-6 w-px bg-linea lg:block" aria-hidden />
          <span className="condensada hidden max-w-40 truncate text-[0.8rem] text-tinta-2 lg:block" title={user.email ?? ""}>
            {nombre}
          </span>
          <form action={salir}>
            <button
              type="submit"
              className="condensada text-[0.8rem] text-tinta-2 underline-offset-4 transition-colors hover:text-tinta hover:underline"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <div id="contenido" className="flex-1 pb-20 md:pb-0">
        {children}
      </div>

      <footer className="hidden items-center justify-between border-t border-linea px-6 py-3 md:flex">
        <span className="dato">Ice Gym · CRM interno</span>
        <Link href="/" className="dato transition-colors hover:text-tinta">
          Ver la web pública
        </Link>
      </footer>

      <NavegacionInferior />
    </div>
  );
}
