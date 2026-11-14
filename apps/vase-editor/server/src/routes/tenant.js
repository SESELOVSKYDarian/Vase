// Rutas del panel de la tienda (/tenant). El código de cada tema está en la carpeta tenant/.
// Se cargan en este orden para que las rutas queden registradas igual que siempre.
// partes: ./tenant/brands.js, ./tenant/bulk-price.js, ./tenant/categories.js, ./tenant/domains.js, ./tenant/helpers-common.js, ./tenant/helpers-domains.js, ./tenant/helpers-products.js, ./tenant/helpers-upload.js, ./tenant/integrations.js, ./tenant/offers.js, ./tenant/pages.js, ./tenant/price-lists.js, ./tenant/products-create.js, ./tenant/products-list.js, ./tenant/products-stock.js, ./tenant/products-update.js, ./tenant/router.js, ./tenant/settings.js, ./tenant/users.js
import './tenant/settings.js';
import './tenant/domains.js';
import './tenant/integrations.js';
import './tenant/pages.js';
import './tenant/categories.js';
import './tenant/brands.js';
import './tenant/products-list.js';
import './tenant/price-lists.js';
import './tenant/bulk-price.js';
import './tenant/offers.js';
import './tenant/users.js';
import './tenant/products-stock.js';
import './tenant/products-update.js';
import './tenant/products-create.js';

export { tenantRouter } from './tenant/router.js';
