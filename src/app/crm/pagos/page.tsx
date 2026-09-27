import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "@phosphor-icons/react/dist/ssr";
import { listarPagos, type PagoFila } from "@/lib/datos/pagos";
import { centroValido, listarCentros } from "@/lib/datos/comunes";
import { ESTADOS_PAGO, ETIQUETA_PAGO, type EstadoPago } from "@/lib/tipos";
import { dinero, dineroExacto, mesLargo, numero } from "@/lib/formato";
import { Encabezado, Seccion, SinDatos } from "@/components/crm/Primitivas";
import { FiltroCentro } from "@/components/crm/FiltroCentro";
import { CobrarRecibo } from "@/components/crm/socios/ControlesSocio";

export const metadata: Metadata = { title: "Pagos" };
export const dynamic = "force-dynamic";

const POR_PAGINA = 80;

export default async function PaginaPagos({
  searchParams,
}: {
  searchParams: Promise<{ centro?: string; estado?: string; todos?: string }>;
}) {
  const params = await searchParams;
  const centros = await listarCentros();
  const centro = centroValido(centros, params.centro);
  const estado = (ESTADOS_PAGO as readonly string[]).includes(params.estado ?? "") ? (params.estado as EstadoPago) : null;

  const { impagados, resto, totales } = await listarPagos({ centro, estado, meses: 3 });

  // Se pintan los primeros recibos; el resto, solo si se piden (cientos de filas frenan la página).
  const mostrados = params.todos ? resto : resto.slice(0, POR_PAGINA);

  const enlaceEstado = (valor: string | null, todos = false) => {
    const sp = new URLSearchParams();
    if (centro) sp.set("centro", centro);
    if (valor) sp.set("estado", valor);
    if (todos) sp.set("todos", "1");
    const q = sp.toString();
    return `/crm/pagos${q ? `?${q}` : ""}`;
  };

  return (
    <main className="pb-12">
      <Encabezado titulo="Pagos" meta="Últimos tres meses">
        <FiltroCentro centros={centros} />
      </Encabezado>

      {/* Marcador: el impagado manda y es el único bloque rojo de la pantalla */}
      <div className="mb-10 grid grid-cols-1 gap-[3px] px-4 sm:grid-cols-3 lg:px-8">
        <div className="bg-alarma px-4 pb-4 pt-5 text-sobre-campo">
          <p className="cifra text-[clamp(2.4rem,4vw,3.4rem)]">{dinero(totales.impagado)}</p>
          <p className="condensada mt-2.5 text-[0.95rem]">Impagado</p>
          <p className="mt-0.5 text-[0.82rem]" data-cifra>
            {numero(totales.recibosImpagados)} recibos de {numero(totales.sociosConDeuda)} socios
          </p>
        </div>
        {[
          { k: "Pendiente", v: totales.pendiente, pie: "se cobra por domiciliación" },
          { k: "Cobrado", v: totales.cobrado, pie: "en los tres meses" },
        ].map((d) => (
          <div key={d.k} className="bg-placa px-4 pb-4 pt-5">
            <p className="cifra text-[clamp(2.4rem,4vw,3.4rem)] text-tinta">{dinero(d.v)}</p>
            <p className="condensada mt-2.5 text-[0.95rem] text-tinta">{d.k}</p>
            <p className="mt-0.5 text-[0.82rem] text-tinta-2">{d.pie}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-10 px-4 lg:px-8">
        {impagados.length > 0 && (
          <Seccion titulo="Por reclamar" extra={<span className="cifra text-[1.2rem] text-tinta">{impagados.length}</span>}>
            <ol className="mt-[3px] flex flex-col gap-[3px]">
              {impagados.map((p) => (
                <FilaImpago key={p.id} pago={p} />
              ))}
            </ol>
          </Seccion>
        )}

        <Seccion
          titulo="Recibos"
          extra={
            <nav aria-label="Filtrar por estado" className="flex flex-wrap items-baseline gap-4">
              {[{ v: null, t: "Todos" }, ...ESTADOS_PAGO.map((e) => ({ v: e, t: ETIQUETA_PAGO[e] }))].map((o) => (
                <Link
                  key={o.t}
                  href={enlaceEstado(o.v)}
                  aria-current={estado === o.v ? "page" : undefined}
                  className={`condensada text-[0.85rem] underline-offset-4 ${
                    estado === o.v ? "text-tinta underline decoration-2" : "text-tinta-2 hover:text-tinta"
                  }`}
                >
                  {o.t}
                </Link>
              ))}
            </nav>
          }
        >
          {estado === "impagado" ? (
            impagados.length === 0 ? (
              <SinDatos titulo="Todo al día" texto="Ningún recibo impagado en los últimos tres meses." />
            ) : (
              <p className="pt-4 text-sm text-tinta-2">Los impagados están arriba, en Por reclamar.</p>
            )
          ) : resto.length === 0 ? (
            <SinDatos titulo="Sin recibos" texto="No hay recibos con este filtro en los últimos tres meses." />
          ) : (
            <ol className="flex flex-col">
              {mostrados.map((p) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_7rem] items-center gap-x-4 border-b border-linea py-2.5 sm:grid-cols-[minmax(0,1fr)_10rem_auto_7rem]"
                >
                  <span className="min-w-0">
                    {p.socio && (
                      <Link href={`/crm/socios/${p.socio.id}`} className="condensada block truncate text-[0.98rem] text-tinta hover:underline">
                        {p.socio.nombre} {p.socio.apellidos}
                      </Link>
                    )}
                    <span className="block text-[0.8rem] capitalize text-tinta-2 sm:hidden">
                      {p.concepto} · {mesLargo(p.periodo)}
                    </span>
                  </span>
                  <span className="hidden text-[0.88rem] capitalize text-tinta-2 sm:block">
                    {p.concepto} · {mesLargo(p.periodo)}
                  </span>
                  <span className="cifra text-right text-[1.2rem] text-tinta">{dineroExacto(p.importe)}</span>
                  <span className="flex justify-end">
                    {p.estado === "pendiente" && p.socio ? (
                      <CobrarRecibo pagoId={p.id} socioId={p.socio.id} />
                    ) : (
                      <span className="condensada text-[0.85rem] text-tinta-2">{ETIQUETA_PAGO[p.estado]}</span>
                    )}
                  </span>
                </li>
              ))}
              {mostrados.length < resto.length && (
                <li className="flex justify-center pt-4">
                  <Link
                    href={enlaceEstado(estado, true)}
                    scroll={false}
                    className="inline-flex h-8 items-center rounded-md border border-linea bg-placa px-3 text-[0.8125rem] font-medium text-tinta-2 hover:bg-placa-2 hover:text-tinta"
                  >
                    Ver los {numero(resto.length - mostrados.length)} recibos restantes
                  </Link>
                </li>
              )}
            </ol>
          )}
        </Seccion>
      </div>
    </main>
  );
}

/** Un impago como fila de penalización: placa roja, importe, y llamar o cobrar al lado. */
function FilaImpago({ pago }: { pago: PagoFila }) {
  const socio = pago.socio;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 bg-placa py-2 pr-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto_auto]">
      <span className="corte-d rotulo hidden h-full items-center bg-alarma pl-3 pr-6 text-[0.95rem] text-sobre-campo sm:flex">
        Impago
      </span>
      <span className="min-w-0 pl-3 sm:pl-0">
        {socio && (
          <Link href={`/crm/socios/${socio.id}`} className="condensada block truncate text-[1.02rem] text-tinta hover:underline">
            {socio.nombre} {socio.apellidos}
          </Link>
        )}
        <span className="block text-[0.8rem] capitalize text-tinta-2">
          {socio?.numero_socio} · {pago.concepto} de {mesLargo(pago.periodo)}
        </span>
      </span>
      <span className="cifra pl-3 text-[1.4rem] text-alarma-tinta sm:pl-0">{dineroExacto(pago.importe)}</span>
      <span className="flex items-center justify-end gap-4">
        {socio?.telefono && (
          <a
            href={`tel:${socio.telefono.replace(/\s/g, "")}`}
            className="condensada flex items-center gap-1.5 text-[0.85rem] text-tinta-2 hover:text-tinta"
          >
            <Phone className="size-4" weight="light" aria-hidden />
            Llamar
          </a>
        )}
        {socio && <CobrarRecibo pagoId={pago.id} socioId={socio.id} />}
      </span>
    </li>
  );
}
