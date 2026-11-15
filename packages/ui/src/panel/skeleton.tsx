// Pantallas de carga del panel: lo que se ve al instante mientras el servidor arma la sección.
// Son solo bloques grises con la forma de la página, para que nada salte cuando llega el contenido real.

/** Un bloque gris que late suave. Se le da el tamaño por estilo. */
function Bone({ width = "100%", height = 14, radius = 8 }: { width?: number | string; height?: number | string; radius?: number }) {
  return <span className="vpa-sk" style={{ width, height, borderRadius: radius }} />;
}

/** Tarjeta de carga: un título y unos renglones. */
function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="vpa-sk-card">
      <Bone width="38%" height={16} />
      {Array.from({ length: lines }, (_, index) => (
        <Bone key={index} width={`${92 - index * 14}%`} />
      ))}
    </div>
  );
}

/**
 * Contenido de una sección mientras carga: cuatro números arriba y dos tarjetas.
 * Va adentro del panel (cuando el menú ya está dibujado por el layout).
 */
export function PanelContentSkeleton() {
  return (
    <div className="vpa-sk-wrap" role="status" aria-live="polite" aria-label="Cargando">
      <div className="vpa-sk-kpis">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="vpa-sk-card" key={index}>
            <Bone width="55%" height={11} />
            <Bone width="40%" height={24} />
          </div>
        ))}
      </div>
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </div>
  );
}

/**
 * Panel entero mientras carga: menú lateral, barra de arriba y contenido, todo en gris.
 * Para las apps donde cada página dibuja su propio menú: así el marco no desaparece al cambiar de sección.
 */
export function PanelShellSkeleton() {
  return (
    <div className="vpa">
      <aside className="vpa-sk-side" aria-hidden="true">
        <Bone width={96} height={26} />
        <div className="vpa-sk-nav">
          {Array.from({ length: 7 }, (_, index) => (
            <Bone key={index} width={`${78 - (index % 3) * 12}%`} height={32} radius={10} />
          ))}
        </div>
      </aside>
      <div className="vpa-main">
        <header className="vpa-top" aria-hidden="true">
          <div className="vpa-g1">
            <Bone width={180} height={20} />
          </div>
          <Bone width={40} height={40} radius={20} />
        </header>
        <main className="vpa-body">
          <div className="vpa-wrap">
            <PanelContentSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}
