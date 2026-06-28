import React, { useEffect, useMemo, useState } from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import useEvolutionStore from '../../../store/useEvolutionStore';
import {
    ArrowUpRight,
    Bell,
    CreditCard,
    HouseLine,
    MagnifyingGlass,
    Package,
    Palette,
    Percent,
    Plug,
    Plus,
    ShoppingBag,
    Tag,
    Truck,
    Users,
    X,
} from '@phosphor-icons/react';
import { cn } from '../../../utils/cn';

const MODULE_COMMANDS = [
    { id: 'dashboard', label: 'Dashboard', description: 'Resumen general y actividad del panel.', icon: Package, shortcut: 'G D' },
    { id: 'home', label: 'Inicio', description: 'Editar portada y secciones principales.', icon: HouseLine, shortcut: 'G H' },
    { id: 'appearance', label: 'Apariencia', description: 'Tema, colores, marca y experiencia visual.', icon: Palette, shortcut: 'G A' },
    { id: 'catalog', label: 'Catalogo', description: 'Productos, stock, imagenes y datos comerciales.', icon: ShoppingBag, shortcut: 'G C' },
    { id: 'categories', label: 'Categorias', description: 'Categorias, subcategorias y marcas.', icon: Tag, shortcut: 'G T' },
    { id: 'pricing', label: 'Ofertas', description: 'Promociones y reglas comerciales.', icon: Percent, shortcut: 'G O' },
    { id: 'checkout', label: 'Checkout', description: 'Pagos, datos fiscales y confirmacion de pedido.', icon: CreditCard, shortcut: 'G P' },
    { id: 'shipping', label: 'Envios', description: 'Zonas, radios y metodos de entrega.', icon: Truck, shortcut: 'G E' },
    { id: 'notifications', label: 'Notificaciones', description: 'Usuarios pendientes, pagos y alertas.', icon: Bell, shortcut: 'G N' },
    { id: 'integrations', label: 'Integraciones ERP', description: 'Tokens, endpoints y sincronizacion externa.', icon: Plug, shortcut: 'G I' },
    { id: 'users', label: 'Usuarios', description: 'Clientes, permisos, precios y actividad.', icon: Users, shortcut: 'G U' },
];

const TYPE_META = {
    module: { label: 'Modulo', icon: Package },
    product: { label: 'Producto', icon: ShoppingBag },
    category: { label: 'Categoria', icon: Tag },
    brand: { label: 'Marca', icon: Tag },
    user: { label: 'Usuario', icon: Users },
    payment: { label: 'Pago', icon: CreditCard },
    notification: { label: 'Alerta', icon: Bell },
};

const Kbd = ({ children }) => (
    <kbd
        className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 text-[10px] font-black uppercase tracking-wide"
        style={{
            backgroundColor: 'var(--admin-panel-bg)',
            borderColor: 'var(--admin-border-soft)',
            color: 'var(--admin-text)',
        }}
    >
        {children}
    </kbd>
);

const Shortcut = ({ value }) => {
    if (!value) return null;
    return (
        <div className="hidden items-center gap-1 opacity-70 transition-opacity group-aria-selected:opacity-100 sm:flex">
            {String(value).split(' ').map((key) => (
                <Kbd key={`${value}-${key}`}>{key}</Kbd>
            ))}
        </div>
    );
};

const PaletteItem = ({ icon: Icon, label, description, badge, shortcut, onSelect, value }) => (
    <CommandPrimitive.Item
        value={value || `${label} ${description || ''} ${badge || ''}`}
        onSelect={onSelect}
        className={cn(
            'group flex cursor-pointer items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-all',
            'aria-selected:border-[var(--admin-accent-border)] aria-selected:bg-[var(--admin-accent-soft)] aria-selected:shadow-sm'
        )}
    >
        <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors group-aria-selected:border-[var(--admin-accent-border)]"
            style={{
                backgroundColor: 'var(--admin-hover)',
                borderColor: 'var(--admin-border-soft)',
                color: 'var(--admin-text)',
            }}
        >
            <Icon size={19} weight="bold" />
        </div>
        <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-bold admin-text-primary">{label}</p>
                {badge ? (
                    <span
                        className="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em]"
                        style={{
                            borderColor: 'var(--admin-border-soft)',
                            color: 'var(--admin-muted)',
                        }}
                    >
                        {badge}
                    </span>
                ) : null}
            </div>
            {description ? (
                <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 admin-text-muted">{description}</p>
            ) : null}
        </div>
        <Shortcut value={shortcut} />
        <ArrowUpRight size={15} weight="bold" className="hidden opacity-0 transition-opacity group-aria-selected:opacity-70 sm:block" />
    </CommandPrimitive.Item>
);

const PaletteGroup = ({ title, children }) => (
    <CommandPrimitive.Group
        heading={title}
        className="px-2 py-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.22em] [&_[cmdk-group-heading]]:text-[var(--admin-muted)]"
    >
        {children}
    </CommandPrimitive.Group>
);

