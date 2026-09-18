import type { Metadata } from "next";
import Link from "next/link";
import { Logotipo } from "@/components/marca/Logotipo";
import { FormularioAcceso } from "@/components/crm/FormularioAcceso";

export const metadata: Metadata = { title: "Acceso al CRM" };

export default async function PaginaAcceso({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>;
}) {
  const { siguiente } = await searchParams;

  return (
    <main className="ruido relative grid min-h-dvh grid-cols-1 lg:grid-cols-[1fr_minmax(420px,38%)]">
      {/* Panel izquierdo: la marca ocupa la pantalla, sin adornos */}
      <section className="relative hidden overflow-hidden border-r border-acero lg:grid lg:grid-rows-[auto_1fr_auto]">
        <div className="rejilla absolute inset-0 opacity-50" aria-hidden />

        <div className="relative px-12 pt-10">
          <Logotipo variante="linea" className="text-2xl" />
        </div>

        <div className="relative flex flex-col justify-center px-12">
          <p className="etiqueta">Panel interno</p>
          <h1 className="titular mt-4 max-w-md text-[clamp(3rem,5.5vw,5rem)] text-hielo">
            Todo el club
            <br />
            en una pantalla
          </h1>
          <div className="regla mt-8 w-full max-w-md" />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-niebla">
            Socios, cuotas, accesos y clases de los tres centros. Sin hojas de cálculo sueltas.
          </p>
        </div>

        <dl className="relative flex divide-x divide-acero border-t border-acero">
          {[
            { k: "3", v: "centros" },
            { k: "5", v: "secciones" },
            { k: "24/7", v: "datos al día" },
          ].map((d) => (
            <div key={d.v} className="flex-1 px-12 py-7 first:pl-12">
              <dt className="cifra text-[2.5rem] text-azul">{d.k}</dt>
              <dd className="etiqueta mt-2.5">{d.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Panel derecho: el formulario */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logotipo variante="linea" className="mb-10 text-xl lg:hidden" />

          <p className="etiqueta">Identifícate</p>
          <h2 className="titular mt-3 text-4xl text-hielo">Acceso al CRM</h2>
          <p className="mt-3 text-sm text-niebla">
            Entra con la cuenta que te haya dado el club.
          </p>

          <FormularioAcceso siguiente={siguiente} />

          <Link
            href="/"
            className="mt-10 inline-block text-xs text-niebla underline-offset-4 transition-colors hover:text-azul hover:underline"
          >
            Volver a icegym.com
          </Link>
        </div>
      </section>
    </main>
  );
}
