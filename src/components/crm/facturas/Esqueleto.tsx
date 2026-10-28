/** Esqueleto de carga de facturas: misma retícula que la pantalla real. */

const pulso = "animate-pulse motion-reduce:animate-none";
const bloque = "rounded-2xl bg-placa shadow-placa";

export function EsqueletoFacturas() {
  return (
    <main className={`${pulso} flex flex-col gap-4 px-4 pb-10 lg:px-8`} aria-busy aria-label="Cargando facturas">
      <div className="flex flex-col gap-2 pb-1 pt-6">
        <span className="h-7 w-36 rounded-md bg-placa-2" />
        <span className="h-4 w-64 max-w-full rounded bg-placa-2/70" />
      </div>
      <div className={`${bloque} flex flex-col gap-4 p-4 sm:p-5`}>
        <span className="h-4 w-52 rounded bg-placa-2" />
        <span className="h-36 rounded-2xl bg-placa-2/60 sm:h-44" />
        <div className="grid gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="h-[4.5rem] rounded-xl bg-placa-2/70" />
          ))}
        </div>
      </div>
      <span className="mt-4 h-4 w-40 rounded bg-placa-2" />
      <div className={`${bloque} overflow-hidden`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <span className="h-3.5 w-20 rounded bg-placa-2" />
            <span className="hidden h-3.5 w-24 rounded bg-placa-2 md:block" />
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="h-3.5 w-40 max-w-full rounded bg-placa-2" />
              <span className="h-3 w-24 rounded bg-placa-2/70" />
            </span>
            <span className="hidden h-3.5 w-16 rounded bg-placa-2 md:block" />
            <span className="hidden h-3.5 w-14 rounded bg-placa-2 md:block" />
            <span className="h-3.5 w-20 rounded bg-placa-2" />
          </div>
        ))}
      </div>
    </main>
  );
}
