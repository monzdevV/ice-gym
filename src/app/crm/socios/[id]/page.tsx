import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Mail, Phone } from "lucide-react";
import { obtenerSocio } from "@/lib/datos/socios";
import { COLOR_SOCIO, ETIQUETA_PAGO, ETIQUETA_SOCIO } from "@/lib/tipos";
import { dineroExacto, fecha, fechaHora, mesLargo, numero, relativo } from "@/lib/formato";
import { Bloque, Pildora, SinDatos } from "@/components/crm/Primitivas";
import { Historial } from "@/components/crm/Historial";
import { FormularioActividad } from "@/components/crm/FormularioActividad";
import { AccionesSocio, CobrarRecibo, NotasSocio } from "@/components/crm/socios/ControlesSocio";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { socio } = await obtenerSocio(id);
  return { title: socio ? `${socio.nombre} ${socio.apellidos}` : "Socio" };
}

export default async function PaginaSocio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { socio, pagos, accesos, visitas30, actividades } = await obtenerSocio(id);

  if (!socio) notFound();

  const impagados = pagos.filter((p) => p.estado === "impagado");
  const deuda = impagados.reduce((s, p) => s + Number(p.importe), 0);
  const ultimoAcceso = accesos[0]?.entrada ?? null;

  return (
    <main>
      <header className="border-b border-acero px-4 py-5 lg:px-6">
        <Link
          href="/crm/socios"
          className="etiqueta inline-flex items-center gap-1.5 text-[0.6rem] transition-colors hover:text-azul"
        >
          <ArrowLeft className="size-3" strokeWidth={1.5} aria-hidden />
          Socios
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-niebla">{socio.numero_socio}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="titular text-[clamp(1.9rem,4vw,2.75rem)] text-hielo">
                {socio.nombre} {socio.apellidos}
              </h1>
              <Pildora texto={ETIQUETA_SOCIO[socio.estado]} color={COLOR_SOCIO[socio.estado]} />
            </div>
            <p className="mt-2 text-sm text-niebla">
              {socio.tarifa?.nombre} en {socio.centro?.nombre} · socio desde {fecha(socio.fecha_alta)}
              {socio.fecha_baja && ` · baja el ${fecha(socio.fecha_baja)}`}
            </p>
          </div>
          <AccionesSocio id={socio.id} estado={socio.estado} />
        </div>
      </header>

      {/* Aviso de deuda: lo primero que tiene que ver recepción */}
      {impagados.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-bengala/40 bg-bengala/8 px-4 py-3 lg:px-6" role="alert">
          <AlertTriangle className="size-5 shrink-0 text-bengala" strokeWidth={1.5} aria-hidden />
          <p className="text-sm text-hielo">
            <strong className="font-semibold text-bengala">
              {impagados.length} {impagados.length === 1 ? "recibo impagado" : "recibos impagados"}
            </strong>{" "}
            por un total de <span data-cifra>{dineroExacto(deuda)}</span>.
          </p>
        </div>
      )}

      {/* Rail de datos */}
      <dl className="grid grid-cols-2 border-b border-acero md:grid-cols-4">
        {[
          { k: "Cuota", v: dineroExacto(socio.tarifa?.cuota_mensual ?? 0), pie: "al mes" },
          { k: "Visitas", v: numero(visitas30), pie: "últimos 30 días" },
          { k: "Última visita", v: ultimoAcceso ? relativo(ultimoAcceso) : "—", pie: ultimoAcceso ? fechaHora(ultimoAcceso) : "nunca" },
          { k: "Deuda", v: dineroExacto(deuda), pie: deuda > 0 ? "pendiente de cobro" : "al corriente", alarma: deuda > 0 },
        ].map((d) => (
          <div key={d.k} className="border-b border-r border-acero px-4 py-4 last:border-r-0 md:border-b-0 lg:px-6">
            <dt className="etiqueta">{d.k}</dt>
            <dd className={`cifra mt-3 text-[1.9rem] ${d.alarma ? "text-bengala" : "text-hielo"}`}>{d.v}</dd>
            <dd className="mt-1.5 text-[0.7rem] text-niebla">{d.pie}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-6">
        <div className="space-y-4">
          {/* Pagos */}
          <Bloque titulo="Pagos" extra={<span className="text-[0.65rem] text-niebla">{pagos.length} recibos</span>}>
            {pagos.length === 0 ? (
              <SinDatos titulo="Sin recibos" texto="Todavía no se ha emitido ninguna cuota para este socio." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-acero">
                      {["Periodo", "Concepto", "Importe", "Estado", ""].map((c, i) => (
                        <th key={i} scope="col" className="etiqueta px-4 py-2.5 text-[0.58rem] font-semibold">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((p) => {
                      const impagado = p.estado === "impagado";
                      return (
                        <tr
                          key={p.id}
                          className={`border-b border-acero/60 last:border-b-0 ${impagado ? "bg-bengala/6" : ""}`}
                        >
                          <td className={`px-4 py-2.5 capitalize ${impagado ? "text-hielo" : "text-niebla"}`}>
                            {impagado && <span className="mr-2 inline-block h-3 w-[2px] translate-y-0.5 bg-bengala" aria-hidden />}
                            {mesLargo(p.periodo)}
                          </td>
                          <td className="px-4 py-2.5 capitalize text-niebla">{p.concepto}</td>
                          <td className="px-4 py-2.5 text-hielo">{dineroExacto(p.importe)}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`etiqueta text-[0.58rem] ${
                                impagado ? "text-bengala" : p.estado === "pendiente" ? "text-hielo" : "text-niebla"
                              }`}
                            >
                              {ETIQUETA_PAGO[p.estado]}
                              {p.fecha_pago && <span className="ml-1.5 normal-case tracking-normal text-niebla/70">{fecha(p.fecha_pago)}</span>}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {p.estado !== "pagado" && <CobrarRecibo pagoId={p.id} socioId={socio.id} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Bloque>

          {/* Historial */}
          <Bloque titulo="Historial" extra={<span className="cifra text-base text-hielo">{actividades.length}</span>}>
            <FormularioActividad socioId={socio.id} />
            <Historial actividades={actividades} />
          </Bloque>
        </div>

        <div className="space-y-4">
          <Bloque titulo="Contacto">
            <dl className="divide-y divide-acero">
              <div className="flex items-center gap-3 px-4 py-3">
                <Mail className="size-4 shrink-0 text-niebla" strokeWidth={1.5} aria-hidden />
                <div className="min-w-0">
                  <dt className="etiqueta text-[0.58rem]">Email</dt>
                  <dd className="mt-1 truncate text-sm">
                    <a href={`mailto:${socio.email}`} className="text-hielo hover:text-azul">{socio.email}</a>
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <Phone className="size-4 shrink-0 text-niebla" strokeWidth={1.5} aria-hidden />
                <div className="min-w-0">
                  <dt className="etiqueta text-[0.58rem]">Teléfono</dt>
                  <dd className="mt-1 text-sm" data-cifra>
                    {socio.telefono ? (
                      <a href={`tel:${socio.telefono.replace(/\s/g, "")}`} className="text-hielo hover:text-azul">{socio.telefono}</a>
                    ) : "—"}
                  </dd>
                </div>
              </div>
            </dl>
          </Bloque>

          <Bloque titulo="Últimos accesos">
            {accesos.length === 0 ? (
              <SinDatos titulo="Sin visitas" texto="Este socio aún no ha pasado por el torno." />
            ) : (
              <ul className="divide-y divide-acero/70">
                {accesos.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="text-hielo" data-cifra>{fechaHora(a.entrada)}</span>
                    <span className="truncate text-xs text-niebla">
                      {a.salida === null ? (
                        <span className="etiqueta text-[0.55rem] text-azul">Dentro ahora</span>
                      ) : (
                        a.centro?.nombre.replace("Ice Gym ", "")
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Bloque>

          <Bloque titulo="Notas">
            <NotasSocio id={socio.id} notas={socio.notas ?? ""} />
          </Bloque>
        </div>
      </div>
    </main>
  );
}
