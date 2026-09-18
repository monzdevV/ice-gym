import Link from "next/link";
import { Logotipo } from "@/components/marca/Logotipo";

/** Provisional: la web pública se construye en la fase 2. */
export default function Inicio() {
  return (
    <main className="ruido relative grid min-h-dvh place-items-center px-6">
      <div className="rejilla absolute inset-0 opacity-40" aria-hidden />
      <div className="relative text-center">
        <Logotipo variante="apilado" className="text-[clamp(2rem,8vw,4rem)]" />
        <p className="etiqueta mt-8">Web pública en construcción</p>
        <Link
          href="/crm"
          className="titular mt-6 inline-block bg-azul px-6 py-3 text-negro transition-colors hover:bg-hielo"
        >
          Entrar al CRM
        </Link>
      </div>
    </main>
  );
}
