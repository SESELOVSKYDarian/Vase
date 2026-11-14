// Parte de AjustesForms.jsx: Toggle, SaveBar, copy, AjustesSeo, EMAIL_INITIAL, emailRequest.
import { useState } from 'react';
import { getAdminTenantHeaders, getApiBase } from '../../../utils/api';
import { uploadPublicFile } from '../../../utils/uploadsClient';
import { normalizeSeoSettings } from '../../../utils/seo';
import { keywordsAdd, seoLimit } from '../../ajustes';
import { PanelCard, PanelSegmented, PanelTag } from '@vase/ui/panel/pieces';

export const Toggle = ({ on, onChange, label }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`vp-tog ${on ? '' : 'off'}`} onClick={() => onChange(!on)} />
);

export const SaveBar = ({ dirty, saving, onSave, label = 'Guardar' }) => (
    <div className="vp-floatsave">
        <span>{dirty ? 'Tenés cambios sin guardar.' : 'Todo guardado.'}</span>
        <button type="button" className="vp-btn acc" onClick={onSave} disabled={saving}>{saving ? 'Guardando…' : label}</button>
    </div>
);

export const copy = (text, toast) => {
    navigator.clipboard?.writeText(text);
    toast?.('Copiado', 'success');
};

// ───────────── Google, redes y SEO ─────────────
export function AjustesSeo({ editor, onSave, storeName, domain }) {
    const seo = normalizeSeoSettings(editor.settings?.seo || {});
    const branding = editor.settings?.branding || {};
    const socials = branding.footer?.socials || {};
    const commerce = editor.settings?.commerce || {};
    const [tab, setTab] = useState('basico');
    const [keyword, setKeyword] = useState('');
    const [uploading, setUploading] = useState(false);

    const setSeo = (patch) => editor.setSettings((prev) => ({ ...prev, seo: { ...normalizeSeoSettings(prev?.seo || {}), ...patch } }));
    const setTracking = (patch) => setSeo({ tracking: { ...seo.tracking, ...patch } });
    const setBranding = (patch) => editor.setSettings((prev) => ({ ...prev, branding: { ...(prev?.branding || {}), ...patch } }));
    const setSocial = (key, value) => editor.setSettings((prev) => {
        const footer = (prev?.branding || {}).footer || {};
        return { ...prev, branding: { ...(prev?.branding || {}), footer: { ...footer, socials: { ...(footer.socials || {}), [key]: value } } } };
    });

    const words = [seo.keyword, ...seo.secondaryKeywords].filter(Boolean);
    const setWords = (list) => setSeo({ keyword: list[0] || '', secondaryKeywords: list.slice(1) });
    const autoTitle = `${storeName || 'Tu tienda'} | Tienda online`;
    const autoDescription = `Comprá online en ${storeName || 'tu tienda'}: catálogo, precios y pedidos.`;
    const title = seo.title || autoTitle;
    const description = seo.description || autoDescription;
    const titleCount = seoLimit(seo.title || autoTitle, 60);
    const descCount = seoLimit(seo.description || autoDescription, 160);
    const favicon = branding.favicon_url || '';

    const uploadFavicon = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const result = await uploadPublicFile(file);
            const url = result?.url || result?.public_url || result;
            if (typeof url === 'string') setBranding({ favicon_url: url });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="vp-scol vp-seo">
            <div className="vp-pgrid">
                <PanelCard
                    stack
                    className="vp-card vp-sec"
                    title="En Google"
                    description="Si dejás un campo vacío se usa el texto automático (en gris)."
                    actions={<PanelSegmented fill style={{ width: 200 }} value={tab} onChange={setTab} options={[{ value: 'basico', label: 'Básico' }, { value: 'avanzado', label: 'Avanzado' }]} />}
                >
                    <div className="vp-gprev" aria-label="Así se ve en Google">
                        <small>{domain || 'tu-tienda.vase.ar'}</small>
                        <b>{title}</b>
                        <span>{description}</span>
                    </div>
                    {tab === 'basico' ? (
                        <>
                            <div className="vp-fld">
                                <label htmlFor="seo-title">Título · <em className={titleCount.over ? 'over' : ''}>{titleCount.text}</em></label>
                                <input id="seo-title" className="vp-inp" placeholder={autoTitle} value={seo.title} onChange={(event) => setSeo({ title: event.target.value })} />
                            </div>
                            <div className="vp-fld">
                                <label htmlFor="seo-desc">Descripción · <em className={descCount.over ? 'over' : ''}>{descCount.text}</em></label>
                                <textarea id="seo-desc" className="vp-inp ta" rows={3} placeholder={autoDescription} value={seo.description} onChange={(event) => setSeo({ description: event.target.value })} />
                            </div>
                            <div className="vp-fld">
                                <span className="vp-fl">Palabras con las que te buscan</span>
                                <div className="vp-chips">
                                    {words.map((word, index) => (
                                        <span key={word} className="vp-chip">{word}<button type="button" aria-label={`Quitar ${word}`} onClick={() => setWords(words.filter((_, i) => i !== index))}>×</button></span>
                                    ))}
                                    <form className="vp-chipadd" onSubmit={(event) => { event.preventDefault(); setWords(keywordsAdd(words, keyword)); setKeyword(''); }}>
                                        <input aria-label="Nueva palabra" placeholder="+ Agregar" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
                                    </form>
                                </div>
                                <span className="vp-note">La primera es la principal. Escribila y apretá Enter.</span>
                            </div>
                            <div className="vp-row">
                                <div className="g"><b>Aparecer en Google</b><span>Apagalo solo si la tienda está en construcción.</span></div>
                                <Toggle on={seo.indexable} onChange={(on) => setSeo({ indexable: on })} label="Aparecer en Google" />
                            </div>
                            <div className="vp-row">
                                <div className="g"><b>Mapa del sitio para Google</b><span>{domain || 'tu-tienda'}/sitemap.xml · se arma solo</span></div>
                                <PanelTag tone="g">Activo</PanelTag>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="vp-fld">
                                <label htmlFor="seo-can">Dirección principal (canónica)</label>
                                <input id="seo-can" className="vp-inp" placeholder="https://" value={seo.canonicalPath} onChange={(event) => setSeo({ canonicalPath: event.target.value })} />
                                <span className="vp-note">Le dice a Google cuál es la dirección oficial si tenés varias.</span>
                            </div>
                            <div className="vp-fld">
                                <label htmlFor="seo-ogt">Título al compartir en redes</label>
                                <input id="seo-ogt" className="vp-inp" placeholder={title} value={seo.ogTitle} onChange={(event) => setSeo({ ogTitle: event.target.value })} />
                            </div>
                            <div className="vp-fld">
                                <label htmlFor="seo-ogd">Descripción al compartir en redes</label>
                                <textarea id="seo-ogd" className="vp-inp ta" rows={2} placeholder={description} value={seo.ogDescription} onChange={(event) => setSeo({ ogDescription: event.target.value })} />
                            </div>
                            <div className="vp-fld">
                                <label htmlFor="seo-gtm">Google Tag Manager</label>
                                <input id="seo-gtm" className="vp-inp" placeholder="GTM-XXXXXXX" value={seo.tracking.googleTagManagerContainerId} onChange={(event) => setTracking({ googleTagManagerContainerId: event.target.value, enabled: Boolean(event.target.value.trim()) })} />
                                <span className="vp-note">Pegá el código del contenedor. Se agrega solo a todas las páginas.</span>
                            </div>
                            <div className="vp-fld">
                                <label htmlFor="seo-notes">Notas internas</label>
                                <textarea id="seo-notes" className="vp-inp ta" rows={2} placeholder="Solo las ves vos" value={seo.tracking.notes} onChange={(event) => setTracking({ notes: event.target.value })} />
                            </div>
                        </>
                    )}
                </PanelCard>

                <div className="vp-scol">
                    <PanelCard stack className="vp-card vp-sec" title="Al compartir el link" description="Lo que se ve en WhatsApp, Instagram o Facebook.">
                        <div className="vp-ogprev">
                            <div className="img">{branding.logo ? <img src={branding.logo} alt="" /> : null}</div>
                            <div className="t"><b>{seo.ogTitle || title}</b><span>{domain || 'tu-tienda.vase.ar'}</span></div>
                        </div>
                        <div className="vp-row">
                            <div className="vp-fav">{favicon ? <img src={favicon} alt="" /> : null}</div>
                            <div className="g"><b>Ícono de la pestaña</b><span>El que ves arriba en el navegador.</span></div>
                            <label className="vp-btn line sm" style={{ cursor: 'pointer' }}>
                                {uploading ? 'Subiendo…' : 'Cambiar'}
                                <input type="file" accept="image/png,image/svg+xml,image/x-icon,image/webp" hidden onChange={(event) => { uploadFavicon(event.target.files?.[0]); event.target.value = ''; }} />
                            </label>
                        </div>
                    </PanelCard>
                    <PanelCard stack className="vp-card vp-sec" title="Tus redes">
                        {editor.settings?.vase_profile?.connected ? <p className="vp-note">Las redes que cargues en <a href={editor.settings.vase_profile.edit_url} target="_blank" rel="noreferrer">Mi negocio</a> reemplazan a estas.</p> : null}
                        <p>Aparecen en el pie de la tienda.</p>
                        {[['instagram', 'Instagram', 'https://instagram.com/tu-tienda'], ['facebook', 'Facebook', 'https://facebook.com/tu-tienda'], ['tiktok', 'TikTok', 'https://tiktok.com/@tu-tienda'], ['youtube', 'YouTube', 'https://youtube.com/@tu-tienda']].map(([key, label, placeholder]) => (
                            <div key={key} className="vp-fld">
                                <label htmlFor={`soc-${key}`}>{label}</label>
                                <input id={`soc-${key}`} className="vp-inp" placeholder={placeholder} value={socials[key] || ''} onChange={(event) => setSocial(key, event.target.value)} />
                            </div>
                        ))}
                        <div className="vp-fld">
                            <label htmlFor="soc-wa">WhatsApp de ventas</label>
                            <input id="soc-wa" className="vp-inp" readOnly value={commerce.whatsapp_number || ''} placeholder="Se carga en Ajustes › Pagos" />
                        </div>
                    </PanelCard>
                </div>
            </div>
            <SaveBar dirty={editor.canUndo} saving={editor.saving} onSave={onSave} />
        </div>
    );
}

// ───────────── Correo ─────────────
export const EMAIL_INITIAL = { smtp_from_name: '', email: '', order_notification_email: '', smtp_host: '', smtp_port: 465, smtp_secure: true, smtp_user: '', smtp_from: '', has_smtp_password: false };

export async function emailRequest(path = '', options = {}) {
    const token = localStorage.getItem('teflon_token');
    const headers = { ...(await getAdminTenantHeaders()), 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(`${getApiBase()}/api/admin/settings/email${path}`, { headers, ...options });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, body };
}
