/** Esqueleto de la ficha de ventas: migas, estado y etapas, ficha y seguimiento. */

const pulso = "animate-pulse motion-reduce:animate-none";

export default function Cargando() {
  return (
    <main className={`${pulso} flex flex-col gap-4 px-4 pb-12 pt-5 lg:px-8`} aria-busy aria-label="Cargando oportunidad">
      <div className="flex items-center justify-between gap-4">
        <span className="h-4 w-56 rounded bg-placa-2/70" />
        <span className="h-6 w-28 rounded bg-placa-2/70" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <span className="h-9 w-24 rounded-lg bg-placa-2" />
          <span className="h-9 w-24 rounded-lg bg-placa-2/70" />
        </div>
        <span className="h-9 w-96 max-w-full rounded-lg bg-placa-2" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6 rounded-2xl bg-placa p-5 shadow-placa md:p-7">
          <span className="h-9 w-2/3 rounded-md bg-placa-2" />
          <div className="flex gap-8">
            <span className="h-12 w-40 rounded-md bg-placa-2" />
            <span className="h-12 w-24 rounded-md bg-placa-2/70" />
          </div>
          <div className="grid gap-x-10 gap-y-3 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="h-8 rounded-md bg-placa-2/70" />
            ))}
          </div>
          <span className="h-40 rounded-lg bg-placa-2/70" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className="h-8 w-28 rounded-md bg-placa-2" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <span className="size-8 shrink-0 rounded-full bg-placa-2" />
              <span className="flex flex-1 flex-col gap-2 pt-1">
                <span className="h-3.5 w-2/5 rounded bg-placa-2" />
                <span className="h-3 w-4/5 rounded bg-placa-2/70" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
