// Clientes tal como los ve el comercio: estado, filtros y quién no es cliente.

export const ROLE = { retail: 'Minorista', wholesale: 'Mayorista' };

export function clientState(client) {
    if (client.status === 'inactive') return { id: 'blocked', label: 'Bloqueado', tone: 'r' };
    if (client.status === 'pending' && client.role === 'wholesale') return { id: 'wholesale_request', label: 'Pidió ser mayorista', tone: 'y' };
    if (client.status === 'pending') return { id: 'pending', label: 'Por aprobar', tone: 'y' };
    return { id: 'active', label: 'Activo', tone: 'g' };
}

export const CLIENT_FILTERS = [
    ['pendientes', 'Por aprobar', (client) => client.status === 'pending'],
    ['mayoristas', 'Mayoristas', (client) => client.role === 'wholesale' && client.status === 'active'],
    ['minoristas', 'Minoristas', (client) => client.role === 'retail' && client.status === 'active'],
    ['bloqueados', 'Bloqueados', (client) => client.status === 'inactive'],
    ['todos', 'Todos', () => true],
];

// Los usuarios del panel (administradores) no son clientes: se ven en Ajustes › Equipo.
export const isClient = (user) => user.role !== 'tenant_admin' && user.global_role !== 'master_admin';
