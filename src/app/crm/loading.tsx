/** Esqueleto del panel: misma retícula que el contenido real, sin saltos. */
export default function Cargando() {
  return (
    <main className="animate-pulse">
      <div className="border-b border-acero px-4 py-5 lg:px-6">
        <div className="h-2.5 w-28 bg-grafito" />
        <div className="mt-3 h-9 w-44 bg-grafito" />
      </div>

      <div className="grid grid-cols-2 border-b border-acero lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-r border-acero px-4 py-5 last:border-r-0 lg:border-b-0 lg:px-5">
            <div className="h-2.5 w-20 bg-grafito" />
            <div className="mt-4 h-12 w-24 bg-grafito" />
            <div className="mt-3 h-2.5 w-28 bg-grafito" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-3 lg:p-6">
        <div className="panel h-72 lg:col-span-2" />
        <div className="panel h-72" />
        <div className="panel h-72 lg:col-span-2" />
        <div className="panel h-72" />
      </div>
    </main>
  );
}
