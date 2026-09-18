/** Esqueletos de carga con la misma retícula que la pantalla real, para que nada salte. */

function Cabecera() {
  return (
    <div className="flex items-end gap-5 px-4 pb-5 pt-7 lg:px-8">
      <div className="flex items-stretch">
        <span className="w-2.5 bg-acento" />
        <span className="corte-rotulo h-14 w-52 bg-placa-2" />
      </div>
    </div>
  );
}

const pulso = "animate-pulse motion-reduce:animate-none";

export function EsqueletoPanel() {
  return (
    <main className={pulso}>
      <Cabecera />
      <div className="grid gap-8 px-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
        <div className="flex flex-col gap-[3px]">
          <div className="h-11 bg-placa-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-placa" />
          ))}
        </div>
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-2 gap-[3px] sm:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 bg-placa" />
            ))}
          </div>
          <div className="h-60 bg-placa" />
        </div>
      </div>
    </main>
  );
}

export function EsqueletoTablero() {
  return (
    <main className={pulso}>
      <Cabecera />
      <div className="flex gap-4 overflow-hidden px-4 lg:grid lg:grid-cols-6 lg:gap-3 lg:px-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex w-[264px] shrink-0 flex-col gap-[3px] lg:w-auto">
            <div className="h-10 bg-placa-2" />
            {Array.from({ length: 3 - (i % 2) }).map((_, j) => (
              <div key={j} className="h-16 bg-placa" />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoTabla() {
  return (
    <main className={pulso}>
      <Cabecera />
      <div className="flex flex-col gap-[3px] px-4 lg:px-8">
        <div className="mb-4 h-12 max-w-xl border-b-2 border-linea" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-placa" />
        ))}
      </div>
    </main>
  );
}

export function EsqueletoCalendario() {
  return (
    <main className={pulso}>
      <Cabecera />
      <div className="grid gap-3 px-4 md:grid-cols-2 lg:px-8 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            <div className="h-10 bg-placa-2" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-20 bg-placa" />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoFicha() {
  return (
    <main className={pulso}>
      <Cabecera />
      <div className="grid gap-10 px-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="flex flex-col gap-[3px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-placa" />
          ))}
        </div>
        <div className="flex flex-col gap-[3px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-placa" />
          ))}
        </div>
      </div>
    </main>
  );
}
