/** Esqueletos de carga de RRHH, con la misma retícula que las pantallas reales. */

const pulso = "animate-pulse motion-reduce:animate-none";
const bloque = "rounded-xl border border-linea bg-placa";

export function EsqueletoListaRrhh({ etiqueta, cifras = false }: { etiqueta: string; cifras?: boolean }) {
  return (
    <main className={`${pulso} flex flex-col gap-4 px-4 pb-10 lg:px-8`} aria-busy="true" aria-label={`Cargando ${etiqueta}`}>
      <div className="flex items-end justify-between gap-4 pt-6">
        <div className="flex flex-col gap-2">
          <span className="h-7 w-40 rounded-md bg-placa-2" />
          <span className="h-4 w-72 max-w-full rounded bg-placa-2/70" />
        </div>
        <span className="h-8 w-36 rounded-lg bg-placa-2" />
      </div>
      {cifras && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${bloque} flex h-[74px] flex-col gap-2 px-4 py-3`}>
              <span className="h-3.5 w-24 rounded bg-placa-2/70" />
              <span className="h-5 w-16 rounded bg-placa-2" />
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="h-8 w-32 rounded-lg bg-placa-2" />
        ))}
      </div>
      <div className={`${bloque} overflow-hidden`}>
        <div className="h-10 border-b border-linea" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-linea/70 px-4 py-3 last:border-0">
            <span className="size-7 shrink-0 rounded-full bg-placa-2" />
            <span className="h-3.5 w-40 rounded bg-placa-2" />
            <span className="hidden h-4 w-28 rounded bg-placa-2/70 md:block" />
            <span className="hidden h-5 w-20 rounded-md bg-placa-2 lg:block" />
            <span className="ml-auto h-3.5 w-16 rounded bg-placa-2" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoFichaEmpleado() {
  return (
    <main className={`${pulso} px-4 pb-12 pt-5 lg:px-8`} aria-busy="true" aria-label="Cargando ficha">
      <span className="block h-4 w-24 rounded bg-placa-2/70" />
      <div className="mt-3 flex items-start gap-4 border-b border-linea pb-5">
        <span className="size-14 shrink-0 rounded-full bg-placa-2" />
        <div className="flex flex-col gap-2">
          <span className="h-7 w-56 rounded-md bg-placa-2" />
          <span className="h-4 w-40 rounded bg-placa-2/70" />
          <span className="h-5 w-32 rounded bg-placa-2/70" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${bloque} h-[74px]`} />
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <div className={`${bloque} h-72`} />
          <div className={`${bloque} h-56`} />
        </div>
        <div className={`${bloque} h-96`} />
      </div>
    </main>
  );
}
