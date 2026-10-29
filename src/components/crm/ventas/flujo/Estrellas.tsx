"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "@phosphor-icons/react";
import { toast } from "sonner";
import { actualizarOportunidadVentas } from "@/app/crm/acciones/ventas";
import { ETIQUETA_PRIORIDAD_VENTA } from "@/lib/ventas";

const parar = (e: React.SyntheticEvent) => e.stopPropagation();

/**
 * Para controles dentro de una tarjeta arrastrable: que pulsarlos (ratón, dedo
 * o teclado) no empiece a arrastrarla ni abra la ficha.
 */
export const aislar = { onMouseDown: parar, onTouchStart: parar, onKeyDown: parar, onPointerDown: parar };

/**
 * Tres estrellas de prioridad que se pulsan: la misma otra vez la quita.
 * Con `id` guarda al momento; sin él, sólo avisa (`onCambio`) para un formulario.
 */
export function EstrellasEditables({
  valor,
  id,
  onCambio,
  tamano = "size-4",
}: {
  valor: number;
  id?: string;
  onCambio?: (n: number) => void;
  tamano?: string;
}) {
  const router = useRouter();
  const [, empezar] = useTransition();
  const [actual, setActual] = useState(valor);
  const [encima, setEncima] = useState<number | null>(null);
  const [origen, setOrigen] = useState(valor);
  if (valor !== origen) {
    setOrigen(valor);
    setActual(valor);
  }

  function elegir(n: number) {
    const nuevo = n === actual ? 0 : n;
    setActual(nuevo);
    onCambio?.(nuevo);
    if (!id) return;
    empezar(async () => {
      const r = await actualizarOportunidadVentas(id, { prioridad: nuevo });
      if (r.ok) router.refresh();
      else {
        setActual(valor);
        toast.error(r.mensaje);
      }
    });
  }

  const visto = encima ?? actual;
  return (
    <span className="inline-flex items-center" role="radiogroup" aria-label="Prioridad" onMouseLeave={() => setEncima(null)}>
      {[1, 2, 3].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={actual === i}
          aria-label={ETIQUETA_PRIORIDAD_VENTA[i]}
          title={ETIQUETA_PRIORIDAD_VENTA[i]}
          onMouseEnter={() => setEncima(i)}
          {...aislar}
          onClick={(e) => {
            e.stopPropagation();
            elegir(i);
          }}
          className="grid place-items-center rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta"
        >
          <Star className={`${tamano} ${i <= visto ? "text-aviso" : "text-tinta-2/80"}`} weight={i <= visto ? "fill" : "regular"} aria-hidden />
        </button>
      ))}
    </span>
  );
}
