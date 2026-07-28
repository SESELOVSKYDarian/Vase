export default function OwnerSettingsPage() {
  return (
    <main className="product-content">
      <p className="eyebrow">Configuración</p>
      <h1>Operación de sucursales</h1>
      <div className="catalog-grid">
        <a className="ui-card" href="/owner/settings/delivery">
          <h2>Delivery</h2>
          <p>Credenciales, tiendas, webhooks y certificación por proveedor y sucursal.</p>
        </a>
        <a className="ui-card" href="/owner/settings/fiscal">
          <h2>Facturación electrónica</h2>
          <p>ARCA WSAA/WSFE, certificados, puntos de venta y comprobantes por sucursal.</p>
        </a>
        <a className="ui-card" href="/owner/settings/payments">
          <h2>Pagos</h2>
          <p>Mercado Pago Point y QR por sucursal, OAuth y webhooks.</p>
        </a>
        <a className="ui-card" href="/owner/settings/printers">
          <h2>Impresoras</h2>
          <p>Conexiones ESC/POS, rutas de cocina, pruebas y trabajos fallidos.</p>
        </a>
      </div>
    </main>
  );
}
