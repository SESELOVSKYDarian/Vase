import React, { useEffect, useMemo, useState } from 'react';
import { getAdminTenantHeaders, getApiBase } from '../../utils/api';
import { uploadPublicFile } from '../../utils/uploadsClient';
import { useIntegrationManager } from '../../hooks/admin/useIntegrationManager';
import { normalizeSeoSettings } from '../../utils/seo';
import { Modal } from '../components/Overlays';
import { erpStats, keywordsAdd, seoLimit } from '../ajustes';
import { PanelTag } from '@vase/ui/panel/pieces';

const Toggle = ({ on, onChange, label }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`vp-tog ${on ? '' : 'off'}`} onClick={() => onChange(!on)} />
);

const SaveBar = ({ dirty, saving, onSave, label = 'Guardar' }) => (
    <div className="vp-floatsave">
        <span>{dirty ? 'Tenés cambios sin guardar.' : 'Todo guardado.'}</span>
        <button type="button" className="vp-btn acc" onClick={onSave} disabled={saving}>{saving ? 'Guardando…' : label}</button>
    </div>
);

const copy = (text, toast) => {
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
                <div className="vp-card vp-sec">
                    <div className="vp-sech">
                        <h3>En Google</h3>
                        <div className="vp-seg" style={{ width: 200 }}>
                            <button type="button" className={tab === 'basico' ? 'on' : ''} onClick={() => setTab('basico')}>Básico</button>
                            <button type="button" className={tab === 'avanzado' ? 'on' : ''} onClick={() => setTab('avanzado')}>Avanzado</button>
                        </div>
                    </div>
                    <p>Si dejás un campo vacío se usa el texto automático (en gris).</p>
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
                </div>

                <div className="vp-scol">
                    <div className="vp-card vp-sec">
                        <h3>Al compartir el link</h3>
                        <p>Lo que se ve en WhatsApp, Instagram o Facebook.</p>
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
                    </div>
                    <div className="vp-card vp-sec">
                        <h3>Tus redes</h3>
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
                    </div>
                </div>
            </div>
            <SaveBar dirty={editor.canUndo} saving={editor.saving} onSave={onSave} />
        </div>
    );
}

// ───────────── Correo ─────────────
const EMAIL_INITIAL = { smtp_from_name: '', email: '', order_notification_email: '', smtp_host: '', smtp_port: 465, smtp_secure: true, smtp_user: '', smtp_from: '', has_smtp_password: false };

async function emailRequest(path = '', options = {}) {
    const token = localStorage.getItem('teflon_token');
    const headers = { ...(await getAdminTenantHeaders()), 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(`${getApiBase()}/api/admin/settings/email${path}`, { headers, ...options });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, body };
}

