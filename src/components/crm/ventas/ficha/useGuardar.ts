"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { actualizarOportunidadVentas, type DatosOportunidad } from "@/app/crm/acciones/ventas";

/**
 * Guardado campo a campo de la ficha. Los campos muestran el valor nuevo al
 * instante; la promesa dice si el servidor lo aceptó, para que el campo
 * vuelva al valor que había si no. `estado` alimenta un aviso para lector de
 * pantalla (los guardados correctos no sacan toast).
 */
export function useGuardar(id: string) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [estado, setEstado] = useState<"" | "guardado" | "error">("");

  function guardar(cambios: DatosOportunidad, aviso?: string): Promise<boolean> {
    return new Promise((resolver) => {
      empezar(async () => {
        try {
          const r = await actualizarOportunidadVentas(id, cambios);
          if (!r.ok) toast.error(r.mensaje);
          else if (aviso) toast.success(aviso);
          setEstado(r.ok ? "guardado" : "error");
          resolver(r.ok);
          router.refresh();
        } catch {
          // Sin conexión: el campo vuelve a su valor en vez de quedarse con uno que no se guardó.
          toast.error("No se pudo guardar: revisa la conexión.");
          setEstado("error");
          resolver(false);
        }
      });
    });
  }

  return { guardar, pendiente, estado };
}
