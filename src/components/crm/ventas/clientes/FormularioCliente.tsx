"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Buildings, User, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { guardarClienteVentas } from "@/app/crm/acciones/ventas";
import { nombreCompleto, type Miembro } from "@/lib/b2b";
import type { ClienteMini, ClienteVentas } from "@/lib/ventas";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { Campo, claseSecundario } from "@/components/crm/ventas/configuracion/Comun";

/** Etiquetas de texto libre: Intro o coma añade, la X quita. */
function CampoEtiquetas({ valor, onCambio }: { valor: string[]; onCambio: (v: string[]) => void }) {
  const [texto, setTexto] = useState("");
  function anadir() {
    const t = texto.trim().replace(/,$/, "");
    if (t && !valor.some((v) => v.toLowerCase() === t.toLowerCase())) onCambio([...valor, t.slice(0, 40)]);
    setTexto("");
  }
  return (
    <div className={`${claseCampo} flex h-auto min-h-9 flex-wrap items-center gap-1.5 py-1.5`}>
      {valor.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-md bg-placa-2 py-0.5 pl-2 pr-1 text-xs text-tinta">
          {v}
          <button type="button" onClick={() => onCambio(valor.filter((x) => x !== v))} className="grid size-6 place-items-center rounded text-tinta-2 hover:bg-placa hover:text-tinta" aria-label={`Quitar la etiqueta ${v}`}>
            <X className="size-3" weight="bold" aria-hidden />
          </button>
        </span>
      ))}
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            anadir();
          } else if (e.key === "Backspace" && !texto && valor.length) onCambio(valor.slice(0, -1));
        }}
        onBlur={anadir}
        placeholder={valor.length ? "" : "VIP, Renovación… (Intro para añadir)"}
        aria-label="Etiquetas"
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-tinta-2"
      />
    </div>
  );
}

/**
 * Datos de un cliente: persona (con su empresa y puesto) o empresa. Sirve para
 * el alta (en diálogo) y para la ficha.
 */
