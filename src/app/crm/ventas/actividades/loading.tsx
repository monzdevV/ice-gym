/** Esqueleto de «Mis actividades»: cabecera, controles y grupos por plazo. */

const pulso = "animate-pulse motion-reduce:animate-none";

export default function Cargando() {
  return (
    <main className={`${pulso} flex flex-col gap-5 px-4 pb-12 lg:px-8`} aria-busy aria-label="Cargando actividades">
      <div className="flex flex-col gap-2 pb-5 pt-6">
        <span className="h-8 w-56 rounded-md bg-placa-2" />
        <span className="h-4 w-96 max-w-full rounded bg-placa-2/70" />
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="h-9 w-48 rounded-lg bg-placa-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="h-8 w-24 rounded-full bg-placa-2/70" />
        ))}
        <span className="h-8 w-64 rounded-lg bg-placa-2/70" />
      </div>
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className="flex flex-col gap-4 rounded-2xl bg-placa p-5 shadow-placa">
          <span className="h-4 w-32 rounded bg-placa-2" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <span className="size-6 shrink-0 rounded-full bg-placa-2" />
              <span className="flex flex-1 flex-col gap-2">
                <span className="h-3.5 w-2/5 rounded bg-placa-2" />
                <span className="h-3 w-1/4 rounded bg-placa-2/70" />
              </span>
              <span className="h-6 w-20 rounded bg-placa-2/70" />
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
