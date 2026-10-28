"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { actualizarOportunidadVentas, type DatosOportunidad } from "@/app/crm/acciones/ventas";

/**
 * Guardado campo a campo de la ficha. Los campos muestran el valor nuevo al
 * instante; la promesa dice si el servidor lo aceptó, para que el campo
 * vuelva al valor que había si no.
 */
export function useGuardar(id: string) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();

  function guardar(cambios: DatosOportunidad, aviso?: string): Promise<boolean> {
    return new Promise((resolver) => {
      empezar(async () => {
        const r = await actualizarOportunidadVentas(id, cambios);
        if (!r.ok) toast.error(r.mensaje);
        else if (aviso) toast.success(aviso);
        resolver(r.ok);
        router.refresh();
      });
    });
  }

  return { guardar, pendiente };
}
