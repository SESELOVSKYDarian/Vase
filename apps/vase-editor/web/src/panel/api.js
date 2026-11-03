import { getAdminTenantHeaders, getApiBase } from '../utils/api';

// Pedido autenticado al servidor del panel, con la tienda activa. Lanza un error con el código del servidor.
export async function panelFetch(path, { method = 'GET', body, user } = {}) {
    const token = localStorage.getItem('teflon_token');
    const tenantHeaders = await getAdminTenantHeaders(user);
    const res = await fetch(`${getApiBase()}${path}`, {
        method,
        headers: {
            ...tenantHeaders,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
        const error = new Error(payload?.error || `http_${res.status}`);
        error.status = res.status;
        error.payload = payload;
        throw error;
    }
    return payload;
}

// Mensajes en castellano para los errores que devuelve el servidor.
const ERRORS = {
    name_required: 'Falta el nombre.',
    invalid_price: 'El precio no es válido.',
    invalid_stock: 'El stock no es válido.',
    invalid_category_ids: 'Revisá las categorías elegidas.',
    category_cycle: 'No se puede poner una categoría dentro de una de sus subcategorías.',
    parent_category_not_found: 'La categoría elegida ya no existe.',
    category_not_found: 'La categoría ya no existe.',
    product_not_found: 'El producto ya no existe.',
    price_list_name_taken: 'Ya tenés una lista con ese nombre.',
    raise_needs_all: 'Para algunos clientes solo se puede bajar o poner un precio especial.',
    target_required: 'Elegí a qué clientes va.',
    invalid_amount: 'Revisá el número.',
    invalid_category_id: 'Elegí la categoría de nuevo.',
    invalid_percent: 'El ajuste va de -90% a 500%.',
};

export const errorText = (error) => ERRORS[error?.message] || 'No se pudo guardar. Probá de nuevo.';