export function AjustesCorreo({ toast, goPagos }) {
    const [data, setData] = useState(EMAIL_INITIAL);
    const [saved, setSaved] = useState(EMAIL_INITIAL);
    const [password, setPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [to, setTo] = useState('');
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState('');

    useEffect(() => {
        emailRequest().then(({ ok, body }) => { if (ok && body) { setData({ ...EMAIL_INITIAL, ...body }); setSaved({ ...EMAIL_INITIAL, ...body }); } }).catch(() => {});
    }, []);

    const set = (patch) => setData((current) => ({ ...current, ...patch }));
    const dirty = JSON.stringify(data) !== JSON.stringify(saved) || Boolean(password);
    const run = async (kind, path, options) => {
        setBusy(kind);
        setStatus(null);
        try {
            const { ok, body } = await emailRequest(path, options);
            const good = ok && (body.sent ?? body.verified ?? true);
            const message = body.message || body.details || (good
                ? kind === 'test' ? `Te mandamos un correo de prueba a ${to}.` : kind === 'verify' ? 'El servidor de correo responde bien.' : 'Correo guardado.'
                : `No funcionó (${body.code || body.error || 'error'}). Revisá los datos del servidor.`);
            setStatus({ ok: good, message, at: new Date() });
            return { ok, body };
        } catch {
            setStatus({ ok: false, message: 'No se pudo hablar con el servidor. Probá de nuevo.' });
            return { ok: false, body: {} };
        } finally {
            setBusy('');
        }
    };

    const save = async () => {
        const { ok, body } = await run('save', '', { method: 'PUT', body: JSON.stringify({ ...data, ...(password ? { smtp_password: password } : {}) }) });
        if (ok && body?.smtp_host !== undefined) {
            const next = { ...EMAIL_INITIAL, ...body };
            setData(next);
            setSaved(next);
            setPassword('');
            setChangingPassword(false);
            toast?.('Correo guardado', 'success');
        }
    };

    const security = data.smtp_secure ? 'ssl' : 'starttls';

    return (
        <div className="vp-scol vp-correo">
            <div className="vp-pgrid">
                <div className="vp-card vp-sec">
                    <h3>Quién envía</h3>
                    <div className="vp-two2">
                        <div className="vp-fld"><label htmlFor="em-name">Nombre del remitente</label><input id="em-name" className="vp-inp" placeholder="Tu tienda" value={data.smtp_from_name || ''} onChange={(event) => set({ smtp_from_name: event.target.value })} /></div>
                        <div className="vp-fld"><label htmlFor="em-from">Email que envía</label><input id="em-from" type="email" className="vp-inp" placeholder="ventas@tu-tienda.com" value={data.smtp_from || ''} onChange={(event) => set({ smtp_from: event.target.value })} /></div>
                        <div className="vp-fld"><label htmlFor="em-reply">Responder a</label><input id="em-reply" type="email" className="vp-inp" placeholder="info@tu-tienda.com" value={data.email || ''} onChange={(event) => set({ email: event.target.value })} /></div>
                        <div className="vp-fld"><label htmlFor="em-team">Aviso al equipo por pedido nuevo</label><input id="em-team" type="email" className="vp-inp" placeholder="pedidos@tu-tienda.com" value={data.order_notification_email || ''} onChange={(event) => set({ order_notification_email: event.target.value })} /></div>
                    </div>
                </div>

                <div className="vp-card vp-sec">
                    <h3>Estado</h3>
                    <div className="vp-row">
                        <div className="g">
                            <b>{status ? (status.ok ? 'Funciona' : 'Con problemas') : data.smtp_host ? 'Configurado' : 'Sin configurar'}</b>
                            <span>{status ? status.message : data.smtp_host ? 'Probá la conexión para ver que esté todo bien.' : 'Completá el servidor de correo para que salgan los avisos.'}</span>
                        </div>
                        <PanelTag tone={status ? (status.ok ? 'g' : 'r') : data.smtp_host ? 'b' : 'y'}>{status ? (status.ok ? 'Bien' : 'Error') : data.smtp_host ? 'Listo' : 'Falta'}</PanelTag>
                    </div>
                    <button type="button" className="vp-btn line" onClick={() => run('verify', '/verify', { method: 'POST' })} disabled={Boolean(busy)}>{busy === 'verify' ? 'Probando…' : 'Probar conexión'}</button>
                    <div className="vp-fld">
                        <label htmlFor="em-to">Enviar un correo de prueba a</label>
                        <div className="vp-inline">
                            <input id="em-to" type="email" className="vp-inp" placeholder="vos@ejemplo.com" value={to} onChange={(event) => setTo(event.target.value)} />
                            <button type="button" className="vp-btn soft" disabled={Boolean(busy) || !to.trim()} onClick={() => run('test', '/test', { method: 'POST', body: JSON.stringify({ to }) })}>{busy === 'test' ? 'Enviando…' : 'Enviar'}</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="vp-card vp-sec">
                <h3>Servidor de correo</h3>
                <p>Lo da tu proveedor de correo (Resend, Gmail, Hostinger…).</p>
                <div className="vp-two2">
                    <div className="vp-fld"><label htmlFor="em-host">Servidor</label><input id="em-host" className="vp-inp" placeholder="smtp.tu-proveedor.com" value={data.smtp_host || ''} onChange={(event) => set({ smtp_host: event.target.value })} /></div>
                    <div className="vp-fld"><label htmlFor="em-port">Puerto</label><input id="em-port" className="vp-inp" inputMode="numeric" value={data.smtp_port || ''} onChange={(event) => set({ smtp_port: Number(event.target.value.replace(/\D/g, '')) || '' })} /></div>
                    <div className="vp-fld"><label htmlFor="em-user">Usuario</label><input id="em-user" className="vp-inp" autoComplete="off" value={data.smtp_user || ''} onChange={(event) => set({ smtp_user: event.target.value })} /></div>
                    <div className="vp-fld">
                        <label htmlFor="em-pass">Contraseña</label>
                        {data.has_smtp_password && !changingPassword ? (
                            <div className="vp-inline"><input id="em-pass" className="vp-inp" readOnly value="••••••••" /><button type="button" className="vp-btn line" onClick={() => setChangingPassword(true)}>Cambiar</button></div>
                        ) : (
                            <input id="em-pass" type="password" autoComplete="new-password" className="vp-inp" placeholder="Contraseña del correo" value={password} onChange={(event) => setPassword(event.target.value)} />
                        )}
                    </div>
                </div>
                <div className="vp-fld">
                    <span className="vp-fl">Seguridad</span>
                    <div className="vp-seg" style={{ maxWidth: 360 }}>
                        <button type="button" className={security === 'starttls' ? 'on' : ''} onClick={() => set({ smtp_secure: false, smtp_port: data.smtp_port === 465 || !data.smtp_port ? 587 : data.smtp_port })}>STARTTLS (587)</button>
                        <button type="button" className={security === 'ssl' ? 'on' : ''} onClick={() => set({ smtp_secure: true, smtp_port: data.smtp_port === 587 || !data.smtp_port ? 465 : data.smtp_port })}>SSL (465)</button>
                    </div>
                </div>
            </div>

            <div className="vp-card vp-sec">
                <h3>Avisos que se mandan</h3>
                {[['Bienvenida y verificación de cuenta', 'Texto automático'], ['Pedido recibido', 'Se edita en Pagos › Textos de la compra'], ['Pago confirmado o cancelado', 'Se edita en Pagos › Textos de la compra'], ['Aviso al equipo por pedido nuevo', data.order_notification_email ? `Llega a ${data.order_notification_email}` : 'Cargá el correo arriba']].map(([title, help]) => (
                    <div key={title} className="vp-row">
                        <div className="g"><b>{title}</b><span>{help}</span></div>
                        {help.startsWith('Se edita') && goPagos ? <button type="button" className="vp-btn line sm" onClick={goPagos}>Editar texto</button> : null}
                    </div>
                ))}
            </div>

            <SaveBar dirty={dirty} saving={busy === 'save'} onSave={save} label="Guardar correo" />
        </div>
    );
}

// ───────────── Sistema de gestión ─────────────
export function AjustesGestion({ editor, toast }) {
    const manager = useIntegrationManager();
    const [showKey, setShowKey] = useState(false);
    const [confirmRotate, setConfirmRotate] = useState(false);
    const [switchTo, setSwitchTo] = useState(null);
    const { loadManifest } = manager;

    useEffect(() => { loadManifest().catch(() => {}); }, [loadManifest]);

    const stats = useMemo(() => erpStats(editor.products || []), [editor.products]);
    const manifest = manager.manifest || {};
    const token = manifest.auth?.token || '';
    const syncUrl = manifest.endpoints?.sync_products_url || '';
    const pingUrl = manifest.endpoints?.ping_url || '';
    const provider = manager.providerState?.provider || 'EXTERNAL_API';
    const ping = manager.lastPingResult;

    return (
        <div className="vp-scol vp-gestion">
            <div className="vp-card vp-sec">
                <h3>¿De dónde vienen tus productos?</h3>
                <div className="vp-two2">
                    <button type="button" className={`vp-choice ${provider === 'EXTERNAL_API' ? 'on' : ''}`} onClick={() => provider !== 'EXTERNAL_API' && setSwitchTo('EXTERNAL_API')}>
                        <b>Tu sistema de gestión</b><span>Tu sistema manda productos, precios y stock a Vase.</span>
                        {provider === 'EXTERNAL_API' ? <span className="ck">En uso</span> : null}
                    </button>
                    <button type="button" className={`vp-choice ${provider === 'VASE_MANAGEMENT' ? 'on' : ''}`} onClick={() => provider !== 'VASE_MANAGEMENT' && setSwitchTo('VASE_MANAGEMENT')}>
                        <b>Vase Management</b><span>Gestionás todo desde Vase, sin sistema externo.{manager.providerState?.managementAvailable ? '' : ' Requiere contratación.'}</span>
                        {provider === 'VASE_MANAGEMENT' ? <span className="ck">En uso</span> : null}
                    </button>
                </div>
            </div>

            <div className="vp-pgrid">
                <div className="vp-card vp-sec">
                    <h3>Conexión</h3>
                    <div className="vp-row">
                        <div className="g">
                            <b>{stats.total ? 'Recibiendo productos' : 'Todavía no llegó ningún producto'}</b>
                            <span>{stats.total ? `${stats.total} productos vienen de tu sistema${stats.lastSync ? ` · última vez ${stats.lastSync.toLocaleString('es-AR')}` : ''}${stats.toReview ? ` · ${stats.toReview} para revisar` : ''}` : 'Cuando tu sistema mande productos, los vas a ver acá.'}</span>
                        </div>
                        <PanelTag tone={stats.total ? (stats.toReview ? 'y' : 'g') : ''}>{stats.total ? (stats.toReview ? 'Revisar' : 'Al día') : 'Sin datos'}</PanelTag>
                    </div>
                    {ping ? (
                        <div className={`vp-lock ${ping.ok ? 'ok' : ''}`}>{ping.ok ? 'La conexión responde bien.' : `La conexión no respondió (código ${ping.status}).`} {new Date(ping.tested_at).toLocaleTimeString('es-AR')}</div>
                    ) : null}
                    <button type="button" className="vp-btn line" onClick={() => manager.testConnection().catch(() => {})} disabled={manager.pinging || !pingUrl}>{manager.pinging ? 'Probando…' : 'Probar conexión'}</button>
                    <div className="vp-lock ok">Si un producto tiene “No pisar mis cambios”, la sincronización no le cambia nombre, descripción, marca ni precio.</div>
                </div>

                <div className="vp-card vp-sec">
                    <h3>Datos para quien programa tu sistema</h3>
                    <div className="vp-fld">
                        <span className="vp-fl">Dirección de conexión</span>
                        <div className="vp-inline"><input className="vp-inp mono" readOnly value={syncUrl || 'Cargando…'} aria-label="Dirección de conexión" /><button type="button" className="vp-btn line" disabled={!syncUrl} onClick={() => copy(syncUrl, toast)}>Copiar</button></div>
                        <span className="vp-note">Tu sistema manda los productos acá.{pingUrl ? ` Prueba: ${pingUrl.replace(/^https?:\/\//, '')}` : ''}</span>
                    </div>
                    <div className="vp-fld">
                        <span className="vp-fl">Clave para tu sistema</span>
                        <div className="vp-inline">
                            <input className="vp-inp mono" readOnly value={token ? (showKey ? token : '••••••••••••••••') : 'Cargando…'} aria-label="Clave para tu sistema" />
                            <button type="button" className="vp-btn line" disabled={!token} onClick={() => setShowKey((value) => !value)}>{showKey ? 'Ocultar' : 'Mostrar'}</button>
                            <button type="button" className="vp-btn line" disabled={!token} onClick={() => copy(token, toast)}>Copiar</button>
                        </div>
                        <span className="vp-note">Pasásela solo a quien programa tu sistema. <button type="button" className="vp-link" onClick={() => setConfirmRotate(true)}>Cambiar la clave</button></span>
                    </div>
                </div>
            </div>

            <Modal
                open={Boolean(switchTo)}
                onClose={() => setSwitchTo(null)}
                title={switchTo === 'VASE_MANAGEMENT' ? '¿Pasar a Vase Management?' : '¿Volver a tu sistema de gestión?'}
                description="Los productos, precios y stock pasan a venir de la nueva fuente. Vase revisa y acomoda los datos, puede tardar unos minutos."
                footer={<>
                    <button type="button" className="vp-btn soft" onClick={() => setSwitchTo(null)}>Cancelar</button>
                    <button type="button" className="vp-btn acc" onClick={async () => { const target = switchTo; setSwitchTo(null); await manager.setIntegrationProvider(target); }}>Cambiar</button>
                </>}
            />
            <Modal
                open={confirmRotate}
                onClose={() => setConfirmRotate(false)}
                title="¿Cambiar la clave?"
                description="La clave actual deja de funcionar al instante. Tu sistema no va a poder mandar productos hasta que le cargues la nueva."
                footer={<>
                    <button type="button" className="vp-btn soft" onClick={() => setConfirmRotate(false)}>Cancelar</button>
                    <button type="button" className="vp-btn red" disabled={manager.rotatingToken} onClick={async () => { await manager.rotateToken().catch(() => {}); setConfirmRotate(false); setShowKey(true); }}>{manager.rotatingToken ? 'Cambiando…' : 'Cambiar la clave'}</button>
                </>}
            />
        </div>
    );
}
