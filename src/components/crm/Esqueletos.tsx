/** Esqueletos de carga con la misma retícula que la pantalla real, para que nada salte. */

const pulso = "animate-pulse motion-reduce:animate-none";
const bloque = "rounded-xl border border-linea bg-placa";

function Cabecera({ acciones = 1 }: { acciones?: number }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-5 pt-6">
      <div className="flex flex-col gap-2">
        <span className="h-7 w-44 rounded-md bg-placa-2" />
        <span className="h-4 w-64 rounded bg-placa-2/70" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: acciones }).map((_, i) => (
          <span key={i} className="h-8 w-28 rounded-lg bg-placa-2" />
        ))}
      </div>
    </div>
  );
}

export function EsqueletoPanel() {
  return (
    <main className={`${pulso} px-4 lg:px-8`}>
      <Cabecera />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${bloque} h-[7.5rem]`} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className={`${bloque} h-80`} />
        <div className={`${bloque} h-80`} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className={`${bloque} h-80 xl:col-span-2`} />
        <div className={`${bloque} h-80`} />
      </div>
    </main>
  );
}

/** Oportunidades: pestañas, barra de filtros y tabla. */
export function EsqueletoOportunidades() {
  return (
    <main className={`${pulso} px-4 lg:px-8`}>
      <Cabecera acciones={2} />
      <div className="mb-4 flex gap-3 border-b border-linea pb-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className="h-5 w-16 rounded bg-placa-2" />
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="h-8 w-56 rounded-lg bg-placa-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="h-8 w-32 rounded-lg bg-placa-2" />
        ))}
      </div>
      <div className={`${bloque} overflow-hidden`}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-linea/70 px-4 py-3 last:border-0">
            <span className="size-4 rounded bg-placa-2" />
            <span className="flex w-48 flex-col gap-1.5">
              <span className="h-3.5 w-32 rounded bg-placa-2" />
              <span className="h-3 w-40 rounded bg-placa-2/70" />
            </span>
            <span className="h-5 w-28 rounded-md bg-placa-2" />
            <span className="ml-auto h-3.5 w-24 rounded bg-placa-2" />
            <span className="h-3.5 w-20 rounded bg-placa-2" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoTabla() {
  return (
    <main className={`${pulso} px-4 lg:px-8`}>
      <Cabecera />
      <div className={`${bloque} overflow-hidden`}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-linea/70 last:border-0" />
        ))}
      </div>
    </main>
  );
}

export function EsqueletoCalendario() {
  return (
    <main className={`${pulso} px-4 lg:px-8`}>
      <Cabecera />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-10 rounded-lg bg-placa-2" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className={`${bloque} h-20`} />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoFicha() {
  return (
    <main className={`${pulso} px-4 lg:px-8`}>
      <div className="flex items-center gap-3.5 pb-5 pt-10">
        <span className="size-12 rounded-full bg-placa-2" />
        <span className="flex flex-col gap-2">
          <span className="h-6 w-52 rounded-md bg-placa-2" />
          <span className="h-4 w-36 rounded bg-placa-2/70" />
        </span>
      </div>
      <div className="h-9 rounded-lg bg-placa-2" />
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${bloque} h-[4.5rem]`} />
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className={`${bloque} h-96`} />
        <div className="flex flex-col gap-5">
          <div className={`${bloque} h-48`} />
          <div className={`${bloque} h-48`} />
        </div>
      </div>
    </main>
  );
}
