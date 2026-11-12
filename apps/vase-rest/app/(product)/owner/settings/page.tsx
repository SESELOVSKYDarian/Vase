import { ChevronRight } from "lucide-react";

const GROUPS = [
  {
    title: "Tu local",
    items: [
      { href: "/owner/settings/salon", label: "Salón y cocina", text: "Pisos, zonas, mesas, estaciones de cocina y qué categoría va a cada una." },
      { href: "/owner/settings/printers", label: "Impresoras", text: "Comanderas y tickets: conexión, rutas de cocina, pruebas y trabajos fallidos." },
      { href: "/owner/settings/devices", label: "Dispositivos y Edge", text: "Servidor de la sucursal y terminales: alta, estado y baja." },
    ],
  },
  {
    title: "Cobros y facturación",
    items: [
      { href: "/owner/settings/payments", label: "Pagos", text: "Mercado Pago Point y QR por sucursal." },
      { href: "/owner/settings/fiscal", label: "Facturación electrónica", text: "ARCA: certificados, puntos de venta y comprobantes por sucursal." },
      { href: "/owner/settings/delivery", label: "Delivery", text: "Apps de delivery conectadas, tiendas y certificación por sucursal." },
    ],
  },
  {
    title: "Varias sucursales",
    items: [
      { href: "/owner/settings/scopes", label: "Qué se comparte", text: "Elegí qué se usa en todo el negocio, por grupo o por sucursal." },
      { href: "/owner/inventory", label: "Inventario y depósitos", text: "Ingredientes, depósitos compartidos, movimientos y cupos sin conexión." },
      { href: "/owner/promotions", label: "Promociones", text: "Reglas por fecha, día, producto, medio de pago, grupo o sucursal." },
    ],
  },
];

export default function OwnerSettingsPage() {
  return (
    <main className="product-content">
      <p className="eyebrow">Configuración</p>
      <h1>Operación de sucursales</h1>
      <div className="vr-alist">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <div className="vr-grp-title">{group.title}</div>
            {group.items.map((item) => (
              <a key={item.href} className="vr-arow" href={item.href}>
                <span className="g"><b>{item.label}</b><span>{item.text}</span></span>
                <ChevronRight size={16} aria-hidden="true" />
              </a>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
