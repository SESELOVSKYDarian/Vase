import React from 'react';
import { Tag, BookmarkSimple } from '@phosphor-icons/react';

const fieldClass =
    "w-full rounded-xl border border-white/25 bg-zinc-900/70 px-3 py-2.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30";

const compactFieldClass =
    "w-full rounded-lg border border-white/25 bg-zinc-900/70 px-2.5 py-1.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30";

const sectionTitleClass = "text-[11px] font-bold uppercase tracking-widest text-evolution-indigo";
const sectionLabelClass = "text-[10px] uppercase font-bold tracking-widest text-zinc-500";

const CategoriesEditor = ({ manager, categories = [], brands = [] }) => {
    if (!manager) return null;

    const {
        newCategoryName,
        newCategoryParentId,
        categorySaving,
        categoryDeletingId,
        newBrandName,
        brandSaving,
        brandDeletingName,
        setNewCategoryName,
        setNewCategoryParentId,
        handleCreateCategory,
        handleDeleteCategory,
        setNewBrandName,
        handleCreateBrand,
        handleDeleteBrand,
    } = manager;

    const parentCategories = (Array.isArray(categories) ? categories : []).filter((item) => !item.parent_id);
    const categoryGroups = React.useMemo(() => {
        const byId = new Map();
        (Array.isArray(categories) ? categories : []).forEach((item) => {
            if (!item?.id || !item?.name) return;
            byId.set(item.id, { ...item, children: [] });
        });

        const roots = [];
        byId.forEach((node) => {
            if (node.parent_id && byId.has(node.parent_id)) {
                byId.get(node.parent_id).children.push(node);
                return;
            }
            roots.push(node);
        });
        return roots;
    }, [categories]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-white">Categorias y marcas</h2>
                <p className="text-sm text-zinc-400">
                    Crea categorias principales, subcategorias y mantene el listado de marcas separado de productos.
                </p>
            </div>

            <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2">
                    <Tag size={16} weight="bold" className="text-evolution-indigo" />
                    <p className={sectionTitleClass}>Categorias</p>
                </div>

                <div className="space-y-1">
                    <p className={sectionLabelClass}>Categorias</p>
                    <p className="text-[11px] text-zinc-400">Crea categorias principales y subcategorias.</p>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
                    <input
                        type="text"
                        value={newCategoryName}
                        placeholder="Ej: Accesorios"
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className={fieldClass}
                    />
                    <select
                        value={newCategoryParentId || ''}
                        onChange={(e) => setNewCategoryParentId(e.target.value)}
                        className={fieldClass}
                    >
                        <option value="">Raiz</option>
                        {parentCategories.map((parent) => (
                            <option key={parent.id} value={parent.id} className="bg-zinc-900">
                                {parent.name}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={categorySaving || !String(newCategoryName || '').trim()}
                        className="rounded-xl bg-evolution-indigo px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-evolution-indigo/90 disabled:opacity-60"
                    >
                        {categorySaving ? 'Guardando...' : 'Agregar'}
                    </button>
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    {categoryGroups.length > 0 ? (
                        categoryGroups.map((group) => (
                            <div key={group.id} className="space-y-2">
                                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200">
                                    <span className="font-bold">{group.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteCategory(group.id, group.name)}
                                        disabled={categoryDeletingId === group.id}
                                        className="text-[11px] font-bold text-rose-300 transition-colors hover:text-rose-200 disabled:opacity-60"
                                    >
                                        {categoryDeletingId === group.id ? '...' : 'Eliminar'}
                                    </button>
                                </div>

                                {group.children?.length ? (
                                    <div className="ml-4 flex flex-wrap gap-2">
                                        {group.children.map((child) => (
                                            <button
                                                key={child.id}
                                                type="button"
                                                onClick={() => handleDeleteCategory(child.id, child.name)}
                                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-zinc-300 transition-colors hover:text-white"
                                            >
                                                {child.name} - {categoryDeletingId === child.id ? '...' : 'Eliminar'}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm italic text-zinc-500">Todavia no hay categorias creadas.</p>
                    )}
                </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2">
                    <BookmarkSimple size={16} weight="bold" className="text-evolution-indigo" />
                    <p className={sectionTitleClass}>Marcas</p>
                </div>

                <div className="space-y-1">
                    <p className={sectionLabelClass}>Marcas</p>
                    <p className="text-[11px] text-zinc-400">Ejemplo: Nova, Atlas, Vertex.</p>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                        type="text"
                        value={newBrandName}
                        placeholder="Ej: Nova"
                        onChange={(e) => setNewBrandName(e.target.value)}
                        className={fieldClass}
                    />
                    <button
                        type="button"
                        onClick={handleCreateBrand}
                        disabled={brandSaving || !String(newBrandName || '').trim()}
                        className="rounded-xl bg-evolution-indigo px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-evolution-indigo/90 disabled:opacity-60"
                    >
                        {brandSaving ? 'Guardando...' : 'Agregar'}
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/20 p-4">
                    {brands.length > 0 ? (
                        brands.map((brandName) => (
                            <button
                                key={brandName}
                                type="button"
                                onClick={() => handleDeleteBrand(brandName)}
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-zinc-300 transition-colors hover:text-white"
                            >
                                {brandName} - {brandDeletingName === brandName ? '...' : 'Eliminar'}
                            </button>
                        ))
                    ) : (
                        <p className="text-sm italic text-zinc-500">Todavia no hay marcas cargadas.</p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default CategoriesEditor;
