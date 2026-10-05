const ZONA = "Europe/Madrid";

const euros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eurosExactos = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const enteros = new Intl.NumberFormat("es-ES");

export function dinero(valor: number | string | null | undefined) {
  return euros.format(Number(valor ?? 0));
}

export function dineroExacto(valor: number | string | null | undefined) {
  return eurosExactos.format(Number(valor ?? 0));
}

export function numero(valor: number | string | null | undefined) {
  return enteros.format(Number(valor ?? 0));
}

export function porcentaje(valor: number, decimales = 0) {
  if (!Number.isFinite(valor)) return "—";
  return `${valor.toFixed(decimales).replace(".", ",")} %`;
}

export function fecha(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: ZONA,
  }).format(new Date(iso));
}

export function fechaHora(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA,
  }).format(new Date(iso));
}

export function hora(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA,
  }).format(new Date(iso));
}

export function mesLargo(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: ZONA })
    .format(new Date(iso));
}

export function mesCorto(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: ZONA })
    .format(new Date(iso))
    .replace(".", "");
}

export function diaSemanaCorto(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: ZONA })
    .format(new Date(iso))
    .replace(".", "");
}

/** "hace 3 días", "en 2 semanas". */
export function relativo(iso: string | null | undefined) {
  if (!iso) return "—";
  const dias = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });
  if (Math.abs(dias) < 31) return rtf.format(dias, "day");
  return rtf.format(Math.round(dias / 30), "month");
}

export function iniciales(nombre: string, apellidos?: string | null) {
  const a = nombre.trim().charAt(0);
  const b = (apellidos ?? "").trim().charAt(0) || nombre.trim().split(" ")[1]?.charAt(0) || "";
  return (a + b).toUpperCase();
}

/** Primer día del mes actual en formato YYYY-MM-DD, en hora de Madrid. */
export function inicioDeMes(desplazamientoMeses = 0) {
  const ahora = new Date();
  const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + desplazamientoMeses, 1));
  return d.toISOString().slice(0, 10);
}
