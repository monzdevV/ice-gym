/** Esqueletos de carga: misma retícula que la pantalla real, para que nada salte al llegar los datos. */

function Cabecera() {
  return (
    <div className="border-b border-acero px-4 py-5 lg:px-6">
      <div className="h-2.5 w-28 bg-grafito" />
      <div className="mt-3 h-9 w-44 bg-grafito" />
    </div>
  );
}

export function EsqueletoTablero() {
  return (
    <main className="animate-pulse">
      <Cabecera />
      <div className="flex gap-3 overflow-hidden p-4 lg:grid lg:grid-cols-6 lg:p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-[258px] shrink-0 border border-acero lg:w-auto">
            <div className="h-10 border-b border-acero bg-carbon" />
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 - (i % 2) }).map((_, j) => (
                <div key={j} className="h-28 bg-carbon" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoTabla() {
  return (
    <main className="animate-pulse">
      <Cabecera />
      <div className="h-24 border-b border-acero" />
      <div className="divide-y divide-acero/70">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-3.5">
            <div className="h-3 w-16 bg-grafito" />
            <div className="size-8 bg-grafito" />
            <div className="h-3 w-48 bg-grafito" />
            <div className="ml-auto h-5 w-20 bg-grafito" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoCalendario() {
  return (
    <main className="animate-pulse">
      <Cabecera />
      <div className="h-24 border-b border-acero" />
      <div className="grid gap-px bg-acero lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-negro">
            <div className="h-12 border-b border-acero bg-carbon" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="m-px h-20 bg-carbon/60" />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoFicha() {
  return (
    <main className="animate-pulse">
      <Cabecera />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-6">
        <div className="space-y-4">
          <div className="panel h-40" />
          <div className="panel h-80" />
        </div>
        <div className="space-y-4">
          <div className="panel h-56" />
          <div className="panel h-40" />
        </div>
      </div>
    </main>
  );
}
