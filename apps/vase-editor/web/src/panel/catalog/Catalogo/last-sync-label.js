// Parte de Catalogo.jsx: TABS, lastSyncLabel.
import Ofertas from '../Ofertas';

export const TABS = [
    ['productos', 'Productos'],
    ['categorias', 'Rubros y categorías'],
    ['marcas', 'Marcas'],
    ['ofertas', 'Ofertas'],
    ['precios', 'Cambiar precios'],
];

export const lastSyncLabel = (products) => {
    const last = products.reduce((max, product) => {
        const time = product.last_sync_at ? new Date(product.last_sync_at).getTime() : 0;
        return time > max ? time : max;
    }, 0);
    if (!last) return null;
    const minutes = Math.round((Date.now() - last) / 60000);
    if (minutes < 1) return 'recién';
    if (minutes < 60) return `hace ${minutes} min`;
    if (minutes < 60 * 24) return `hace ${Math.round(minutes / 60)} h`;
    return new Date(last).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};
