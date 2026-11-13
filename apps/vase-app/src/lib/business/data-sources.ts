// Mi negocio › Cómo se conectan tus productos: qué cosas se comparten, de dónde puede salir cada una
// y qué productos la usan. Lo usan la pantalla y la acción que guarda.

export type DataResourceId = "CATALOG" | "STOCK" | "ORDERS" | "CUSTOMERS";
export type DataSourceId = "BUSINESS" | "MANAGEMENT" | "REST" | "EXTERNAL";
export type ProductKey = "business" | "labs" | "management" | "rest";

export const SOURCE_PRODUCT: Record<Exclude<DataSourceId, "EXTERNAL">, ProductKey> = {
  BUSINESS: "business",
  MANAGEMENT: "management",
  REST: "rest",
};

export const DATA_RESOURCES: Array<{
  id: DataResourceId;
  title: string;
  hint: string;
  options: DataSourceId[];
  optionHints: Partial<Record<DataSourceId, string>>;
  users: ProductKey[];
}> = [
  {
    id: "CATALOG",
    title: "Productos y precios",
    hint: "La lista de lo que vendés",
    options: ["BUSINESS", "MANAGEMENT", "REST", "EXTERNAL"],
    optionHints: { BUSINESS: "Lo que cargás en tu tienda", MANAGEMENT: "Recomendado si lo usás", EXTERNAL: "Tu sistema los manda solo" },
    users: ["business", "labs", "rest"],
  },
  {
    id: "STOCK",
    title: "Stock",
    hint: "Cuánto te queda de cada producto",
    options: ["BUSINESS", "MANAGEMENT", "EXTERNAL"],
    optionHints: { BUSINESS: "Lo cargás en tu tienda", MANAGEMENT: "Se descuenta con cada venta", EXTERNAL: "Tu sistema lo actualiza" },
    users: ["business", "labs", "rest"],
  },
  {
    id: "ORDERS",
    title: "Pedidos",
    hint: "Adónde llegan las compras de la tienda, el chat o el salón",
    options: ["BUSINESS", "MANAGEMENT", "EXTERNAL"],
    optionHints: { BUSINESS: "Los ves con los de tu tienda", MANAGEMENT: "Se facturan desde ahí", EXTERNAL: "Vase se los manda a tu sistema" },
    users: ["labs", "rest"],
  },
  {
    id: "CUSTOMERS",
    title: "Clientes",
    hint: "Nombre, teléfono y lo que compró cada uno",
    options: ["BUSINESS", "MANAGEMENT", "EXTERNAL"],
    optionHints: {},
    users: ["business", "labs", "rest"],
  },
];

export const EXTERNAL_SYSTEMS = ["Tango Gestión", "Bejerman", "Contabilium", "Otro sistema"] as const;

/** De dónde sale cada cosa si todavía no se eligió: lo que ya venía funcionando. */
export function defaultSource(
  resource: DataResourceId,
  active: Record<ProductKey, boolean>,
  managementProvider: "EXTERNAL_API" | "VASE_MANAGEMENT" | null,
): DataSourceId {
  if (resource === "CATALOG" || resource === "STOCK") {
    if (managementProvider === "VASE_MANAGEMENT") return "MANAGEMENT";
    return active.business ? "BUSINESS" : active.management ? "MANAGEMENT" : "BUSINESS";
  }
  return active.business ? "BUSINESS" : active.management ? "MANAGEMENT" : "BUSINESS";
}
