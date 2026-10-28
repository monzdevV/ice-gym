"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Star } from "@phosphor-icons/react";
import { toast } from "sonner";
import { ETIQUETA_PRIORIDAD_VENTA, esFechaValida, leerImporte } from "@/lib/ventas";

/**
 * Campos que se editan en su sitio, como en la ficha del flujo de ventas: se ven
 * como texto, se escriben al pasar por encima y se guardan al salir del campo.
 */

export const claseEnLinea =
  "h-8 w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 text-sm text-tinta outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-tinta-2/80 hover:border-linea focus:border-acento focus:bg-placa focus:ring-3 focus:ring-acento/30 disabled:opacity-60";

/** Fila «Etiqueta · control» de la ficha. */
export function Fila({ etiqueta, htmlFor, ayuda, children }: { etiqueta: string; htmlFor?: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-9 grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-2">
      <label htmlFor={htmlFor} className="text-[0.8125rem] font-semibold text-tinta" title={ayuda}>
        {etiqueta}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Lo que devuelve un guardado: si la promesa da `false`, el campo vuelve al valor que había. */
type AlGuardar<T> = (v: T) => Promise<boolean> | void;

function siFalla(r: Promise<boolean> | void, deshacer: () => void) {
  r?.then((ok) => !ok && deshacer());
}

/**
 * Texto (o email, teléfono, fecha…) que se guarda al salir si ha cambiado. Escape deshace.
 * Una fecha se guarda también al elegirla entera en el calendario, nunca a medio escribir.
 */
export function TextoEnLinea({
  etiqueta,
  valor,
  onGuardar,
  tipo = "text",
  placeholder,
  max = 200,
  className = "",
  sinFila = false,
  ayuda,
}: {
  etiqueta: string;
  valor: string | null;
  onGuardar: AlGuardar<string>;
  tipo?: "text" | "email" | "tel" | "date";
  placeholder?: string;
  max?: number;
  className?: string;
  /** Sin la fila de etiqueta (el título de la ficha). */
  sinFila?: boolean;
  ayuda?: string;
}) {
  const id = useId();
  const original = valor ?? "";
  const [v, setV] = useState(original);
  const [base, setBase] = useState(original);
  const [invalido, setInvalido] = useState(false);
  // Lo último que se mandó: una fecha elegida y luego el blur no se guardan dos veces.
  const enviado = useRef<string | null>(null);
  if (original !== base) {
    setBase(original);
    setV(original);
  }

  function enviar(valor: string) {
    if (tipo === "date" && valor !== "" && !esFechaValida(valor)) {
      setInvalido(true);
      toast.error("Esa fecha no existe.");
      setV(original);
      return;
    }
    setInvalido(false);
    const limpio = valor.trim();
    if (limpio === original || limpio === enviado.current) return;
    enviado.current = limpio;
    siFalla(onGuardar(valor), () => {
      enviado.current = null;
      setV(original);
    });
  }

  const control = (
    <input
      id={id}
      type={tipo}
      value={v}
      maxLength={max}
      placeholder={placeholder}
      aria-label={sinFila ? etiqueta : undefined}
      aria-invalid={invalido || undefined}
      onChange={(e) => {
        setV(e.target.value);
        setInvalido(false);
        if (tipo === "date" && esFechaValida(e.target.value)) enviar(e.target.value);
      }}
      onBlur={() => enviar(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setV(original);
          setInvalido(false);
          requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
        }
      }}
      className={`${claseEnLinea} aria-invalid:border-critico ${className}`}
    />
  );
  return sinFila ? control : (
    <Fila etiqueta={etiqueta} htmlFor={id} ayuda={ayuda}>
      {control}
    </Fila>
  );
}

/** Número con unidad (€ o %) escrito a la española: «1.234,56». Lo que no se entienda no se guarda. */
export function NumeroEnLinea({
  etiqueta,
  valor,
  onGuardar,
  unidad,
  className = "",
}: {
  etiqueta: string;
  valor: number;
  onGuardar: AlGuardar<number>;
  unidad: string;
  className?: string;
}) {
  const original = String(valor).replace(".", ",");
  const [v, setV] = useState(original);
  const [base, setBase] = useState(original);
  const [invalido, setInvalido] = useState(false);
  if (original !== base) {
    setBase(original);
    setV(original);
  }

  function enviar() {
    const n = leerImporte(v);
    if (n == null || n < 0) {
      setInvalido(true);
      toast.error(`${etiqueta}: escribe una cantidad, p. ej. 1.234,56`);
      setV(original);
      return;
    }
    setInvalido(false);
    if (n !== valor) siFalla(onGuardar(n), () => setV(original));
  }

  return (
    <span className="inline-flex min-w-0 items-baseline gap-1">
      <input
        value={v}
        inputMode="decimal"
        aria-label={etiqueta}
        aria-invalid={invalido || undefined}
        onChange={(e) => {
          setV(e.target.value);
          setInvalido(false);
        }}
        onBlur={enviar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setV(original);
            setInvalido(false);
          }
        }}
        className={`${claseEnLinea} cifra tabular-nums aria-invalid:border-critico ${className}`}
      />
      <span className="text-tinta-2">{unidad}</span>
    </span>
  );
}

/** Desplegable que guarda al cambiar. */
export function SelectEnLinea({
  etiqueta,
  valor,
  opciones,
  onGuardar,
  vacio = "Sin asignar",
}: {
  etiqueta: string;
  valor: string | null;
  opciones: { valor: string; texto: string }[];
  onGuardar: (v: string | null) => void;
  vacio?: string;
}) {
  const id = useId();
  return (
    <Fila etiqueta={etiqueta} htmlFor={id}>
      <select id={id} value={valor ?? ""} onChange={(e) => onGuardar(e.target.value || null)} className={`${claseEnLinea} cursor-pointer appearance-none`}>
        <option value="">{vacio}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </Fila>
  );
}

/** Prioridad en tres estrellas: pulsar la que ya está marcada la quita. */
export function EstrellasEditables({ n, onCambio, disabled = false }: { n: number; onCambio: (n: number) => void; disabled?: boolean }) {
  const [sobre, setSobre] = useState(0);
  const visibles = sobre || n;
  return (
    <span className="inline-flex items-center" role="radiogroup" aria-label="Prioridad" onMouseLeave={() => setSobre(0)}>
      {[1, 2, 3].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={n === i}
          aria-label={ETIQUETA_PRIORIDAD_VENTA[i]}
          title={ETIQUETA_PRIORIDAD_VENTA[i]}
          disabled={disabled}
          onMouseEnter={() => setSobre(i)}
          onClick={() => onCambio(n === i ? 0 : i)}
          className="grid size-7 place-items-center rounded-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta active:scale-90"
        >
          <Star className={`size-5 ${i <= visibles ? "text-aviso" : "text-tinta-2/50"}`} weight={i <= visibles ? "fill" : "regular"} aria-hidden />
        </button>
      ))}
    </span>
  );
}
