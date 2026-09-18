import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarClock, Mail, Phone } from "lucide-react";
import { obtenerLead } from "@/lib/datos/leads";
import { listarCentros, listarTarifas } from "@/lib/datos/comunes";
import { COLOR_LEAD, ETIQUETA_LEAD, ETIQUETA_ORIGEN } from "@/lib/tipos";
import { fecha, fechaHora } from "@/lib/formato";
import { Bloque, Pildora } from "@/components/crm/Primitivas";
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

  return (
    <main>
      {/* Cabecera de la ficha */}
      <header className="border-b border-acero px-4 py-5 lg:px-6">
        <Link
          href="/crm/leads"
          className="etiqueta inline-flex items-center gap-1.5 text-[0.6rem] transition-colors hover:text-azul"
        >
          <ArrowLeft className="size-3" strokeWidth={1.5} aria-hidden />
          Leads
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="titular text-[clamp(1.9rem,4vw,2.75rem)] text-hielo">{lead.nombre}</h1>
              <Pildora texto={ETIQUETA_LEAD[lead.estado]} color={COLOR_LEAD[lead.estado]} />
            </div>
            <p className="mt-2 text-sm text-niebla">
              {ETIQUETA_ORIGEN[lead.origen]} · llegó el {fecha(lead.created_at)}
            </p>
          </div>
          <SelectorEstado id={lead.id} actual={lead.estado} />
        </div>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-6">
        {/* Columna principal: seguimiento */}
        <div className="space-y-4">
          {lead.mensaje && (
            <Bloque titulo="Lo que nos escribió">
              <blockquote className="border-l-2 border-azul px-4 py-4 text-[0.95rem] leading-relaxed text-hielo">
                {lead.mensaje}
              </blockquote>
            </Bloque>
          )}

          <Bloque
            titulo="Historial"
            extra={<span className="cifra text-base text-hielo">{actividades.length}</span>}
          >
            <FormularioActividad leadId={lead.id} />
            <Historial actividades={actividades} />
          </Bloque>
        </div>

        {/* Columna lateral: datos y acciones */}
        <div className="space-y-4">
          {socio ? (
            <Link
              href={`/crm/socios/${socio.id}`}
              className="corte group block bg-azul p-4 text-negro transition-colors hover:bg-hielo"
            >
              <p className="etiqueta text-[0.6rem] text-negro/70">Ya es socio</p>
              <p className="titular mt-2 text-2xl">
                {socio.nombre} {socio.apellidos}
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm font-medium">
                {socio.numero_socio}
                <ArrowUpRight className="size-4" strokeWidth={2} aria-hidden />
              </p>
            </Link>
          ) : (
            <Bloque titulo="Convertir en socio" className="border-azul/40">
              <PanelConvertir
                leadId={lead.id}
                centros={centros}
                tarifas={tarifas}
                centroSugerido={lead.centro_id}
                tarifaSugerida={lead.tarifa_interes_id}
                yaEsSocio={Boolean(lead.socio_id)}
              />
            </Bloque>
          )}

          <Bloque titulo="Contacto">
            <dl className="divide-y divide-acero">
              <Dato icono={Mail} etiqueta="Email" valor={lead.email} href={`mailto:${lead.email}`} />
              <Dato
                icono={Phone}
                etiqueta="Teléfono"
                valor={lead.telefono ?? "—"}
                href={lead.telefono ? `tel:${lead.telefono.replace(/\s/g, "")}` : undefined}
              />
              <Dato
                icono={CalendarClock}
                etiqueta="Visita"
                valor={lead.fecha_visita ? fechaHora(lead.fecha_visita) : "Sin agendar"}
              />
            </dl>
            <dl className="grid grid-cols-2 border-t border-acero">
              <div className="border-r border-acero px-4 py-3">
                <dt className="etiqueta text-[0.58rem]">Centro</dt>
                <dd className="mt-1.5 text-sm text-hielo">
                  {lead.centro?.nombre.replace("Ice Gym ", "") ?? "—"}
                </dd>
              </div>
              <div className="px-4 py-3">
                <dt className="etiqueta text-[0.58rem]">Tarifa</dt>
                <dd className="mt-1.5 text-sm text-hielo">{lead.tarifa?.nombre ?? "—"}</dd>
              </div>
            </dl>
          </Bloque>

          {lead.motivo_perdida && (
            <Bloque titulo="Motivo de pérdida">
              <p className="px-4 py-3 text-sm text-niebla">{lead.motivo_perdida}</p>
            </Bloque>
          )}

          <Bloque titulo="Notas internas">
            <FormularioNotas id={lead.id} notas={lead.notas ?? ""} />
          </Bloque>
        </div>
      </div>
    </main>
  );
}

function Dato({
  icono: Icono,
  etiqueta,
  valor,
  href,
}: {
  icono: typeof Mail;
  etiqueta: string;
  valor: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icono className="size-4 shrink-0 text-niebla" strokeWidth={1.5} aria-hidden />
      <div className="min-w-0">
        <dt className="etiqueta text-[0.58rem]">{etiqueta}</dt>
        <dd className="mt-1 truncate text-sm text-hielo">
          {href ? (
            <a href={href} className="transition-colors hover:text-azul">
              {valor}
            </a>
          ) : (
            valor
          )}
        </dd>
      </div>
    </div>
  );
}
