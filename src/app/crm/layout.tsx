import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Logotipo } from "@/components/marca/Logotipo";
import { NavegacionInferior, NavegacionLateral } from "@/components/crm/Navegacion";
import { salir } from "./acciones/sesion";

export default async function LayoutCrm({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // La pantalla de acceso se pinta entera, sin armazón.
  if (!user) return <>{children}</>;

  const inicial = (user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-acero bg-negro/95 px-4 backdrop-blur lg:px-5">
        <Link href="/crm" className="shrink-0">
          <Logotipo variante="linea" className="text-lg" />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="etiqueta hidden px-3 py-2 text-[0.65rem] transition-colors hover:text-azul sm:block"
          >
            Ver la web
          </Link>

          <span
            className="grid size-8 place-items-center border border-acero bg-grafito text-xs font-semibold text-niebla"
            title={user.email ?? ""}
          >
            {inicial}
          </span>

          <form action={salir}>
            <button
              type="submit"
              className="grid size-8 place-items-center border border-acero text-niebla transition-colors hover:border-bengala hover:text-bengala"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1">
        <NavegacionLateral />
        <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>
      </div>

      <NavegacionInferior />
    </div>
  );
}
