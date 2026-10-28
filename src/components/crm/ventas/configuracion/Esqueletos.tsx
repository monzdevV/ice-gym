/** Esqueletos de carga de Equipos, Clientes y Ajustes de ventas: la misma retícula que la pantalla real. */

const pulso = "animate-pulse motion-reduce:animate-none";

function Cabecera({ boton = true }: { boton?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-5 pt-6">
      <div className="flex flex-col gap-2">
        <span className="h-7 w-44 rounded-md bg-placa-2" />
        <span className="h-4 w-72 rounded bg-placa-2/70" />
      </div>
      {boton && <span className="h-8 w-32 rounded-lg bg-placa-2" />}
    </div>
  );
}

export function EsqueletoAjustesVentas() {
  return (
    <main className={`${pulso} px-4 lg:px-8`} aria-busy aria-label="Cargando ajustes de ventas">
      <Cabecera />
      <div className="mb-5 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-8 w-28 rounded bg-placa-2" />
        ))}
      </div>
      <div className="max-w-4xl overflow-hidden rounded-2xl bg-placa shadow-placa">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-linea/70 px-4 py-4 last:border-0">
            <span className="h-10 w-6 rounded bg-placa-2" />
            <span className="h-4 w-40 rounded bg-placa-2" />
            <span className="ml-auto h-2 w-24 rounded-full bg-placa-2" />
            <span className="h-5 w-20 rounded bg-placa-2" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoEquiposVentas() {
  return (
    <main className={`${pulso} px-4 lg:px-8`} aria-busy aria-label="Cargando equipos de ventas">
      <Cabecera />
      <span className="mb-4 block h-8 w-72 rounded-lg bg-placa-2" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex h-56 flex-col gap-3 rounded-2xl bg-placa p-4 shadow-placa">
            <span className="h-5 w-36 rounded bg-placa-2" />
            <span className="h-3.5 w-48 rounded bg-placa-2/70" />
            <span className="mt-auto h-16 rounded-xl bg-placa-2/60" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoClientesVentas() {
  return (
    <main className={`${pulso} px-4 lg:px-8`} aria-busy aria-label="Cargando clientes">
      <Cabecera />
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="h-8 w-64 rounded-lg bg-placa-2" />
        <span className="h-8 w-48 rounded-lg bg-placa-2" />
        <span className="ml-auto h-8 w-24 rounded-lg bg-placa-2" />
      </div>
      <div className="overflow-hidden rounded-2xl bg-placa shadow-placa">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <span className="size-8 rounded-full bg-placa-2" />
            <span className="h-3.5 w-40 rounded bg-placa-2" />
            <span className="hidden h-3.5 w-44 rounded bg-placa-2 md:block" />
            <span className="hidden h-3.5 w-24 rounded bg-placa-2 lg:block" />
            <span className="ml-auto h-3.5 w-16 rounded bg-placa-2" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoFichaClienteVentas() {
  return (
    <main className={`${pulso} px-4 pb-12 pt-5 lg:px-8`} aria-busy aria-label="Cargando cliente">
      <span className="block h-4 w-24 rounded bg-placa-2/70" />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="size-14 rounded-full bg-placa-2" />
        <span className="flex flex-col gap-2">
          <span className="h-7 w-56 rounded-md bg-placa-2" />
          <span className="h-4 w-40 rounded bg-placa-2/70" />
        </span>
        <span className="ml-auto flex gap-2">
          <span className="h-14 w-36 rounded-xl bg-placa-2" />
          <span className="h-14 w-36 rounded-xl bg-placa-2" />
        </span>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <span className="h-96 rounded-2xl bg-placa shadow-placa" />
        <span className="h-96 rounded-2xl bg-placa shadow-placa" />
      </div>
    </main>
  );
}