export function FormularioCliente({
  cliente,
  empresas,
  comerciales,
  onGuardado,
  onCancelar,
  empresaInicial,
  empresaActual = null,
}: {
  cliente: ClienteVentas | null;
  /** Su empresa ahora, aunque esté archivada: si no estuviera entre las opciones, guardar la desvincularía. */
  empresaActual?: { id: string; nombre: string } | null;
  /** Clientes empresa, para elegir la empresa de una persona. */
  empresas: ClienteMini[];
  comerciales: Miembro[];
  onGuardado?: (id: string) => void;
  onCancelar?: () => void;
  /** Alta de una persona dentro de una empresa. */
  empresaInicial?: string;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [esEmpresa, setEsEmpresa] = useState(cliente?.es_empresa ?? false);
  const [etiquetas, setEtiquetas] = useState<string[]>(cliente?.etiquetas ?? []);
  const empresasElegibles: { id: string; nombre: string }[] = empresas.filter((e) => e.es_empresa && e.id !== cliente?.id);
  if (empresaActual && !empresasElegibles.some((e) => e.id === empresaActual.id)) empresasElegibles.unshift(empresaActual);

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const t = (k: string) => String(fd.get(k) ?? "");
    empezar(async () => {
      const r = await guardarClienteVentas({
        id: cliente?.id,
        nombre: t("nombre"),
        es_empresa: esEmpresa,
        empresa_id: t("empresa_id") || null,
        puesto: t("puesto"),
        email: t("email"),
        telefono: t("telefono"),
        movil: t("movil"),
        web: t("web"),
        nif: t("nif"),
        direccion: t("direccion"),
        ciudad: t("ciudad"),
        codigo_postal: t("codigo_postal"),
        pais: t("pais"),
        comercial_id: t("comercial_id") || null,
        etiquetas,
        notas: t("notas"),
      });
      if (r.ok) {
        toast.success(r.mensaje);
        if (r.id) onGuardado?.(r.id);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Tipo de cliente" className="flex self-start rounded-lg bg-placa-2 p-0.5">
        {[
          { v: false, texto: "Persona", Icono: User },
          { v: true, texto: "Empresa", Icono: Buildings },
        ].map(({ v, texto, Icono }) => (
          <button
            key={texto}
            type="button"
            role="radio"
            aria-checked={esEmpresa === v}
            onClick={() => setEsEmpresa(v)}
            className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-medium transition-colors ${
              esEmpresa === v ? "bg-placa text-tinta shadow-placa" : "text-tinta-2 hover:text-tinta"
            }`}
          >
            <Icono className="size-4" weight={esEmpresa === v ? "fill" : "regular"} aria-hidden />
            {texto}
          </button>
        ))}
      </div>

      <Campo etiqueta={esEmpresa ? "Nombre de la empresa" : "Nombre y apellidos"}>
        <input name="nombre" required minLength={2} maxLength={200} defaultValue={cliente?.nombre ?? ""} autoFocus={!cliente} className={claseCampo} />
      </Campo>

      {!esEmpresa && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Empresa">
            <select name="empresa_id" defaultValue={cliente?.empresa_id ?? empresaInicial ?? ""} className={claseCampo}>
              <option value="">Sin empresa</option>
              {empresasElegibles.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Puesto">
            <input name="puesto" maxLength={120} defaultValue={cliente?.puesto ?? ""} placeholder="Gerente, Compras…" className={claseCampo} />
          </Campo>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Correo electrónico">
          <input name="email" type="email" maxLength={200} defaultValue={cliente?.email ?? ""} className={claseCampo} />
        </Campo>
        <Campo etiqueta="Teléfono">
          <input name="telefono" type="tel" maxLength={60} defaultValue={cliente?.telefono ?? ""} className={`${claseCampo} tabular-nums`} />
        </Campo>
        <Campo etiqueta="Móvil">
          <input name="movil" type="tel" maxLength={60} defaultValue={cliente?.movil ?? ""} className={`${claseCampo} tabular-nums`} />
        </Campo>
        <Campo etiqueta="Sitio web">
          <input name="web" maxLength={200} defaultValue={cliente?.web ?? ""} placeholder="www.ejemplo.es" className={claseCampo} />
        </Campo>
        <Campo etiqueta="NIF / CIF">
          <input name="nif" maxLength={40} defaultValue={cliente?.nif ?? ""} className={`${claseCampo} uppercase`} />
        </Campo>
        <Campo etiqueta="Comercial">
          <select name="comercial_id" defaultValue={cliente?.comercial_id ?? ""} className={claseCampo}>
            <option value="">Sin asignar</option>
            {comerciales
              .filter((c) => c.activo || c.id === cliente?.comercial_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {nombreCompleto(c)}
                </option>
              ))}
          </select>
        </Campo>
      </div>

      <fieldset className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <legend className="sr-only">Dirección</legend>
        <Campo etiqueta="Dirección" className="sm:col-span-2">
          <input name="direccion" maxLength={300} defaultValue={cliente?.direccion ?? ""} placeholder="Calle y número" className={claseCampo} />
        </Campo>
        <Campo etiqueta="Ciudad">
          <input name="ciudad" maxLength={120} defaultValue={cliente?.ciudad ?? ""} className={claseCampo} />
        </Campo>
        <Campo etiqueta="C. P.">
          <input name="codigo_postal" maxLength={20} defaultValue={cliente?.codigo_postal ?? ""} className={`${claseCampo} tabular-nums`} />
        </Campo>
        <Campo etiqueta="País" className="sm:col-span-2">
          <input name="pais" maxLength={120} defaultValue={cliente?.pais ?? "España"} className={claseCampo} />
        </Campo>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <span className="text-[0.8125rem] font-medium text-tinta">Etiquetas</span>
        <CampoEtiquetas valor={etiquetas} onCambio={setEtiquetas} />
      </div>

      <Campo etiqueta="Notas internas">
        <textarea name="notas" rows={3} maxLength={10000} defaultValue={cliente?.notas ?? ""} className={`${claseCampo} h-auto py-2`} />
      </Campo>

      <div className="flex justify-end gap-2">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className={claseSecundario}>
            Cancelar
          </button>
        )}
        <button type="submit" disabled={pendiente} className={claseBotonPrincipal}>
          {pendiente ? "Guardando…" : cliente ? "Guardar cambios" : "Crear cliente"}
        </button>
      </div>
    </form>
  );
}
