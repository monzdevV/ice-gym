import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { obtenerLead } from "@/lib/datos/leads";
import { listarCentros, listarTarifas } from "@/lib/datos/comunes";
import { codigoCentro } from "@/design/tokens";
import { COLOR_LEAD, ETIQUETA_LEAD, ETIQUETA_ORIGEN } from "@/lib/tipos";
import { fecha, fechaHora } from "@/lib/formato";
import { Seccion } from "@/components/crm/Primitivas";
import { Historial } from "@/components/crm/Historial";
import { FormularioActividad } from "@/components/crm/FormularioActividad";
import { FormularioNotas, PanelConvertir, SelectorEstado } from "@/components/crm/leads/ControlesLead";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { lead } = await obtenerLead(id);
  return { title: lead?.nombre ?? "Lead" };
}

export default async function PaginaLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ lead, actividades, socio }, centros, tarifas] = await Promise.all([
    obtenerLead(id),
    listarCentros(),
    listarTarifas(),
  ]);

  if (!lead) notFound();

  const datos = [
    { k: "Email", v: lead.email, href: `mailto:${lead.email}` },
    {
      k: "Teléfono",
      v: lead.telefono ?? "Sin teléfono",
      href: lead.telefono ? `tel:${lead.telefono.replace(/\s/g, "")}` : undefined,
    },
    { k: "Centro", v: lead.centro ? `${codigoCentro(lead.centro.nombre)} · ${lead.centro.nombre.replace("Ice Gym ", "")}` : "Sin elegir" },
    { k: "Tarifa", v: lead.tarifa?.nombre ?? "Sin elegir" },
    { k: "Visita", v: lead.fecha_visita ? fechaHora(lead.fecha_visita) : "Sin agendar" },
    { k: "Origen", v: ETIQUETA_ORIGEN[lead.origen] },
  ];

  return (
    <main className="pb-12">
      <div className="px-4 pt-6 lg:px-8">
        <Link
          href="/crm/leads"
          className="condensada inline-flex items-center gap-1.5 text-[0.85rem] text-tinta-2 hover:text-tinta"
        >
          <ArrowLeft className="size-4" weight="light" aria-hidden />
          Leads
        </Link>
      </div>

      {/* Rótulo del lead */}
      <header className="flex flex-col gap-4 px-4 pb-6 pt-4 lg:px-8">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
          <h1 className="animate-cortina flex items-stretch">
            <span className="w-2.5" style={{ backgroundColor: COLOR_LEAD[lead.estado] }} aria-hidden />
            <span className="corte-rotulo rotulo bg-tinta py-2 pl-4 pr-10 text-[clamp(2rem,4vw,3.2rem)] text-fondo">
              {lead.nombre}
            </span>
          </h1>
          <p className="pb-1 text-sm text-tinta-2">
            {ETIQUETA_LEAD[lead.estado]} · llegó el {fecha(lead.created_at)}
          </p>
        </div>
        <SelectorEstado id={lead.id} actual={lead.estado} />
      </header>

      <div className="grid gap-x-10 gap-y-10 px-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="flex min-w-0 flex-col gap-10">
          {lead.mensaje && (
            <Seccion titulo="Lo que nos escribió">
              <blockquote className="pt-4 text-[1.15rem] leading-relaxed text-tinta">“{lead.mensaje}”</blockquote>
            </Seccion>
          )}

          <Seccion titulo="Seguimiento" extra={<span className="cifra text-[1.2rem] text-tinta">{actividades.length}</span>}>
            <FormularioActividad leadId={lead.id} />
            <Historial actividades={actividades} />
          </Seccion>
        </div>

        <div className="flex flex-col gap-10">
          {socio ? (
            <Link
              href={`/crm/socios/${socio.id}`}
              className="corte-d group flex items-center justify-between bg-acento py-4 pl-4 pr-8 text-sobre-campo"
            >
              <span>
                <span className="condensada block text-[0.85rem]">Ya es socio · {socio.numero_socio}</span>
                <span className="rotulo mt-1 block text-[1.6rem]">
                  {socio.nombre} {socio.apellidos}
                </span>
              </span>
              <ArrowUpRight className="size-6 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" weight="bold" aria-hidden />
            </Link>
          ) : (
            <Seccion titulo="Convertir en socio">
              <PanelConvertir
                leadId={lead.id}
                centros={centros}
                tarifas={tarifas}
                centroSugerido={lead.centro_id}
                tarifaSugerida={lead.tarifa_interes_id}
              />
            </Seccion>
          )}

          <Seccion titulo="Contacto">
            <dl className="flex flex-col">
              {datos.map((d) => (
                <div key={d.k} className="grid grid-cols-[6rem_1fr] items-baseline gap-3 border-b border-linea py-2.5">
                  <dt className="dato">{d.k}</dt>
                  <dd className="truncate text-[0.95rem] text-tinta">
                    {d.href ? (
                      <a href={d.href} className="underline decoration-linea underline-offset-4 hover:decoration-tinta">
                        {d.v}
                      </a>
                    ) : (
                      d.v
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {lead.motivo_perdida && (
              <p className="mt-4 text-[0.92rem] text-tinta-2">
                <span className="condensada text-tinta">Motivo de pérdida:</span> {lead.motivo_perdida}
              </p>
            )}
          </Seccion>

          <Seccion titulo="Notas internas">
            <FormularioNotas id={lead.id} notas={lead.notas ?? ""} />
          </Seccion>
        </div>
      </div>
    </main>
  );
}
