import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import useEvolutionStore from '../../../store/useEvolutionStore';
import {
    MagnifyingGlass,
    Package,
    Tag,
    Users,
    HouseLine,
    Plus,
    Command as CommandIcon,
    Plug,
    Bell,
} from '@phosphor-icons/react';

const CommandItem = ({ icon: Icon, label, onSelect, shortcut }) => (
    <Command.Item
        onSelect={onSelect}
        className="group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium admin-text-muted transition-all aria-selected:bg-[var(--admin-accent-soft)] aria-selected:text-[var(--admin-text)]"
    >
        <div className="flex items-center gap-3">
            <div
                className="rounded-lg p-1.5 transition-colors"
                style={{ backgroundColor: 'var(--admin-hover)' }}
            >
                <Icon size={18} weight="regular" />
            </div>
            {label}
        </div>
        {shortcut ? (
            <div className="flex items-center gap-1 opacity-40 transition-opacity group-aria-selected:opacity-100">
                {shortcut.split(' ').map((key) => (
                    <kbd
                        key={`${label}-${key}`}
                        className="rounded border px-1.5 py-0.5 text-[9px] font-mono"
                        style={{
                            backgroundColor: 'var(--admin-hover)',
                            borderColor: 'var(--admin-border)',
                            color: 'var(--admin-muted)',
                        }}
                    >
                        {key}
                    </kbd>
                ))}
            </div>
        ) : null}
    </Command.Item>
);

const CommandPalette = ({ branding, onAddItem }) => {
    const [open, setOpen] = useState(false);
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

    const runCommand = (command) => {
        command();
        setOpen(false);
    };

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Comandos Globales"
            className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh] animate-in fade-in duration-300"
        >
            <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md" aria-hidden="true" />

            <Command
                className="admin-panel-surface relative w-full max-w-[600px] overflow-hidden rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-300"
            >
                <div
                    className="admin-header-surface flex items-center border-b px-4 py-3"
                >
                    <MagnifyingGlass size={16} weight="bold" className="mr-3 admin-text-muted" />
                    <Command.Input
                        placeholder="Escribe un comando o busca..."
                        className="flex-1 border-none bg-transparent text-[13px] outline-none placeholder:text-zinc-600 admin-text-primary"
                    />
                    <div
                        className="flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                        style={{
                            backgroundColor: 'var(--admin-hover)',
                            borderColor: 'var(--admin-border)',
                            color: 'var(--admin-muted)',
                        }}
                    >
                        Esc
                    </div>
                </div>

                <Command.List className="custom-scrollbar max-h-[360px] overflow-auto p-2">
                    <Command.Empty className="py-12 text-center text-xs font-medium text-zinc-600">
                        No se encontraron resultados.
                    </Command.Empty>

                    <Command.Group heading="Navegacion Rapida" className="px-2 py-2">
                        <CommandItem icon={HouseLine} label="Dashboard" onSelect={() => runCommand(() => setActiveModule('dashboard'))} shortcut="G D" />
                        <CommandItem icon={Package} label="Catalogo de Productos" onSelect={() => runCommand(() => setActiveModule('catalog'))} shortcut="G C" />
                        <CommandItem icon={Tag} label="Categorias y Marcas" onSelect={() => runCommand(() => setActiveModule('categories'))} shortcut="G T" />
                        <CommandItem icon={Bell} label="Notificaciones" onSelect={() => runCommand(() => setActiveModule('notifications'))} shortcut="G N" />
                        <CommandItem icon={Plug} label="Integraciones ERP" onSelect={() => runCommand(() => setActiveModule('integrations'))} shortcut="G I" />
                        <CommandItem icon={Users} label="Usuarios" onSelect={() => runCommand(() => setActiveModule('users'))} shortcut="G U" />
                    </Command.Group>

                    <Command.Group heading="Acciones" className="px-2 py-2">
                        <CommandItem
                            icon={Plus}
                            label="Anadir Producto"
                            onSelect={() => runCommand(() => {
                                setActiveModule('catalog');
                                onAddItem('product');
                            })}
                            shortcut="A P"
                        />
                        <CommandItem
                            icon={Plus}
                            label="Nueva Categoria"
                            onSelect={() => runCommand(() => {
                                setActiveModule('categories');
                            })}
                            shortcut="A C"
                        />
                        <CommandItem
                            icon={Plus}
                            label="Nueva Marca"
                            onSelect={() => runCommand(() => {
                                setActiveModule('categories');
                            })}
                            shortcut="A B"
                        />
                        <CommandItem icon={CommandIcon} label="Ver Atajos de Teclado" onSelect={() => {}} />
                    </Command.Group>
                </Command.List>

                <div className="admin-header-surface flex items-center justify-between border-t px-4 py-2">
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tight admin-text-muted">
                        <div className="flex items-center gap-1">
                            <span
                                className="rounded border px-1.5 py-0.5"
                                style={{
                                    backgroundColor: 'var(--admin-hover)',
                                    borderColor: 'var(--admin-border)',
                                    color: 'var(--admin-text)',
                                }}
                            >
                                UP/DOWN
                            </span>
                            <span>Navegar</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span
                                className="rounded border px-1.5 py-0.5"
                                style={{
                                    backgroundColor: 'var(--admin-hover)',
                                    borderColor: 'var(--admin-border)',
                                    color: 'var(--admin-text)',
                                }}
                            >
                                Enter
                            </span>
                            <span>Seleccionar</span>
                        </div>
                    </div>
                    <div className="text-[10px] italic admin-accent-text">{companyName}</div>
                </div>
            </Command>
        </Command.Dialog>
    );
};

export default CommandPalette;
