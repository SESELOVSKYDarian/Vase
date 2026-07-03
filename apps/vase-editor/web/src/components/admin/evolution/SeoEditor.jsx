import React, { useMemo } from 'react';
import { Copy, ShieldCheck, GlobeHemisphereWest, Code, SealWarning } from '@phosphor-icons/react';
import EvolutionInput from './EvolutionInput';
import { buildGtmSnippets, normalizeSeoSettings } from '../../../utils/seo';

const SeoEditor = ({ settings, setSettings, onSave, isSaving }) => {
    const seo = useMemo(() => normalizeSeoSettings(settings?.seo || {}), [settings?.seo]);
    const gtmSnippets = useMemo(
        () => buildGtmSnippets(seo.tracking?.googleTagManagerContainerId),
        [seo.tracking?.googleTagManagerContainerId]
    );

    const updateSeo = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            seo: {
                ...(prev.seo || {}),
                [field]: value,
            },
        }));
    };

    const updateTracking = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            seo: {
                ...(prev.seo || {}),
                tracking: {
                    ...normalizeSeoSettings(prev.seo || {}).tracking,
                    [field]: value,
                },
            },
        }));
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.warn('No se pudo copiar el snippet', err);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold text-white tracking-tight">SEO</h2>
                <p className="text-sm text-zinc-500 font-medium">
                    Ajusta el texto que Google ve y agrega Google Tag Manager por cliente.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-zinc-dark border border-white/5 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                                <GlobeHemisphereWest size={20} weight="bold" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Metadatos del sitio</h3>
                                <p className="text-xs text-zinc-500">Se usan en la home y como base para el storefront.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <EvolutionInput
                                label="Titulo SEO"
                                value={seo.title}
                                onChange={(event) => updateSeo('title', event.target.value)}
                                placeholder="Tu marca | Catalogo online"
                            />
                            <EvolutionInput
                                label="Descripcion SEO"
                                value={seo.description}
                                onChange={(event) => updateSeo('description', event.target.value)}
                                placeholder="Describe en una frase lo que vende tu cliente."
                                multiline
                            />
                            <EvolutionInput
                                label="Canonical"
                                value={seo.canonicalPath}
                                onChange={(event) => updateSeo('canonicalPath', event.target.value)}
                                placeholder="/"
                                helperText="Usa una ruta relativa como /, /catalog o una URL completa."
                            />
                            <EvolutionInput
                                label="Keyword principal"
                                value={seo.keyword}
                                onChange={(event) => updateSeo('keyword', event.target.value)}
                                placeholder="heladeras, sanitarios, muebles..."
                            />
                            <EvolutionInput
                                label="Keywords secundarias"
                                value={seo.secondaryKeywords.join(', ')}
                                onChange={(event) => updateSeo('secondaryKeywords', event.target.value)}
                                placeholder="keyword 1, keyword 2, keyword 3"
                                helperText="Separadas por coma. Se guardan por cliente."
                            />
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-zinc-dark border border-white/5 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <ShieldCheck size={20} weight="bold" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Indexacion y redes</h3>
                                <p className="text-xs text-zinc-500">Controla si Google indexa el sitio y el texto compartido.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <EvolutionInput
                                label="Titulo OG"
                                value={seo.ogTitle}
                                onChange={(event) => updateSeo('ogTitle', event.target.value)}
                                placeholder="Titulo para compartir"
                            />
                            <EvolutionInput
                                label="Descripcion OG"
                                value={seo.ogDescription}
                                onChange={(event) => updateSeo('ogDescription', event.target.value)}
                                placeholder="Descripcion para WhatsApp, Facebook y X"
                                multiline
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => updateSeo('indexable', !seo.indexable)}
                            className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors"
                            style={{
                                backgroundColor: 'var(--admin-hover)',
                                borderColor: 'var(--admin-border)',
                                color: 'var(--admin-text)',
                            }}
                        >
                            <div>
                                <p className="text-sm font-semibold text-white">Permitir indexacion</p>
                                <p className="text-xs text-zinc-500">Si lo desactivas, se agrega noindex,nofollow.</p>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-[0.16em]">
                                {seo.indexable ? 'Activo' : 'Bloqueado'}
                            </span>
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-zinc-dark border border-white/5 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                                <Code size={20} weight="bold" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Google Tag Manager</h3>
                                <p className="text-xs text-zinc-500">Se genera el script del head y el noscript del body.</p>
                            </div>
                        </div>

                        <EvolutionInput
                            label="Container ID"
                            value={seo.tracking?.googleTagManagerContainerId || ''}
                            onChange={(event) => updateTracking('googleTagManagerContainerId', event.target.value)}
                            placeholder="GTM-XXXXXXX"
                            helperText="Se guarda por cliente y se aplica al storefront de ese sitio."
                        />

                        <button
                            type="button"
                            onClick={() => updateTracking('enabled', !seo.tracking?.enabled)}
                            className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors"
                            style={{
                                backgroundColor: 'var(--admin-hover)',
                                borderColor: 'var(--admin-border)',
                                color: 'var(--admin-text)',
                            }}
                        >
                            <div>
                                <p className="text-sm font-semibold text-white">Activar tracking</p>
                                <p className="text-xs text-zinc-500">Desactivalo si el cliente aun no lo quiere publicar.</p>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-[0.16em]">
                                {seo.tracking?.enabled ? 'ON' : 'OFF'}
                            </span>
                        </button>

                        <EvolutionInput
                            label="Notas internas"
                            value={seo.tracking?.notes || ''}
                            onChange={(event) => updateTracking('notes', event.target.value)}
                            multiline
                            placeholder="Ej: este tag pertenece al cliente X."
                        />
                    </div>

                    <div className="p-6 rounded-3xl bg-zinc-dark border border-white/5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-white">Snippets</h3>
                                <p className="text-xs text-zinc-500">Vista previa del codigo que se insertara.</p>
                            </div>
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? 'Guardando' : 'Guardar'}
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Head</p>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(gtmSnippets.head)}
                                        className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-200 hover:bg-white/10"
                                    >
                                        <Copy size={12} weight="bold" />
                                        Copiar
                                    </button>
                                </div>
                                <pre className="custom-scrollbar overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-zinc-300">
                                    {gtmSnippets.head || '<!-- Agrega un Container ID para ver el snippet -->'}
                                </pre>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Body</p>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(gtmSnippets.body)}
                                        className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-200 hover:bg-white/10"
                                    >
                                        <Copy size={12} weight="bold" />
                                        Copiar
                                    </button>
                                </div>
                                <pre className="custom-scrollbar overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-zinc-300">
                                    {gtmSnippets.body || '<!-- Agrega un Container ID para ver el snippet -->'}
                                </pre>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-50">
                            <div className="flex items-center gap-2 font-semibold">
                                <SealWarning size={16} weight="bold" />
                                Recomendacion
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-amber-50/85">
                                Este modulo esta preparado para que cada cliente tenga su propio tag y su propia
                                configuracion SEO sin tocar la base del resto de los sitios.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeoEditor;
