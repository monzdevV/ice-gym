import type { Metadata } from "next";
import Link from "next/link";
import { FormularioAcceso } from "@/components/crm/FormularioAcceso";
import { InterruptorTema } from "@/components/crm/InterruptorTema";

export const metadata: Metadata = { title: "Acceso al CRM" };

const CENTROS = [
  { codigo: "CHA", ciudad: "Madrid", nombre: "Chamberí" },
  { codigo: "POB", ciudad: "Barcelona", nombre: "Poblenou" },
  { codigo: "RUZ", ciudad: "Valencia", nombre: "Ruzafa" },
];

export default async function PaginaAcceso({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>;
}) {
  const { siguiente } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col px-4 py-6">
      <div className="flex justify-end">
        <InterruptorTema />
      </div>

      <div className="m-auto w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-acento text-xs font-bold text-sobre-campo">IG</span>
          <span className="text-base font-semibold tracking-tight">Ice Gym CRM</span>
        </div>

        <div className="rounded-xl border border-linea bg-placa p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">Inicia sesión</h1>
          <p className="mt-1.5 text-sm text-tinta-2">Usa la cuenta de equipo que te ha dado el club.</p>
          <FormularioAcceso siguiente={siguiente} />
        </div>

        <p className="mt-6 text-center text-xs text-tinta-2">
          {CENTROS.map((c) => c.nombre).join(" · ")} ·{" "}
          <Link href="/" className="underline-offset-4 hover:text-tinta hover:underline">
            Web pública
          </Link>
        </p>
      </div>
    </main>
  );
}
