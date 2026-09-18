import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Clase } from "@/lib/tipos";

export type ClaseConOcupacion = Clase & {
  centro: { nombre: string } | null;
  ocupadas: number;
};

const ZONA = "Europe/Madrid";

/** "2026-09-18" en hora de Madrid. */
export function claveDia(fecha: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

/** Día ISO de la semana en Madrid: 1 = lunes … 7 = domingo. */
function diaSemanaMadrid(fecha: Date) {
  const nombre = new Intl.DateTimeFormat("en-US", { timeZone: ZONA, weekday: "short" }).format(fecha);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(nombre) + 1;
}

/** Suma días a una clave "YYYY-MM-DD" sin pasar por zonas horarias. */
function sumarDias(clave: string, dias: number) {
  const d = new Date(`${clave}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Las siete claves de día (lunes a domingo) de la semana pedida. */
export function diasDeLaSemana(offset = 0) {
  const hoy = new Date();
  const lunes = sumarDias(claveDia(hoy), -(diaSemanaMadrid(hoy) - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

export async function listarClasesSemana(centroId: string | null, offset: number) {
  const supabase = await createClient();
  const dias = diasDeLaSemana(offset);

  // Ventana con margen a ambos lados; luego se filtra por el día real en Madrid.
  const desde = new Date(`${dias[0]}T00:00:00Z`);
  desde.setUTCHours(desde.getUTCHours() - 3);
  const hasta = new Date(`${dias[6]}T23:59:59Z`);
  hasta.setUTCHours(hasta.getUTCHours() + 3);

  let consulta = supabase
    .from("clases")
    .select("*, centro:centros(nombre), reservas(estado)")
    .gte("inicio", desde.toISOString())
    .lte("inicio", hasta.toISOString())
    .order("inicio");

  if (centroId) consulta = consulta.eq("centro_id", centroId);

  const { data } = await consulta.returns<
    (Clase & { centro: { nombre: string } | null; reservas: { estado: string }[] })[]
  >();

  const porDia = new Map<string, ClaseConOcupacion[]>(dias.map((d) => [d, []]));
  for (const { reservas, ...clase } of data ?? []) {
    const lista = porDia.get(claveDia(new Date(clase.inicio)));
    if (!lista) continue;
    lista.push({
      ...clase,
      ocupadas: reservas.filter((r) => r.estado !== "cancelada").length,
    });
  }

  return { dias, porDia, hoy: claveDia(new Date()) };
}
