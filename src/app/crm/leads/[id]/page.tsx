import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  ChatCircle,
  EnvelopeSimple,
  NotePencil,
  Phone,
} from "@phosphor-icons/react/dist/ssr";
import { etiquetasUsadas, obtenerLead } from "@/lib/datos/leads";
import { listarCentros, listarTarifas } from "@/lib/datos/comunes";
import { createClient } from "@/lib/supabase/server";
import { accionVencida, diasParado, probabilidadDe, puntuacion, valorDe, valorPonderado } from "@/lib/oportunidad";
import { ETIQUETA_ORIGEN, TONO_ORIGEN, esAbierto } from "@/lib/tipos";
import { dinero, fecha, fechaHora, relativo } from "@/lib/formato";
import { Seccion } from "@/components/crm/Primitivas";
import { Historial } from "@/components/crm/Historial";
import { FormularioActividad } from "@/components/crm/FormularioActividad";
import {
  BotonPerdido,
  EditorEtiquetas,
  EditorOportunidad,
  EditorProximaAccion,
  FormularioNotas,
  PanelConvertir,
  SelectorEstado,
} from "@/components/crm/leads/ControlesLead";
import { BarraProbabilidad, MarcaNivel, Tag, TagEtapa } from "@/components/crm/leads/Piezas";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { lead } = await obtenerLead(id);
  return { title: lead?.nombre ?? "Lead" };
}

const botonRapido =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-linea bg-placa px-3 text-[0.8125rem] font-medium text-tinta transition-colors hover:bg-placa-2";

