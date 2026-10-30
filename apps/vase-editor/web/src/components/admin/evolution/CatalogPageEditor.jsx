import React, { useState } from 'react';
import {
    ArrowCounterClockwise,
    Eye,
    EyeSlash,
    FloppyDisk,
    Plus,
    UploadSimple,
    X,
} from '@phosphor-icons/react';
import EvolutionInput from './EvolutionInput';
import { PIQUIM_CATALOG_CARDS } from '../../../data/piquimBranding';
import { normalizeCardTags, resolveCatalogCards } from '../../../utils/catalogCards';
import { uploadPublicFile } from '../../../utils/uploadsClient';
import { useToast } from '../../../context/ToastContext';
import { cn } from '../../../utils/cn';

const INLINE_IMAGE_MAX_BYTES = 600 * 1024;

const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const TagsField = ({ tags, onChange }) => {
    const [draft, setDraft] = useState('');

    const commit = (raw) => {
        const incoming = normalizeCardTags(raw);
        if (!incoming.length) return;
        const known = new Set(tags.map((tag) => tag.toLowerCase()));
        const additions = incoming.filter((tag) => !known.has(tag.toLowerCase()));
        if (additions.length) onChange([...tags, ...additions]);
        setDraft('');
    };

    return (
        <div className="space-y-2">
            <label className="admin-input-label pl-0.5 text-[11px] font-bold tracking-wide">Etiquetas</label>
            <div className="flex flex-wrap gap-1.5">
                {tags.length === 0 ? <p className="text-[11px] text-zinc-500">Sin etiquetas: la tarjeta no muestra ninguna.</p> : null}
                {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 py-1 pl-3 pr-1.5 text-xs font-semibold text-white">
                        {tag}
                        <button
                            type="button"
                            aria-label={`Quitar etiqueta ${tag}`}
                            onClick={() => onChange(tags.filter((item) => item !== tag))}
                            className="flex size-5 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/15 hover:text-white"
                        >
                            <X size={11} weight="bold" />
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ',') {
                            event.preventDefault();
                            commit(draft);
                        }
                    }}
                    onBlur={() => commit(draft)}
                    placeholder="Escribi una etiqueta y presiona Enter"
                    className="admin-input-field w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200"
                />
                <button
                    type="button"
                    onClick={() => commit(draft)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-bold text-white transition-colors hover:bg-white/20"
                >
                    <Plus size={13} weight="bold" />
                    Agregar
                </button>
            </div>
        </div>
    );
};

const CardPreview = ({ card }) => (
    <div className={cn('relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#1A1614]', card.hidden && 'opacity-40 grayscale')}>
        <img src={card.image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: card.objectPosition || 'center' }} />
        <div className="absolute inset-0" style={{ background: card.overlay }} />
        <div className="absolute inset-x-3 bottom-4 flex flex-col items-center gap-1.5 text-center">
            <span className="text-[8px] font-bold tracking-[0.18em] text-white">{card.prefix}</span>
            <span className="text-xl font-black italic leading-none text-[#FF4D00]">{card.title}</span>
            <div className="flex flex-wrap justify-center gap-1">
                {card.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/15 px-1.5 py-0.5 text-[7px] font-medium text-white outline outline-1 -outline-offset-1 outline-white/80">{tag}</span>
                ))}
            </div>
        </div>
        {card.hidden ? (
            <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Oculta</span>
        ) : null}
    </div>
);

