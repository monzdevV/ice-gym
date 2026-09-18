import type { Metadata } from "next";
import Link from "next/link";
import { Logotipo } from "@/components/marca/Logotipo";
import { FormularioAcceso } from "@/components/crm/FormularioAcceso";
import { ControlTema } from "@/components/crm/ControlTema";

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
    <main className="ruido grid min-h-dvh grid-cols-1 bg-fondo lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,1fr)]">
      {/* Placa de presentación: la retransmisión antes de empezar */}
      <section className="hidden flex-col justify-between bg-tinta p-12 text-fondo lg:flex">
        <Logotipo variante="apilado" sobrePlaca className="text-[1.6rem]" />

        <div>
          <h1 className="rotulo text-[clamp(3.5rem,6.5vw,6rem)] leading-[0.86]">
            Todo el club,
            <br />
            en directo
          </h1>
          <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed opacity-75">
            Socios, cuotas, accesos, clases y leads de los tres centros en una sola herramienta.
          </p>
        </div>

        <ol className="flex flex-col gap-[3px]" aria-label="Centros de la cadena">
          {CENTROS.map((c, i) => (
            <li key={c.codigo} className="grid h-11 max-w-md grid-cols-[2.75rem_4rem_1fr] items-center bg-fondo text-tinta">
              <span className="cifra grid h-full place-items-center bg-acento text-[1.3rem] text-sobre-campo">{i + 1}</span>
              <span className="rotulo pl-3 text-[1.25rem]">{c.codigo}</span>
              <span className="condensada pr-3 text-right text-[0.85rem] text-tinta-2">
                {c.nombre} · {c.ciudad}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Formulario */}
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Logotipo className="text-[1.4rem] lg:invisible" />
          <ControlTema />
        </div>

        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h2 className="flex items-stretch">
            <span className="w-2.5 bg-acento" aria-hidden />
            <span className="corte-rotulo rotulo bg-tinta py-2 pl-4 pr-10 text-[2.4rem] text-fondo">Entrar</span>
          </h2>
          <p className="mt-5 text-[0.95rem] text-tinta-2">Usa la cuenta de equipo que te ha dado el club.</p>

          <FormularioAcceso siguiente={siguiente} />
        </div>

        <Link href="/" className="condensada text-[0.8rem] text-tinta-2 underline-offset-4 hover:text-tinta hover:underline">
          Ir a la web pública
        </Link>
      </section>
    </main>
  );
}
