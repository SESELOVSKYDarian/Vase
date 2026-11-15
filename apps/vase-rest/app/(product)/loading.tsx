// Lo que se ve al instante al cambiar de sección, mientras el servidor arma la página.
// El menú ya está dibujado: acá solo va la forma del contenido en gris.
export default function ProductLoading() {
  return (
    <div className="vr-sk-wrap" role="status" aria-live="polite" aria-label="Cargando">
      <div className="vr-sk-kpis">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="vr-sk" style={{ height: 92 }} />
        ))}
      </div>
      <span className="vr-sk" style={{ height: 320 }} />
    </div>
  );
}
