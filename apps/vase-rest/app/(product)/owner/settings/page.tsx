export default function OwnerSettingsPage() {
  return (
    <main className="product-content">
      <p className="eyebrow">Configuración</p>
      <h1>Operación de sucursales</h1>
      <div className="catalog-grid">
        <a className="ui-card" href="/owner/settings/printers">
          <h2>Impresoras</h2>
          <p>Conexiones ESC/POS, rutas de cocina, pruebas y trabajos fallidos.</p>
        </a>
      </div>
    </main>
  );
}