export default async function PaginaLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ lead, actividades, socio, resumen }, centros, tarifas, todas] = await Promise.all([
    obtenerLead(id),
    listarCentros(),
    listarTarifas(),
    supabase.from("leads").select("etiquetas").returns<{ etiquetas: string[] }[]>(),
  ]);

  if (!lead) notFound();

  const punt = puntuacion(lead, resumen);
  const abierto = esAbierto(lead.estado);
  const parado = diasParado(lead, resumen);
  const telefono = lead.telefono?.replace(/\s/g, "");
  const whatsapp = telefono ? `https://wa.me/${telefono.replace(/^\+/, "").replace(/^(?!34)(\d{9})$/, "34$1")}` : null;

  const datos = [
    { k: "Email", v: lead.email, href: `mailto:${lead.email}` },
    { k: "Teléfono", v: lead.telefono ?? "Sin teléfono", href: telefono ? `tel:${telefono}` : undefined },
    { k: "Centro", v: lead.centro?.nombre.replace(/^Ice Gym\s+/i, "") ?? "Sin elegir" },
    { k: "Tarifa", v: lead.tarifa ? `${lead.tarifa.nombre} · ${dinero(lead.tarifa.cuota_mensual)}/mes` : "Sin elegir" },
    { k: "Visita", v: lead.fecha_visita ? fechaHora(lead.fecha_visita) : "Sin agendar" },
    { k: "Origen", v: ETIQUETA_ORIGEN[lead.origen] },
    { k: "Llegó", v: `${fecha(lead.created_at)} (${relativo(lead.created_at)})` },
  ];

  return (
    <main className="px-4 pb-12 pt-5 lg:px-8">
      <Link href="/crm/leads" className="inline-flex items-center gap-1.5 text-[0.8125rem] text-tinta-2 hover:text-tinta">
        <ArrowLeft className="size-4" aria-hidden />
        Oportunidades
      </Link>

      {/* Cabecera */}
      <header className="mt-3 flex flex-col gap-4 border-b border-linea pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-placa-2 text-base font-semibold uppercase text-tinta">
              {lead.nombre
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-tinta">{lead.nombre}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <TagEtapa estado={lead.estado} />
                <Tag tono={TONO_ORIGEN[lead.origen]}>{ETIQUETA_ORIGEN[lead.origen]}</Tag>
                {lead.etiquetas.map((e) => (
                  <Tag key={e}>{e}</Tag>
                ))}
                <MarcaNivel p={punt} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {telefono && (
              <a href={`tel:${telefono}`} className={botonRapido}>
                <Phone className="size-4" aria-hidden /> Llamar
              </a>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={botonRapido}>
                <ChatCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            )}
            <a href={`mailto:${lead.email}`} className={botonRapido}>
              <EnvelopeSimple className="size-4" aria-hidden /> Email
            </a>
            <a href="#descripcion" className={botonRapido}>
              <NotePencil className="size-4" aria-hidden /> Registrar
            </a>
            {abierto && <BotonPerdido id={lead.id} estado={lead.estado} />}
          </div>
        </div>

        <SelectorEstado id={lead.id} actual={lead.estado} />
      </header>

      {/* Cifras clave */}
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { k: "Valor anual", v: dinero(valorDe(lead)) },
          { k: "Ponderado", v: dinero(valorPonderado(lead)) },
          { k: "Probabilidad", v: <BarraProbabilidad valor={probabilidadDe(lead)} /> },
          { k: "Sin movimiento", v: parado === 0 ? "Hoy" : `${parado} día${parado === 1 ? "" : "s"}` },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-linea bg-placa px-4 py-3">
            <dt className="text-[0.8125rem] text-tinta-2">{c.k}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-tinta">{c.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {punt && (
            <section
              className={`rounded-xl border px-4 py-3.5 ${
                punt.nivel === "riesgo" ? "border-critico/40 bg-critico/[0.06]" : "border-linea bg-placa"
              }`}
              aria-labelledby="por-que"
            >
              <h2 id="por-que" className="text-sm font-semibold text-tinta">
                Por qué está así
              </h2>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-tinta-2">
                {punt.motivos.map((m) => (
                  <li key={m} className="flex gap-2">
                    <span aria-hidden>·</span>
                    {m}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {lead.mensaje && (
            <Seccion titulo="Lo que nos escribió">
              <blockquote className="text-[0.95rem] leading-relaxed text-tinta">“{lead.mensaje}”</blockquote>
            </Seccion>
          )}

          <Seccion titulo="Seguimiento" extra={<span className="text-sm tabular-nums text-tinta-2">{actividades.length}</span>}>
            <FormularioActividad leadId={lead.id} />
            <Historial actividades={actividades} />
          </Seccion>
        </div>

        <div className="flex flex-col gap-5">
          {abierto && (
            <Seccion
              titulo="Próxima acción"
              extra={
                accionVencida(lead) ? <span className="text-xs font-medium text-critico">Vencida</span> : undefined
              }
            >
              <EditorProximaAccion id={lead.id} texto={lead.proxima_accion} fecha={lead.proxima_accion_fecha} />
            </Seccion>
          )}

          {socio ? (
            <Link
              href={`/crm/socios/${socio.id}`}
              className="group flex items-center justify-between rounded-xl border border-exito/40 bg-exito/10 px-4 py-3.5"
            >
              <span>
                <span className="block text-[0.8125rem] text-tinta-2">Ya es socio · {socio.numero_socio}</span>
                <span className="mt-0.5 block font-semibold text-tinta">
                  {socio.nombre} {socio.apellidos}
                </span>
              </span>
              <ArrowUpRight className="size-5 text-tinta transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ) : (
            lead.estado !== "perdido" && (
              <Seccion titulo="Convertir en socio">
                <PanelConvertir
                  leadId={lead.id}
                  centros={centros}
                  tarifas={tarifas}
                  centroSugerido={lead.centro_id}
                  tarifaSugerida={lead.tarifa_interes_id}
                />
              </Seccion>
            )
          )}

          <Seccion titulo="Oportunidad">
            <EditorOportunidad
              id={lead.id}
              estado={lead.estado}
              valorEstimado={lead.valor_estimado}
              valorTarifa={Number(lead.tarifa?.cuota_mensual ?? 0) * 12}
              probabilidad={lead.probabilidad}
            />
          </Seccion>

          <Seccion titulo="Contacto">
            <dl className="flex flex-col">
              {datos.map((d) => (
                <div key={d.k} className="grid grid-cols-[5.5rem_1fr] items-baseline gap-3 border-b border-linea py-2 last:border-0">
                  <dt className="text-[0.8125rem] text-tinta-2">{d.k}</dt>
                  <dd className="truncate text-sm text-tinta">
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
              <p className="mt-3 text-sm text-tinta-2">
                <span className="font-medium text-tinta">Motivo de pérdida:</span> {lead.motivo_perdida}
              </p>
            )}
          </Seccion>

          <Seccion titulo="Etiquetas">
            <EditorEtiquetas id={lead.id} etiquetas={lead.etiquetas} sugeridas={etiquetasUsadas(todas.data ?? [])} />
          </Seccion>

          <Seccion titulo="Notas internas">
            <FormularioNotas id={lead.id} notas={lead.notas ?? ""} />
          </Seccion>
        </div>
      </div>
    </main>
  );
}
