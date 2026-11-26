// Desplegable de "Productos" del menú de la tienda.
// A la izquierda, la lista de rubros (compacta y con scroll). Al pasar el mouse por un rubro, a la derecha
// aparecen sus subrubros y un "Ver todo". Abajo, las marcas como chips. Los nombres en MAYÚSCULAS se muestran
// con mayúscula inicial para que se lean mejor.
import { useMemo, useState } from 'react';
import { navigate } from '../../../utils/navigation';
import { prettyLabel } from '../../../utils/prettyLabel';
import { ChevronDown } from './MenuAnchor.jsx';

const catalogHref = (id) => `/catalog?category=${encodeURIComponent(id)}`;

/** Link interno que navega sin recargar la página. */
function MenuLink({ href, className, style, children, onMouseEnter, onFocus }) {
    return (
        <a
            href={href}
            onMouseEnter={onMouseEnter}
            onFocus={onFocus}
            onClick={(event) => {
                event.preventDefault();
                navigate(href);
            }}
            className={className}
            style={style}
        >
            {children}
        </a>
    );
}

export default function ProductsMegaMenu({ categoryTree = [], brandLinks = [] }) {
    const [activeId, setActiveId] = useState(null);
    const active = useMemo(
        () => categoryTree.find((parent) => parent.id === activeId) || categoryTree.find((parent) => parent.children?.length) || categoryTree[0] || null,
        [categoryTree, activeId]
    );

    return (
        <div className="invisible absolute left-1/2 top-full z-50 mt-1 w-[min(95vw,920px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#e4e9ef] bg-white opacity-0 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] transition-all duration-150 before:absolute before:inset-x-0 before:-top-10 before:h-10 before:content-[''] group-hover:visible group-hover:opacity-100 dark:border-[#3d2f21] dark:bg-[#1a130c]">
            {categoryTree.length ? (
                <div className="grid grid-cols-[minmax(220px,300px)_1fr]">
                    {/* Rubros */}
                    <ul className="max-h-[60vh] overflow-y-auto border-r border-[#eef2f7] p-2 dark:border-[#3d2f21]">
                        {categoryTree.map((parent) => {
                            const on = active?.id === parent.id;
                            return (
                                <li key={`mega-parent-${parent.id}`}>
                                    <MenuLink
                                        href={catalogHref(parent.id)}
                                        onMouseEnter={() => setActiveId(parent.id)}
                                        onFocus={() => setActiveId(parent.id)}
                                        className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                                            on
                                                ? 'font-semibold text-[color:var(--color-primary,#ff6a00)]'
                                                : 'text-[#374151] hover:bg-[#f6f7f9] dark:text-[#e7ddd3] dark:hover:bg-white/5'
                                        }`}
                                        style={on ? { backgroundColor: 'color-mix(in srgb, var(--color-primary, #ff6a00) 10%, transparent)' } : undefined}
                                    >
                                        <span className="truncate">{prettyLabel(parent.name)}</span>
                                        {parent.children?.length ? <ChevronDown className="size-3 shrink-0 -rotate-90 opacity-60" /> : null}
                                    </MenuLink>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Subrubros del rubro elegido */}
                    <div className="flex max-h-[60vh] flex-col overflow-y-auto p-5">
                        {active ? (
                            <>
                                <div className="mb-3 flex items-baseline justify-between gap-4">
                                    <p className="text-lg font-bold text-[#111827] dark:text-white">{prettyLabel(active.name)}</p>
                                    <MenuLink href={catalogHref(active.id)} className="shrink-0 text-sm font-semibold text-[color:var(--color-primary,#ff6a00)] hover:underline">
                                        Ver todo →
                                    </MenuLink>
                                </div>
                                {active.children?.length ? (
                                    <div className="grid grid-cols-2 gap-1 lg:grid-cols-3">
                                        {active.children.map((child) => (
                                            <MenuLink
                                                key={`mega-child-${child.id}`}
                                                href={catalogHref(child.id)}
                                                className="truncate rounded-lg px-3 py-2 text-[13.5px] text-[#4b5563] transition-colors hover:bg-[#f6f7f9] hover:text-[color:var(--color-primary,#ff6a00)] dark:text-[#cdbca9] dark:hover:bg-white/5"
                                            >
                                                {prettyLabel(child.name)}
                                            </MenuLink>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-[#6b7280] dark:text-[#a59280]">Todos los productos de este rubro están en “Ver todo”.</p>
                                )}
                            </>
                        ) : null}

                        {brandLinks.length ? (
                            <div className="mt-auto border-t border-[#eef2f7] pt-4 dark:border-[#3d2f21]">
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b7280] dark:text-[#a59280]">Marcas</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {brandLinks.slice(0, 24).map((item) => (
                                        <MenuLink
                                            key={`mega-brand-${item.href}`}
                                            href={item.href}
                                            className="rounded-full border border-[#e4e9ef] px-3 py-1 text-[12.5px] text-[#374151] transition-colors hover:border-[color:var(--color-primary,#ff6a00)] hover:text-[color:var(--color-primary,#ff6a00)] dark:border-[#3d2f21] dark:text-[#e7ddd3]"
                                        >
                                            {prettyLabel(item.label)}
                                        </MenuLink>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : (
                <p className="p-6 text-sm text-[#6b7280] dark:text-[#a59280]">No hay categorías disponibles.</p>
            )}
        </div>
    );
}
