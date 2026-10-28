"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePdf, Signature, Trash, UploadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { abrirNomina, borrarNomina, firmarNomina, subirNomina } from "@/app/crm/acciones/rrhh";
import { MESES, hoyMadrid, nombreEmpleado, periodoNomina, type EmpleadoMini, type Nomina } from "@/lib/rrhh";
import { CampoRrhh, ConfirmarBorrado, DialogoFormulario, MenuFila } from "./Comun";
import { claseBotonAccionRrhh, claseBotonSecundarioRrhh, claseEnlaceSeccion } from "./Piezas";

const select = `${claseCampo} appearance-none`;

/** Subida del PDF de una nómina (administración). Si el mes ya tiene una sin firmar, la sustituye. */
export function SubirNomina({ empleados, empleadoId, enlace = false }: { empleados: EmpleadoMini[]; empleadoId?: string; enlace?: boolean }) {
  const hoy = hoyMadrid();
  // Por defecto, el mes anterior (lo habitual al subir nóminas).
  const ref = new Date(`${hoy.slice(0, 7)}-01T12:00:00Z`);
  ref.setUTCMonth(ref.getUTCMonth() - 1);
  return (
    <DialogoFormulario
      disparador={
        enlace ? (
          <button type="button" className={claseEnlaceSeccion}>
            <UploadSimple className="size-3.5" weight="bold" aria-hidden /> Subir
          </button>
        ) : (
          <button type="button" className={claseBotonAccionRrhh}>
            <UploadSimple className="size-4" weight="bold" aria-hidden /> Subir nómina
          </button>
        )
      }
      titulo="Subir nómina"
      descripcion="PDF de hasta 10 MB. El empleado podrá verla y firmar su recepción."
      accion={subirNomina}
      textoEnviar="Subir nómina"
      textoPendiente="Subiendo…"
      ancho="sm:max-w-md"
    >
      {empleadoId ? (
        <input type="hidden" name="empleado_id" value={empleadoId} />
      ) : (
        <CampoRrhh etiqueta="Empleado">
          <select name="empleado_id" required defaultValue="" className={select}>
            <option value="" disabled>
              Elige a quién
            </option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {nombreEmpleado(e)}
              </option>
            ))}
          </select>
        </CampoRrhh>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoRrhh etiqueta="Mes">
          <select name="mes" defaultValue={ref.getUTCMonth() + 1} className={select}>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </CampoRrhh>
        <CampoRrhh etiqueta="Año">
          <input type="number" name="anio" min={2000} max={2100} required defaultValue={ref.getUTCFullYear()} className={claseCampo} />
        </CampoRrhh>
      </div>
      <CampoRrhh etiqueta="Archivo PDF">
        <input
          type="file"
          name="archivo"
          required
          accept="application/pdf,.pdf"
          className="block w-full text-sm text-tinta file:mr-3 file:h-9 file:rounded-md file:border file:border-linea file:bg-placa file:px-3 file:text-sm file:font-medium file:text-tinta hover:file:bg-placa-2"
        />
      </CampoRrhh>
    </DialogoFormulario>
  );
}

/** Abre el PDF en otra pestaña. Si es la propia nómina, queda registrado que se ha visto. */
export function AbrirNomina({ id, compacto = false }: { id: string; compacto?: boolean }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => {
        // La pestaña se abre ya, dentro del clic, para que el navegador no la bloquee.
        const ventana = window.open("", "_blank");
        empezar(async () => {
          const r = await abrirNomina(id);
          if (r.ok && r.url) {
            if (ventana) ventana.location.href = r.url;
            else window.location.assign(r.url);
            router.refresh();
          } else {
            ventana?.close();
            toast.error(r.mensaje);
          }
        });
      }}
      className={compacto ? claseEnlaceSeccion : claseBotonSecundarioRrhh}
    >
      <FilePdf className="size-4" aria-hidden />
      {pendiente ? "Abriendo…" : "Ver PDF"}
    </button>
  );
}

/** Firma (confirmación de recepción) de la propia nómina. Hay que haberla abierto antes. */
export function FirmarNomina({ nomina }: { nomina: Pick<Nomina, "id" | "mes" | "anio" | "archivo_nombre" | "hash_sha256" | "vista_at"> }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [conforme, setConforme] = useState(false);
  const [pendiente, empezar] = useTransition();
  const periodo = periodoNomina(nomina.mes, nomina.anio);
  const vista = !!nomina.vista_at;

  function firmar() {
    empezar(async () => {
      const r = await firmarNomina(nomina.id);
      if (r.ok) {
        toast.success(r.mensaje);
        setAbierto(false);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConforme(false);
          setAbierto(true);
        }}
        className={claseBotonAccionRrhh}
      >
        <Signature className="size-4" aria-hidden /> Firmar
      </button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Firmar la nómina de {periodo}</DialogTitle>
            <DialogDescription>Confirmas que la has recibido y leído. Se registra la fecha, tu usuario y la huella del documento.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-linea bg-placa-2/50 p-3">
              <FilePdf className="size-8 shrink-0 text-alarma-tinta" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-tinta">{nomina.archivo_nombre}</p>
                <p className="truncate font-mono text-[0.6875rem] text-tinta-2" title={`SHA-256 ${nomina.hash_sha256}`}>
                  SHA-256 {nomina.hash_sha256.slice(0, 16)}…
                </p>
              </div>
              <AbrirNomina id={nomina.id} compacto />
            </div>
            {!vista && <p className="text-[0.8125rem] text-tinta-2">Abre el PDF antes de firmarlo. Cuando lo hayas revisado, vuelve aquí.</p>}
            <label className={`flex items-start gap-2.5 text-sm ${vista ? "text-tinta" : "text-tinta-2"}`}>
              <input
                type="checkbox"
                checked={conforme}
                disabled={!vista}
                onChange={(e) => setConforme(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--acento)] disabled:cursor-not-allowed"
              />
              He recibido y leído mi nómina de {periodo}.
            </label>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-tinta-2 hover:bg-placa-2 hover:text-tinta"
            >
              Cancelar
            </button>
            <button type="button" onClick={firmar} disabled={!vista || !conforme || pendiente} className={claseBotonPrincipal}>
              <Signature className="size-4" aria-hidden />
              {pendiente ? "Firmando…" : "Firmar nómina"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Borrar una nómina aún sin firmar (administración). */
export function AccionesNomina({ nomina, nombre }: { nomina: Pick<Nomina, "id" | "mes" | "anio">; nombre: string }) {
  const [borrar, setBorrar] = useState(false);
  return (
    <>
      <MenuFila etiqueta="Acciones de la nómina" acciones={[{ texto: "Borrar", Icono: Trash, onSelect: () => setBorrar(true), peligro: true }]} />
      <ConfirmarBorrado
        abierto={borrar}
        onAbierto={setBorrar}
        titulo={`¿Borrar la nómina de ${periodoNomina(nomina.mes, nomina.anio)}?`}
        texto={`Se elimina el PDF de ${nombre}. Sólo se puede porque aún no está firmada.`}
        borrar={() => borrarNomina(nomina.id)}
      />
    </>
  );
}
