import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { obtenerSocio } from "@/lib/datos/socios";
import { codigoCentro } from "@/design/tokens";
import { ETIQUETA_PAGO } from "@/lib/tipos";
import { dineroExacto, fecha, fechaHora, mesLargo, numero, relativo } from "@/lib/formato";
import { Dorsal, EstadoSocioMarca, Seccion, SinDatos } from "@/components/crm/Primitivas";
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
  const ultimo = accesos[0]?.entrada ?? null;

  const cifras = [
    { k: "Cuota", v: dineroExacto(socio.tarifa?.cuota_mensual ?? 0), pie: `${socio.tarifa?.nombre ?? ""} · al mes` },
    { k: "Visitas", v: numero(visitas30), pie: "últimos 30 días" },
    { k: "Última visita", v: ultimo ? relativo(ultimo) : "Nunca", pie: ultimo ? fechaHora(ultimo) : "sin accesos" },
  ];

  return (
    <main className="pb-12">
      <div className="px-4 pt-6 lg:px-8">
        <Link href="/crm/socios" className="condensada inline-flex items-center gap-1.5 text-[0.85rem] text-tinta-2 hover:text-tinta">
          <ArrowLeft className="size-4" weight="light" aria-hidden />
          Socios
        </Link>
      </div>

      <header className="flex flex-col gap-4 px-4 pb-6 pt-4 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Dorsal numero={socio.numero_socio} estado={socio.estado} grande />
          <h1 className="rotulo text-[clamp(2rem,4.2vw,3.3rem)] text-tinta">
            {socio.nombre} {socio.apellidos}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <EstadoSocioMarca estado={socio.estado} />
          <p className="text-[0.92rem] text-tinta-2">
            {socio.numero_socio} · {codigoCentro(socio.centro?.nombre)} {socio.centro?.nombre.replace("Ice Gym ", "")} · socio
            desde {fecha(socio.fecha_alta)}
            {socio.fecha_baja && ` · baja el ${fecha(socio.fecha_baja)}`}
          </p>
          <div className="md:ml-auto">
            <AccionesSocio id={socio.id} estado={socio.estado} />
          </div>
        </div>
      </header>

      {/* Deuda: placa de penalización, lo primero que ve recepción */}
      {impagados.length > 0 && (
        <div className="mx-4 mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 bg-alarma py-3 pl-4 pr-6 text-sobre-campo lg:mx-8" role="alert">
          <span className="rotulo text-[1.4rem]">Debe {dineroExacto(deuda)}</span>
          <span className="condensada text-[0.95rem]">
            {impagados.length} {impagados.length === 1 ? "recibo impagado" : "recibos impagados"} · se cobran en la lista de pagos de abajo
          </span>
        </div>
      )}

      <div className="mb-10 grid grid-cols-1 gap-[3px] px-4 sm:grid-cols-3 lg:px-8">
        {cifras.map((c) => (
          <div key={c.k} className="bg-placa px-4 pb-4 pt-5">
            <p className="cifra text-[2.2rem] text-tinta first-letter:uppercase">{c.v}</p>
            <p className="condensada mt-2.5 text-[0.95rem] text-tinta">{c.k}</p>
            <p className="mt-0.5 text-[0.8rem] text-tinta-2" data-cifra>
              {c.pie}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-x-10 gap-y-10 px-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="flex min-w-0 flex-col gap-10">
          <Seccion titulo="Pagos" extra={<span className="dato">{pagos.length} recibos</span>}>
            {pagos.length === 0 ? (
              <SinDatos titulo="Sin recibos" texto="Todavía no se ha emitido ninguna cuota para este socio." />
            ) : (
              <ol className="flex flex-col">
                {pagos.map((p) => {
                  const impagado = p.estado === "impagado";
                  return (
                    <li
                      key={p.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 border-b border-linea py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="condensada block text-[0.95rem] capitalize text-tinta">{mesLargo(p.periodo)}</span>
                        <span className="block text-[0.8rem] capitalize text-tinta-2">
                          {p.concepto}
                          {p.fecha_pago && ` · cobrado el ${fecha(p.fecha_pago)}`}
                        </span>
                      </span>
                      <span className={`cifra text-[1.2rem] ${impagado ? "text-alarma-tinta" : "text-tinta"}`}>
                        {dineroExacto(p.importe)}
                      </span>
                      <span className="flex min-w-[6.5rem] justify-end">
                        {impagado ? (
                          <span className="flex items-center gap-2">
                            <span className="corte-d condensada bg-alarma py-1 pl-2 pr-4 text-[0.78rem] text-sobre-campo">
                              Impagado
                            </span>
                            <CobrarRecibo pagoId={p.id} socioId={socio.id} />
                          </span>
                        ) : p.estado === "pendiente" ? (
                          <CobrarRecibo pagoId={p.id} socioId={socio.id} />
                        ) : (
                          <span className="condensada text-[0.85rem] text-tinta-2">{ETIQUETA_PAGO[p.estado]}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Seccion>

          <Seccion titulo="Seguimiento" extra={<span className="cifra text-[1.2rem] text-tinta">{actividades.length}</span>}>
            <FormularioActividad socioId={socio.id} />
            <Historial actividades={actividades} />
          </Seccion>
        </div>

        <div className="flex flex-col gap-10">
          <Seccion titulo="Contacto">
            <dl className="flex flex-col">
              {[
                { k: "Email", v: socio.email, href: `mailto:${socio.email}` },
                {
                  k: "Teléfono",
                  v: socio.telefono ?? "Sin teléfono",
                  href: socio.telefono ? `tel:${socio.telefono.replace(/\s/g, "")}` : undefined,
                },
                { k: "Nacimiento", v: fecha(socio.fecha_nacimiento) },
              ].map((d) => (
                <div key={d.k} className="grid grid-cols-[6rem_1fr] items-baseline gap-3 border-b border-linea py-2.5">
                  <dt className="dato">{d.k}</dt>
                  <dd className="truncate text-[0.95rem] text-tinta" data-cifra>
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
          </Seccion>

          <Seccion titulo="Accesos" extra={<span className="dato">Torno</span>}>
            {accesos.length === 0 ? (
              <SinDatos titulo="Sin visitas" texto="Todavía no ha pasado por el torno." />
            ) : (
              <ol className="flex flex-col">
                {accesos.map((a) => (
                  <li key={a.id} className="grid grid-cols-[1fr_auto] items-baseline border-b border-linea py-2">
                    <span className="text-[0.92rem] text-tinta" data-cifra>
                      {fechaHora(a.entrada)}
                    </span>
                    {a.salida === null ? (
                      <span className="corte-d condensada bg-acento py-0.5 pl-2 pr-4 text-[0.75rem] text-sobre-campo">Dentro</span>
                    ) : (
                      <span className="condensada text-[0.85rem] text-tinta-2">{codigoCentro(a.centro?.nombre)}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Seccion>

          <Seccion titulo="Notas">
            <NotasSocio id={socio.id} notas={socio.notas ?? ""} />
          </Seccion>
        </div>
      </div>
    </main>
  );
}
