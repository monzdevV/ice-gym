/**
 * Logotipo de Ice Gym. "ICE" en blanco hielo, "GYM" en azul entre dos reglas:
 * la misma estructura en las dos variantes, para que la marca se reconozca
 * igual en la barra del CRM que en la cabecera de la web.
 */
export function Logotipo({
  variante = "linea",
  className = "",
}: {
  variante?: "linea" | "apilado";
  className?: string;
}) {
  if (variante === "apilado") {
    return (
      <span className={`inline-flex flex-col leading-none ${className}`} aria-label="Ice Gym">
        <span className="titular text-[2.6em] text-hielo">ICE</span>
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-3 bg-azul" aria-hidden />
          <span className="titular text-[1.35em] tracking-[0.18em] text-azul">GYM</span>
          <span className="h-[2px] flex-1 bg-azul" aria-hidden />
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-baseline gap-1.5 leading-none ${className}`} aria-label="Ice Gym">
      <span className="titular text-hielo">ICE</span>
      <span className="titular tracking-[0.14em] text-azul">GYM</span>
    </span>
  );
}
