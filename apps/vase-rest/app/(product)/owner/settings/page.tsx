export default function OwnerSettingsPage() {
  return (
    <main className="product-content">
      <p className="eyebrow">Configuración</p>
      <h1>Operación de sucursales</h1>
      <div className="catalog-grid">
        <a className="ui-card" href="/owner/settings/devices">
          <h2>Dispositivos y Edge</h2>
          <p>Enrolamiento de servidores de sucursal, terminales, estado y revocación.</p>
        </a>
        <a className="ui-card" href="/owner/inventory">
          <h2>Inventario y depósitos</h2>
          <p>Ingredientes, depósitos compartidos, movimientos y cupos offline por sucursal.</p>
        </a>
        <a className="ui-card" href="/owner/settings/scopes">
          <h2>Herencia por sucursal</h2>
          <p>Elegí qué familias se comparten para todo el negocio, por grupo o por sucursal.</p>
        </a>
        <a className="ui-card" href="/owner/settings/salon">
          <h2>Salón y cocina</h2>
          <p>Pisos, zonas, mesas, estaciones KDS y enrutamiento de categorías.</p>
        </a>
        <a className="ui-card" href="/owner/promotions">
          <h2>Promociones</h2>
          <p>Reglas por fecha, día, producto, medio de pago, grupo o sucursal.</p>
        </a>
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
