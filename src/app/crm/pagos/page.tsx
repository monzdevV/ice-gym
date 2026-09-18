import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Phone } from "lucide-react";
import { listarPagos, type PagoFila } from "@/lib/datos/pagos";
import { centroValido, listarCentros } from "@/lib/datos/comunes";
import { ESTADOS_PAGO, ETIQUETA_PAGO, type EstadoPago } from "@/lib/tipos";
import { dinero, dineroExacto, fecha, mesLargo, numero } from "@/lib/formato";
import { Bloque, Encabezado, SinDatos } from "@/components/crm/Primitivas";
import { FiltroCentro } from "@/components/crm/FiltroCentro";
import { CobrarRecibo } from "@/components/crm/socios/ControlesSocio";

export const metadata: Metadata = { title: "Pagos" };
export const dynamic = "force-dynamic";

export default async function PaginaPagos({
  searchParams,
}: {
  searchParams: Promise<{ centro?: string; estado?: string }>;
}) {
  const params = await searchParams;
  const centros = await listarCentros();
  const centro = centroValido(centros, params.centro);
  const estado = (ESTADOS_PAGO as readonly string[]).includes(params.estado ?? "")
    ? (params.estado as EstadoPago)
    : null;

  const { impagados, resto, totales } = await listarPagos({ centro, estado, meses: 3 });

  const enlaceEstado = (valor: string | null) => {
    const sp = new URLSearchParams();
    if (centro) sp.set("centro", centro);
    if (valor) sp.set("estado", valor);
    const q = sp.toString();
    return `/crm/pagos${q ? `?${q}` : ""}`;
  };

  return (
    <main>
      <Encabezado antetitulo="Últimos 3 meses" titulo="Pagos">
        <FiltroCentro centros={centros} />
      </Encabezado>

      {/* Totales: el impagado manda */}
      <div className="grid grid-cols-2 border-b border-acero md:grid-cols-4">
        <div className="relative col-span-2 border-b border-r border-acero bg-bengala/6 px-4 py-5 md:col-span-1 md:border-b-0 lg:px-6">
          <span className="absolute inset-y-0 left-0 w-[3px] bg-bengala" aria-hidden />
          <p className="etiqueta text-bengala">Impagado</p>
          <p className="cifra mt-3 text-[clamp(2.4rem,5vw,3.5rem)] text-bengala">{dinero(totales.impagado)}</p>
          <p className="mt-2 text-[0.72rem] text-hielo/80" data-cifra>
            {numero(totales.recibosImpagados)} recibos · {numero(totales.sociosConDeuda)} socios
          </p>
        </div>
        {[
          { k: "Pendiente", v: totales.pendiente, pie: "se cobra por domiciliación" },
          { k: "Cobrado", v: totales.cobrado, pie: "en el periodo" },
        ].map((d) => (
          <div key={d.k} className="border-b border-r border-acero px-4 py-5 md:border-b-0 lg:px-6">
            <p className="etiqueta">{d.k}</p>
            <p className="cifra mt-3 text-[clamp(2rem,4vw,2.75rem)] text-hielo">{dinero(d.v)}</p>
            <p className="mt-2 text-[0.72rem] text-niebla">{d.pie}</p>
          </div>
        ))}
        <nav className="flex flex-col justify-center gap-1 px-4 py-4 lg:px-6" aria-label="Filtrar por estado">
          {[{ v: null, t: "Todos" }, ...ESTADOS_PAGO.map((e) => ({ v: e, t: ETIQUETA_PAGO[e] }))].map((o) => {
            const activo = estado === o.v;
            return (
              <Link
                key={o.t}
                href={enlaceEstado(o.v)}
                className={`etiqueta flex items-center gap-2 py-1 text-[0.6rem] transition-colors ${
                  activo ? "text-azul" : "hover:text-hielo"
                }`}
              >
                <span className={`h-px w-3 ${activo ? "bg-azul" : "bg-acero"}`} aria-hidden />
                {o.t}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 p-4 lg:p-6">
        {/* Impagos: tarjetas de acción, no filas de una tabla */}
        {impagados.length > 0 && (
          <section aria-labelledby="titulo-impagos">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="size-4 text-bengala" strokeWidth={1.5} aria-hidden />
              <h2 id="titulo-impagos" className="etiqueta text-bengala">
                Por reclamar · {impagados.length}
              </h2>
            </div>
            <ul className="grid gap-px border border-bengala/30 bg-bengala/30 sm:grid-cols-2 xl:grid-cols-3">
              {impagados.map((p) => (
                <FilaImpago key={p.id} pago={p} />
              ))}
            </ul>
          </section>
        )}

        {/* Resto de recibos */}
        {(estado === null || estado !== "impagado") && (
          <Bloque titulo="Recibos" extra={<span className="text-[0.65rem] text-niebla">{resto.length}</span>}>
            {resto.length === 0 ? (
              <SinDatos titulo="Sin recibos" texto="No hay recibos con este filtro en los últimos tres meses." />
            ) : (
              <div className="scroll-fino max-h-[560px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-carbon">
                    <tr className="border-b border-acero">
                      {["Socio", "Periodo", "Concepto", "Importe", "Estado", ""].map((c, i) => (
                        <th key={i} scope="col" className="etiqueta px-4 py-2.5 text-[0.58rem] font-semibold">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resto.map((p) => (
                      <tr key={p.id} className="border-b border-acero/60 transition-colors hover:bg-grafito/40">
                        <td className="px-4 py-2.5">
                          {p.socio && (
                            <Link href={`/crm/socios/${p.socio.id}`} className="text-hielo hover:text-azul">
                              {p.socio.nombre} {p.socio.apellidos}
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-2.5 capitalize text-niebla">{mesLargo(p.periodo)}</td>
                        <td className="px-4 py-2.5 capitalize text-niebla">{p.concepto}</td>
                        <td className="px-4 py-2.5 text-hielo">{dineroExacto(p.importe)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`etiqueta text-[0.58rem] ${p.estado === "pendiente" ? "text-hielo" : ""}`}>
                            {ETIQUETA_PAGO[p.estado]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {p.estado === "pendiente" && p.socio && (
                            <CobrarRecibo pagoId={p.id} socioId={p.socio.id} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Bloque>
        )}

        {impagados.length === 0 && estado === "impagado" && (
          <div className="panel">
            <SinDatos titulo="Todo al día" texto="No hay ningún recibo impagado en los últimos tres meses." />
          </div>
        )}
      </div>
    </main>
  );
}

function FilaImpago({ pago }: { pago: PagoFila }) {
  const socio = pago.socio;
  return (
    <li className="flex flex-col justify-between gap-4 bg-carbon p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {socio && (
            <Link href={`/crm/socios/${socio.id}`} className="block truncate font-semibold text-hielo hover:text-azul">
              {socio.nombre} {socio.apellidos}
            </Link>
          )}
          <p className="mt-0.5 font-mono text-[0.7rem] text-niebla">{socio?.numero_socio}</p>
        </div>
        <p className="cifra shrink-0 text-2xl text-bengala">{dineroExacto(pago.importe)}</p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-acero pt-3">
        <p className="text-xs capitalize text-niebla">
          {pago.concepto} · {mesLargo(pago.periodo)}
          <span className="block normal-case text-niebla/70">emitido el {fecha(pago.fecha_emision)}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {socio?.telefono && (
            <a
              href={`tel:${socio.telefono.replace(/\s/g, "")}`}
              className="grid size-7 place-items-center border border-acero text-niebla transition-colors hover:border-azul hover:text-azul"
              aria-label={`Llamar a ${socio.nombre}`}
            >
              <Phone className="size-3.5" strokeWidth={1.5} />
            </a>
          )}
          {socio && <CobrarRecibo pagoId={pago.id} socioId={socio.id} />}
        </div>
      </div>
    </li>
  );
}
