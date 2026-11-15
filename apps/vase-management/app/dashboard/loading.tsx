// Lo que se ve al instante al cambiar de sección, mientras el servidor arma la página.
// El menú y la barra de arriba ya están dibujados: acá solo va la forma del contenido en gris.
export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Cargando">
      {/* Título de la sección */}
      <div className="h-7 w-56 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      {/* Fila de números */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-border bg-card motion-reduce:animate-none" />
        ))}
      </div>
      {/* Tabla o tarjeta principal */}
      <div className="h-80 animate-pulse rounded-xl border border-border bg-card motion-reduce:animate-none" />
    </div>
  );
}
