import type { Ingredient, StockCategory } from '@/types/stock';

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[áàâäã]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôöõ]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/[ñ]/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getExpirationDate = (daysFromNow: number | null): Date | null => {
  if (!daysFromNow) return null;
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

export function buildInitialStock(): StockCategory[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ingredients: Ingredient[] = [
    // CARNES Y PROTEÍNAS
    { id: 'ing-carne-picada', name: 'Carne picada', category: 'Carnes y Proteínas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(3), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-nalga', name: 'Nalga', category: 'Carnes y Proteínas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(4), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-bife-chorizo', name: 'Bife de chorizo', category: 'Carnes y Proteínas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(4), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-pechuga-pollo', name: 'Pechuga de pollo', category: 'Carnes y Proteínas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(3), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-muslo-pollo', name: 'Muslo de pollo', category: 'Carnes y Proteínas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(3), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-bondiola', name: 'Bondiola', category: 'Carnes y Proteínas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(5), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-panceta', name: 'Panceta', category: 'Carnes y Proteínas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(7), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-salchichas', name: 'Salchichas', category: 'Carnes y Proteínas', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(7), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-huevos', name: 'Huevos', category: 'Carnes y Proteínas', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(21), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-jamon-cocido', name: 'Jamón cocido', category: 'Carnes y Proteínas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(10), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-jamon-crudo', name: 'Jamón crudo', category: 'Carnes y Proteínas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(15), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-atun-lata', name: 'Atún en lata', category: 'Carnes y Proteínas', stock: 20, unit: 'unidades', minStock: 5, expirationDate: null, hasExpiration: false, lastUpdated: new Date() },

    // LÁCTEOS
    { id: 'ing-leche-entera', name: 'Leche entera', category: 'Lácteos', stock: 20, unit: 'litros', minStock: 5, expirationDate: getExpirationDate(7), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-crema-leche', name: 'Crema de leche', category: 'Lácteos', stock: 20, unit: 'litros', minStock: 5, expirationDate: getExpirationDate(10), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-manteca', name: 'Manteca', category: 'Lácteos', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(30), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-queso-mozzarella', name: 'Queso mozzarella', category: 'Lácteos', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(20), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-queso-cremoso', name: 'Queso cremoso', category: 'Lácteos', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(15), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-queso-cheddar', name: 'Queso cheddar', category: 'Lácteos', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(20), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-queso-parmesano', name: 'Queso parmesano', category: 'Lácteos', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(30), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-yogur-natural', name: 'Yogur natural', category: 'Lácteos', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(14), hasExpiration: true, lastUpdated: new Date() },

    // VERDURAS
    { id: 'ing-papa', name: 'Papa', category: 'Verduras', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(30), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-batata', name: 'Batata', category: 'Verduras', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(21), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-cebolla', name: 'Cebolla', category: 'Verduras', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(30), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-cebolla-verdeo', name: 'Cebolla de verdeo', category: 'Verduras', stock: 20, unit: 'atado', minStock: 5, expirationDate: getExpirationDate(7), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-ajo', name: 'Ajo', category: 'Verduras', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(60), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-lechuga', name: 'Lechuga', category: 'Verduras', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(5), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-tomate', name: 'Tomate', category: 'Verduras', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(7), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-zanahoria', name: 'Zanahoria', category: 'Verduras', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(21), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-morron-rojo', name: 'Morrón rojo', category: 'Verduras', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(10), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-morron-verde', name: 'Morrón verde', category: 'Verduras', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(10), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-pepino', name: 'Pepino', category: 'Verduras', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(7), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-berenjena', name: 'Berenjena', category: 'Verduras', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(7), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-zapallito', name: 'Zapallito', category: 'Verduras', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(7), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-brocoli', name: 'Brócoli', category: 'Verduras', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(5), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-champinones', name: 'Champiñones', category: 'Verduras', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(4), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-perejil', name: 'Perejil', category: 'Verduras', stock: 20, unit: 'atado', minStock: 5, expirationDate: getExpirationDate(5), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-cilantro', name: 'Cilantro', category: 'Verduras', stock: 20, unit: 'atado', minStock: 5, expirationDate: getExpirationDate(5), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-rucula', name: 'Rúcula', category: 'Verduras', stock: 20, unit: 'atado', minStock: 5, expirationDate: getExpirationDate(4), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-choclo', name: 'Choclo', category: 'Verduras', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(5), hasExpiration: true, lastUpdated: new Date() },

    // FRUTAS
    { id: 'ing-limon', name: 'Limón', category: 'Frutas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(21), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-naranja', name: 'Naranja', category: 'Frutas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(21), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-manzana', name: 'Manzana', category: 'Frutas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(30), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-banana', name: 'Banana', category: 'Frutas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(5), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-pera', name: 'Pera', category: 'Frutas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(14), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-frutilla', name: 'Frutilla', category: 'Frutas', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(3), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-kiwi', name: 'Kiwi', category: 'Frutas', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(14), hasExpiration: true, lastUpdated: new Date() },

    // PANIFICADOS
    { id: 'ing-pan-hamburguesa', name: 'Pan de hamburguesa', category: 'Panificados', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(4), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-pan-pancho', name: 'Pan de pancho', category: 'Panificados', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(4), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-pan-lactal', name: 'Pan lactal', category: 'Panificados', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(7), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-pan-frances', name: 'Pan francés', category: 'Panificados', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(2), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-medialunas', name: 'Medialunas', category: 'Panificados', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(2), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-pan-rallado', name: 'Pan rallado', category: 'Panificados', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(180), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-tapas-empanadas', name: 'Tapas para empanadas', category: 'Panificados', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(5), hasExpiration: true, lastUpdated: new Date() },

    // PASTAS Y CEREALES
    { id: 'ing-fideos-spaghetti', name: 'Fideos spaghetti', category: 'Pastas y Cereales', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-fideos-penne', name: 'Fideos penne', category: 'Pastas y Cereales', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-arroz', name: 'Arroz', category: 'Pastas y Cereales', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-polenta', name: 'Polenta', category: 'Pastas y Cereales', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-avena', name: 'Avena', category: 'Pastas y Cereales', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-harina-000', name: 'Harina 000', category: 'Pastas y Cereales', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(180), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-harina-leudante', name: 'Harina leudante', category: 'Pastas y Cereales', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(180), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-fecula-maiz', name: 'Fécula de maíz', category: 'Pastas y Cereales', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },

    // SALSAS Y CONDIMENTOS
    { id: 'ing-sal', name: 'Sal', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: null, hasExpiration: false, lastUpdated: new Date() },
    { id: 'ing-pimienta', name: 'Pimienta', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: null, hasExpiration: false, lastUpdated: new Date() },
    { id: 'ing-oregano', name: 'Orégano', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: null, hasExpiration: false, lastUpdated: new Date() },
    { id: 'ing-pimenton', name: 'Pimentón', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: null, hasExpiration: false, lastUpdated: new Date() },
    { id: 'ing-aji-molido', name: 'Ají molido', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: null, hasExpiration: false, lastUpdated: new Date() },
    { id: 'ing-comino', name: 'Comino', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: null, hasExpiration: false, lastUpdated: new Date() },
    { id: 'ing-mostaza', name: 'Mostaza', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(180), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-ketchup', name: 'Ketchup', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(180), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-mayonesa', name: 'Mayonesa', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(60), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-salsa-golf', name: 'Salsa golf', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(60), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-salsa-barbacoa', name: 'Salsa barbacoa', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(180), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-vinagre', name: 'Vinagre', category: 'Salsas y Condimentos', stock: 20, unit: 'litros', minStock: 5, expirationDate: null, hasExpiration: false, lastUpdated: new Date() },
    { id: 'ing-aceto-balsamico', name: 'Aceto balsámico', category: 'Salsas y Condimentos', stock: 20, unit: 'litros', minStock: 5, expirationDate: null, hasExpiration: false, lastUpdated: new Date() },
    { id: 'ing-salsa-soja', name: 'Salsa de soja', category: 'Salsas y Condimentos', stock: 20, unit: 'litros', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-provenzal', name: 'Provenzal', category: 'Salsas y Condimentos', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(7), hasExpiration: true, lastUpdated: new Date() },

    // ACEITES
    { id: 'ing-aceite-girasol', name: 'Aceite de girasol', category: 'Aceites', stock: 20, unit: 'litros', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-aceite-oliva', name: 'Aceite de oliva', category: 'Aceites', stock: 20, unit: 'litros', minStock: 5, expirationDate: getExpirationDate(545), hasExpiration: true, lastUpdated: new Date() },

    // CONSERVAS
    { id: 'ing-tomate-triturado', name: 'Tomate triturado', category: 'Conservas', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(540), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-pure-tomate', name: 'Puré de tomate', category: 'Conservas', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(540), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-aceitunas-verdes', name: 'Aceitunas verdes', category: 'Conservas', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-aceitunas-negras', name: 'Aceitunas negras', category: 'Conservas', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-choclo-lata', name: 'Choclo en lata', category: 'Conservas', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(540), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-arvejas-lata', name: 'Arvejas en lata', category: 'Conservas', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(540), hasExpiration: true, lastUpdated: new Date() },

    // BEBIDAS Y BAR
    { id: 'ing-agua-sin-gas', name: 'Agua mineral sin gas', category: 'Bebidas y Bar', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-agua-con-gas', name: 'Agua mineral con gas', category: 'Bebidas y Bar', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-soda', name: 'Soda', category: 'Bebidas y Bar', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-limon-bar', name: 'Limones (bar)', category: 'Bebidas y Bar', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(7), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-menta', name: 'Menta', category: 'Bebidas y Bar', stock: 20, unit: 'atado', minStock: 5, expirationDate: getExpirationDate(4), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-jarabe-azucar', name: 'Jarabe de azúcar', category: 'Bebidas y Bar', stock: 20, unit: 'litros', minStock: 5, expirationDate: getExpirationDate(90), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-hielo', name: 'Hielo', category: 'Bebidas y Bar', stock: 20, unit: 'kg', minStock: 5, expirationDate: null, hasExpiration: false, lastUpdated: new Date() },

    // REPOSTERÍA
    { id: 'ing-azucar', name: 'Azúcar', category: 'Repostería', stock: 20, unit: 'kg', minStock: 5, expirationDate: null, hasExpiration: false, lastUpdated: new Date() },
    { id: 'ing-chocolate-polvo', name: 'Chocolate en polvo', category: 'Repostería', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-dulce-leche', name: 'Dulce de leche', category: 'Repostería', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(90), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-esencia-vainilla', name: 'Esencia de vainilla', category: 'Repostería', stock: 20, unit: 'litros', minStock: 5, expirationDate: getExpirationDate(730), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-cacao-polvo', name: 'Cacao en polvo', category: 'Repostería', stock: 20, unit: 'kg', minStock: 5, expirationDate: getExpirationDate(365), hasExpiration: true, lastUpdated: new Date() },
    { id: 'ing-levadura', name: 'Levadura', category: 'Repostería', stock: 20, unit: 'unidades', minStock: 5, expirationDate: getExpirationDate(30), hasExpiration: true, lastUpdated: new Date() },
  ];

  const categories = new Map<string, Ingredient[]>();
  ingredients.forEach(ing => {
    if (!categories.has(ing.category)) categories.set(ing.category, []);
    categories.get(ing.category)!.push(ing);
  });

  return Array.from(categories.entries()).map(([name, ingList]) => ({
    id: slugify(name),
    name,
    ingredients: ingList,
  }));
}
