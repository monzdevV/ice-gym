/** Esqueleto del flujo: cabecera con totales y botones, barra de búsqueda y columnas del Kanban. */

const pulso = "animate-pulse motion-reduce:animate-none";

export default function Cargando() {
  return (
    <main className={`${pulso} flex flex-col gap-4 px-4 pb-4 md:h-[calc(100dvh-4rem)] md:overflow-hidden md:px-8`} aria-busy aria-label="Cargando el flujo">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <span className="h-8 w-28 rounded-md bg-placa-2" />
        <div className="flex gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <span className="h-3 w-16 rounded bg-placa-2/70" />
              <span className="h-5 w-20 rounded bg-placa-2" />
            </div>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <span className="h-9 w-24 rounded-lg bg-placa-2" />
          <span className="h-9 w-24 rounded-lg bg-placa-2" />
          <span className="h-9 w-48 rounded-lg bg-placa-2" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="h-9 w-full max-w-xl rounded-lg bg-placa-2" />
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className="h-8 w-28 rounded-lg bg-placa-2" />
        ))}
      </div>
      <div className="-mx-4 flex min-h-0 flex-1 gap-3 overflow-hidden px-4 lg:-mx-8 lg:px-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex w-[288px] shrink-0 flex-col gap-3 rounded-2xl bg-columna p-2 md:w-0 md:min-w-[232px] md:flex-1">
            <div className="flex flex-col gap-2 px-1 pt-1.5">
              <div className="flex items-center gap-2">
                <span className="h-4 w-24 rounded bg-placa-2" />
                <span className="ml-auto h-4 w-12 rounded bg-placa-2" />
              </div>
              <span className="h-1.5 w-full rounded-full bg-placa-2" />
            </div>
            {Array.from({ length: 3 - (i % 3) }).map((_, j) => (
              <div key={j} className="flex flex-col gap-2 rounded-2xl bg-tarjeta p-3 shadow-placa">
                <span className="h-4 w-4/5 rounded bg-placa-2" />
                <span className="h-3.5 w-1/2 rounded bg-placa-2/70" />
                <span className="h-5 w-20 rounded-md bg-placa-2" />
                <div className="flex justify-between">
                  <span className="h-4 w-16 rounded bg-placa-2" />
                  <span className="size-5 rounded-full bg-placa-2" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
