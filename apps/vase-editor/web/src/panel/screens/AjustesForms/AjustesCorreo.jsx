// Parte de AjustesForms.jsx: AjustesCorreo.
import { useEffect, useState } from 'react';
import { PanelCard, PanelSegmented, PanelTag } from '@vase/ui/panel/pieces';
import { EMAIL_INITIAL, SaveBar, emailRequest } from './AjustesSeo.jsx';

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
                <PanelCard stack className="vp-card vp-sec" title="Quién envía">
                    <div className="vp-two2">
                        <div className="vp-fld"><label htmlFor="em-name">Nombre del remitente</label><input id="em-name" className="vp-inp" placeholder="Tu tienda" value={data.smtp_from_name || ''} onChange={(event) => set({ smtp_from_name: event.target.value })} /></div>
                        <div className="vp-fld"><label htmlFor="em-from">Email que envía</label><input id="em-from" type="email" className="vp-inp" placeholder="ventas@tu-tienda.com" value={data.smtp_from || ''} onChange={(event) => set({ smtp_from: event.target.value })} /></div>
                        <div className="vp-fld"><label htmlFor="em-reply">Responder a</label><input id="em-reply" type="email" className="vp-inp" placeholder="info@tu-tienda.com" value={data.email || ''} onChange={(event) => set({ email: event.target.value })} /></div>
                        <div className="vp-fld"><label htmlFor="em-team">Aviso al equipo por pedido nuevo</label><input id="em-team" type="email" className="vp-inp" placeholder="pedidos@tu-tienda.com" value={data.order_notification_email || ''} onChange={(event) => set({ order_notification_email: event.target.value })} /></div>
                    </div>
                </PanelCard>

                <PanelCard stack className="vp-card vp-sec" title="Estado">
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
                </PanelCard>
            </div>

            <PanelCard stack className="vp-card vp-sec" title="Servidor de correo" description="Lo da tu proveedor de correo (Resend, Gmail, Hostinger…).">
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
                    <PanelSegmented
                        fill
                        style={{ maxWidth: 360 }}
                        value={security}
                        onChange={(next) => (next === 'ssl'
                            ? set({ smtp_secure: true, smtp_port: data.smtp_port === 587 || !data.smtp_port ? 465 : data.smtp_port })
                            : set({ smtp_secure: false, smtp_port: data.smtp_port === 465 || !data.smtp_port ? 587 : data.smtp_port }))}
                        options={[{ value: 'starttls', label: 'STARTTLS (587)' }, { value: 'ssl', label: 'SSL (465)' }]}
                    />
                </div>
            </PanelCard>

            <PanelCard stack className="vp-card vp-sec" title="Avisos que se mandan">
                {[['Bienvenida y verificación de cuenta', 'Texto automático'], ['Pedido recibido', 'Se edita en Pagos › Textos de la compra'], ['Pago confirmado o cancelado', 'Se edita en Pagos › Textos de la compra'], ['Aviso al equipo por pedido nuevo', data.order_notification_email ? `Llega a ${data.order_notification_email}` : 'Cargá el correo arriba']].map(([title, help]) => (
                    <div key={title} className="vp-row">
                        <div className="g"><b>{title}</b><span>{help}</span></div>
                        {help.startsWith('Se edita') && goPagos ? <button type="button" className="vp-btn line sm" onClick={goPagos}>Editar texto</button> : null}
                    </div>
                ))}
            </PanelCard>

            <SaveBar dirty={dirty} saving={busy === 'save'} onSave={save} label="Guardar correo" />
        </div>
    );
}