const CatalogPageEditor = ({ settings, setSettings, onSave, isSaving }) => {
    const { addToast } = useToast();
    const [uploadingId, setUploadingId] = useState('');
    const cards = resolveCatalogCards(settings?.branding?.catalog_cards);
    const visibleCount = cards.filter((card) => !card.hidden).length;

    const writeCards = (nextCards) => {
        setSettings((prev) => ({
            ...prev,
            branding: {
                ...(prev.branding || {}),
                catalog_cards: nextCards,
            },
        }));
    };

    const updateCard = (id, patch) => {
        writeCards(resolveCatalogCards(settings?.branding?.catalog_cards).map((card) => (card.id === id ? { ...card, ...patch } : card)));
    };

    const restoreCard = (id) => {
        const base = PIQUIM_CATALOG_CARDS.find((card) => card.id === id);
        if (base) updateCard(id, { ...base, hidden: false });
    };

    const handleImageUpload = async (card, event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingId(card.id);
        try {
            // Se guarda la URL del archivo subido: un base64 dentro de los ajustes se descarga en cada visita a la tienda.
            const publicUrl = await uploadPublicFile(file);
            updateCard(card.id, { image: publicUrl });
        } catch (error) {
            console.error('Catalog card image upload failed', error);
            if (file.size <= INLINE_IMAGE_MAX_BYTES) {
                const dataUrl = await readFileAsDataUrl(file).catch(() => '');
                if (dataUrl) {
                    updateCard(card.id, { image: dataUrl });
                    return;
                }
            }
            addToast?.('No se pudo subir la imagen. Proba de nuevo o pega una URL.', 'error');
        } finally {
            setUploadingId('');
            event.target.value = '';
        }
    };

    return (
        <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight text-white">Pagina Catalogo</h2>
                    <p className="max-w-xl text-sm font-medium text-zinc-500">
                        Las dos tarjetas con las que arranca el catalogo. Cambia sus textos e imagen, o sacalas de la pagina con el interruptor.
                        Si ocultas las dos, el catalogo muestra directamente todos los productos.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
                >
                    <FloppyDisk size={15} weight="bold" />
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>

            {visibleCount === 0 ? (
                <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-semibold text-amber-200">
                    Las dos tarjetas estan ocultas: la pagina Catalogo se abre directo con el listado de productos.
                </p>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-2">
                {cards.map((card, index) => (
                    <section key={card.id} className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Tarjeta {index + 1}</p>
                                <h3 className="text-base font-bold text-white">{card.title}</h3>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={!card.hidden}
                                onClick={() => updateCard(card.id, { hidden: !card.hidden })}
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                                    card.hidden
                                        ? 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                                        : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20'
                                )}
                            >
                                {card.hidden ? <EyeSlash size={14} weight="bold" /> : <Eye size={14} weight="bold" />}
                                {card.hidden ? 'Oculta' : 'Visible'}
                            </button>
                        </div>

                        <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
                            <div className="space-y-3">
                                <CardPreview card={card} />
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20">
                                        <input type="file" accept="image/*" className="hidden" disabled={uploadingId === card.id} onChange={(event) => handleImageUpload(card, event)} />
                                        <UploadSimple size={14} weight="bold" />
                                        {uploadingId === card.id ? 'Subiendo...' : 'Cambiar imagen'}
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <EvolutionInput label="Titulo" value={card.title} onChange={(event) => updateCard(card.id, { title: event.target.value })} />
                                <EvolutionInput label="Prefijo" value={card.prefix} onChange={(event) => updateCard(card.id, { prefix: event.target.value })} placeholder="Ej: 01 - Frio que enamora" />
                                <TagsField tags={card.tags} onChange={(tags) => updateCard(card.id, { tags })} />
                                <EvolutionInput label="Descripcion" value={card.description} onChange={(event) => updateCard(card.id, { description: event.target.value })} multiline />
                                <EvolutionInput
                                    label="Imagen (URL)"
                                    value={card.image?.startsWith('data:') ? '' : card.image}
                                    onChange={(event) => updateCard(card.id, { image: event.target.value })}
                                    placeholder={card.image?.startsWith('data:') ? 'Imagen cargada desde tu equipo' : 'https://...'}
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => restoreCard(card.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
                        >
                            <ArrowCounterClockwise size={13} weight="bold" />
                            Restaurar valores originales
                        </button>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default CatalogPageEditor;
