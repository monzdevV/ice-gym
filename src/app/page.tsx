import Link from "next/link";
import { Logotipo } from "@/components/marca/Logotipo";
import { claseBotonPrincipal } from "@/components/crm/Primitivas";

/** Provisional: la web pública se construye en la fase 2. */
export default function Inicio() {
  return (
    <main className="ruido grid min-h-dvh place-items-center bg-fondo px-6">
      <div className="flex flex-col items-start gap-8">
        <Logotipo variante="apilado" className="text-[clamp(2rem,8vw,4rem)]" />
        <p className="max-w-sm text-tinta-2">La web pública de Ice Gym está en construcción.</p>
        <Link href="/crm" className={claseBotonPrincipal}>
          Entrar al CRM
        </Link>
      </div>
    </main>
  );
}