const CommandPalette = ({ branding, onAddItem, searchItems = [] }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const { setActiveModule } = useEvolutionStore();
    const adminTitle = branding?.title || 'Panel de administracion';
    const companyName = branding?.companyName || adminTitle;

    useEffect(() => {
        const down = (event) => {
            if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                setOpen((current) => !current);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    useEffect(() => {
        if (!open) setQuery('');
    }, [open]);

    const dynamicItems = useMemo(
        () => (Array.isArray(searchItems) ? searchItems : [])
            .filter((item) => item?.id && item?.label && typeof item.onSelect === 'function')
            .slice(0, 28),
        [searchItems]
    );

    const runCommand = (command) => {
        if (typeof command === 'function') command();
        setOpen(false);
    };

    return (
        <CommandPrimitive.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Comandos globales"
            className="fixed inset-0 z-[10000] flex items-start justify-center px-4 py-6 sm:pt-[10vh]"
        >
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-[5px]" aria-hidden="true" />

            <CommandPrimitive
                shouldFilter
                className="admin-panel-surface relative flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border shadow-[0_30px_110px_rgba(2,6,23,0.45)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200"
            >
                <div className="admin-header-surface border-b px-5 py-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] admin-accent-text">Comandos</p>
                            <h2 className="mt-1 truncate text-xl font-black tracking-tight admin-text-primary">{companyName}</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="admin-hover-surface flex h-9 w-9 shrink-0 items-center justify-center rounded-xl admin-text-muted transition-colors hover:text-[var(--admin-text)]"
                            aria-label="Cerrar comandos"
                        >
                            <X size={17} weight="bold" />
                        </button>
                    </div>

                    <div
                        className="flex min-h-14 items-center gap-3 rounded-2xl border px-4"
                        style={{
                            backgroundColor: 'var(--admin-hover)',
                            borderColor: 'var(--admin-border-soft)',
                        }}
                    >
                        <MagnifyingGlass size={20} weight="bold" className="admin-text-muted" />
                        <CommandPrimitive.Input
                            value={query}
                            onValueChange={setQuery}
                            placeholder="Buscar modulos, productos, usuarios o acciones..."
                            className="min-w-0 flex-1 border-none bg-transparent text-[15px] font-semibold outline-none placeholder:text-zinc-500 admin-text-primary"
                        />
                        <div className="hidden items-center gap-1 sm:flex">
                            <Kbd>Esc</Kbd>
                        </div>
                    </div>
                </div>

                <CommandPrimitive.List className="custom-scrollbar min-h-[360px] overflow-y-auto p-3">
                    <CommandPrimitive.Empty className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <div
                            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
                            style={{
                                backgroundColor: 'var(--admin-hover)',
                                borderColor: 'var(--admin-border-soft)',
                            }}
                        >
                            <MagnifyingGlass size={24} weight="bold" className="admin-text-muted" />
                        </div>
                        <p className="text-sm font-bold admin-text-primary">No encontramos resultados</p>
                        <p className="mt-1 max-w-sm text-xs leading-5 admin-text-muted">
                            Proba con el nombre de un modulo, SKU, producto, cliente o accion del panel.
                        </p>
                    </CommandPrimitive.Empty>

                    {dynamicItems.length ? (
                        <PaletteGroup title="Resultados del panel">
                            {dynamicItems.map((item) => {
                                const meta = TYPE_META[item.kind] || TYPE_META.module;
                                const Icon = meta.icon;
                                return (
                                    <PaletteItem
                                        key={item.id}
                                        icon={Icon}
                                        label={item.label}
                                        description={item.description}
                                        badge={meta.label}
                                        value={`${item.label} ${item.description || ''} ${item.keywords || ''}`}
                                        onSelect={() => runCommand(item.onSelect)}
                                    />
                                );
                            })}
                        </PaletteGroup>
                    ) : null}

                    <PaletteGroup title="Navegacion">
                        {MODULE_COMMANDS.map((item) => (
                            <PaletteItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                description={item.description}
                                shortcut={item.shortcut}
                                value={`${item.label} ${item.description}`}
                                onSelect={() => runCommand(() => setActiveModule(item.id))}
                            />
                        ))}
                    </PaletteGroup>

                    <PaletteGroup title="Acciones">
                        <PaletteItem
                            icon={Plus}
                            label="Anadir producto"
                            description="Abre el catalogo y prepara el inspector para cargar un producto."
                            shortcut="A P"
                            onSelect={() => runCommand(() => {
                                setActiveModule('catalog');
                                if (typeof onAddItem === 'function') onAddItem('product');
                            })}
                        />
                        <PaletteItem
                            icon={Tag}
                            label="Ir a categorias"
                            description="Crear, ordenar o editar categorias y marcas."
                            shortcut="A C"
                            onSelect={() => runCommand(() => setActiveModule('categories'))}
                        />
                        <PaletteItem
                            icon={Plug}
                            label="Ver endpoints de integracion"
                            description="Consultar credenciales y URLs para el sistema de gestion."
                            shortcut="A I"
                            onSelect={() => runCommand(() => setActiveModule('integrations'))}
                        />
                    </PaletteGroup>
                </CommandPrimitive.List>

                <div className="admin-header-surface flex flex-col gap-2 border-t px-5 py-3 text-[10px] font-bold uppercase tracking-wide admin-text-muted sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1"><Kbd>UP</Kbd><Kbd>DOWN</Kbd> navegar</span>
                        <span className="flex items-center gap-1"><Kbd>Enter</Kbd> abrir</span>
                        <span className="flex items-center gap-1"><Kbd>Esc</Kbd> cerrar</span>
                    </div>
                    <span className="admin-accent-text">{query ? `Buscando: ${query}` : 'Ctrl+K'}</span>
                </div>
            </CommandPrimitive>
        </CommandPrimitive.Dialog>
    );
};

export default CommandPalette;
