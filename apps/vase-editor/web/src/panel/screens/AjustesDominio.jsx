import React, { useEffect, useMemo, useState } from 'react';
import { panelFetch } from '../api';
import { Modal } from '../components/Overlays';
import { domainError, domainKind, domainStatus, isPlaceholderValue, isValidDomain, normalizeDomainInput, observedText, sortDomains } from '../dominio';
import { PanelCard, PanelTag } from '@vase/ui/panel/pieces';

// Ajustes › Dominio: tus direcciones, conectar un dominio propio y los datos para cargar en tu proveedor.
export default function AjustesDominio({ user, toast, theme }) {
    const [state, setState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [newDomain, setNewDomain] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [selected, setSelected] = useState('');
    const [confirmRemove, setConfirmRemove] = useState(null);

    const apply = (payload) => {
        setState(payload);
        setSubdomain((current) => current || payload?.platform?.assigned_subdomain || payload?.platform?.suggested_subdomain || '');
    };

    const load = async () => {
        setLoading(true);
        try {
            apply(await panelFetch('/tenant/domains', { user }));
        } catch {
            toast('No se pudieron cargar tus direcciones.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const run = async (key, path, { method = 'POST', body, ok } = {}) => {
        setBusy(key);
        try {
            const payload = await panelFetch(path, { method, body, user });
            apply(payload);
            if (ok) toast(ok, 'success');
            return true;
        } catch (err) {
            toast(domainError(err?.message, body?.domain || key), 'error');
            return false;
        } finally {
            setBusy('');
        }
    };

    const domains = useMemo(() => sortDomains(state?.domains || []), [state]);
    const custom = domains.filter((item) => item.connection_type !== 'platform');
    const platform = state?.platform || {};
    const current = domains.find((item) => item.domain === selected) || custom.find((item) => item.is_primary) || custom[0] || null;
    const records = (current?.required_records || []).filter(Boolean);
    const draft = normalizeDomainInput(newDomain);

    const connect = async (event) => {
        event.preventDefault();
        if (!isValidDomain(draft)) { toast(domainError('invalid_domain', draft), 'error'); return; }
        const done = await run('connect', '/tenant/domains', { body: { domain: draft, is_primary: !custom.length }, ok: `${draft} conectado. Ahora cargá los datos en tu proveedor de dominio.` });
        if (done) { setSelected(draft); setNewDomain(''); }
    };

    const reservePlatform = () => {
        const wanted = String(subdomain || '').trim().toLowerCase();
        const changed = wanted && wanted !== platform.assigned_subdomain;
        return run('platform', changed ? '/tenant/domains/platform' : '/tenant/domains/platform/ensure', {
            body: { subdomain: wanted, is_primary: !custom.some((item) => item.is_primary) },
            ok: 'Dirección de Vase lista.',
        });
    };

    const copy = (text) => {
        navigator.clipboard?.writeText(String(text || ''));
        toast('Copiado', 'success');
    };

    if (loading && !state) return <div className="vp-empty">Cargando tus direcciones…</div>;

    return (
        <div className="vp-scol vp-dominio">
            <PanelCard
                stack
                className="vp-card vp-sec"
                title="Tus direcciones"
                actions={<button type="button" className="vp-btn line sm" disabled={busy === 'check-all'} onClick={() => run('check-all', '/tenant/domains/check', { body: {}, ok: 'Estado actualizado' })}>{busy === 'check-all' ? 'Comprobando…' : 'Comprobar todas'}</button>}
            >
                {!domains.length ? <div className="vp-note">Todavía no tenés direcciones. Conectá tu dominio abajo.</div> : null}
                {domains.map((item) => {
                    const status = domainStatus(item);
                    const isCurrent = current?.domain === item.domain;
                    return (
                        <div key={item.domain} className={`vp-drow ${isCurrent ? 'on' : ''}`}>
                            <div className="g">
                                <a className="vp-dname" href={`https://${item.domain}`} target="_blank" rel="noopener noreferrer">{item.domain} ↗</a>
                                <span>{domainKind(item)}{status.message ? ` · ${status.message}` : ''}</span>
                            </div>
                            <PanelTag tone={status.tone}>{status.label}</PanelTag>
                            {item.is_primary ? <PanelTag tone="g">Principal</PanelTag> : (
                                <button type="button" className="vp-btn line sm" disabled={Boolean(busy)} onClick={() => run(`primary-${item.domain}`, `/tenant/domains/${encodeURIComponent(item.domain)}/primary`, { method: 'PATCH', ok: `${item.domain} es ahora tu dirección principal.` })}>Hacer principal</button>
                            )}
                            {item.connection_type !== 'platform' ? (
                                <button type="button" className="vp-btn soft sm" onClick={() => setSelected(item.domain)} aria-pressed={isCurrent}>Datos DNS</button>
                            ) : null}
                            {!item.is_primary ? <button type="button" className="vp-x" aria-label={`Quitar ${item.domain}`} onClick={() => setConfirmRemove(item)}>×</button> : null}
                        </div>
                    );
                })}
            </PanelCard>

            <div className="vp-pgrid">
                <PanelCard stack className="vp-card vp-sec" title="Conectar otro dominio" description="El que compraste en NIC.ar, GoDaddy, Hostinger u otro proveedor.">
                    <form className="vp-inline" onSubmit={connect}>
                        <input className="vp-inp" aria-label="Dominio" placeholder="mitienda.com" value={newDomain} onChange={(event) => setNewDomain(event.target.value)} />
                        <button type="submit" className="vp-btn acc" disabled={!draft || busy === 'connect'}>{busy === 'connect' ? 'Conectando…' : 'Conectar'}</button>
                    </form>
                    {newDomain && draft && !isValidDomain(draft) ? <span className="vp-note bad">Escribilo así: mitienda.com (sin https:// ni barras).</span> : null}
                </PanelCard>

                {platform.enabled ? (
                    <PanelCard stack className="vp-card vp-sec" title="Dirección de Vase" description="Funciona siempre, aunque todavía no tengas dominio propio.">
                        <div className="vp-inline">
                            <span className="vp-pct" style={{ flex: 1 }}>
                                <input aria-label="Nombre de tu dirección de Vase" value={subdomain} onChange={(event) => setSubdomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                                <span>.{platform.base_domain}</span>
                            </span>
                            <button type="button" className="vp-btn line" disabled={busy === 'platform' || !subdomain} onClick={reservePlatform}>{busy === 'platform' ? 'Guardando…' : platform.assigned_domain ? 'Cambiar' : 'Reservar'}</button>
                        </div>
                    </PanelCard>
                ) : null}
            </div>

            {current ? (
                <PanelCard
                    stack
                    className="vp-card vp-sec"
                    title="Datos para tu proveedor de dominio"
                    description={<>Cargá estos datos en la sección DNS de donde compraste <b>{current.domain}</b>. Los cambios pueden tardar unas horas en verse.</>}
                    actions={<button type="button" className="vp-btn acc sm" disabled={busy === `check-${current.domain}`} onClick={() => run(`check-${current.domain}`, '/tenant/domains/check', { body: { domain: current.domain }, ok: `Estado de ${current.domain} actualizado` })}>{busy === `check-${current.domain}` ? 'Comprobando…' : 'Comprobar conexión'}</button>}
                >
                    {records.length ? (
                        <div className="vp-tblw">
                            <table className="vp-ltbl vp-dnstbl">
                                <thead><tr><th>Tipo</th><th>Nombre</th><th>Valor</th><th /></tr></thead>
                                <tbody>
                                    {records.map((record) => (
                                        <tr key={`${record.type}-${record.host}`}>
                                            <td data-label="Tipo"><b>{record.type}</b></td>
                                            <td data-label="Nombre"><code>{record.host}</code></td>
                                            <td data-label="Valor">{isPlaceholderValue(record.value) ? <span className="vp-note bad">Falta configurar en el servidor de Vase</span> : <code>{record.value}</code>}</td>
                                            <td className="num">{isPlaceholderValue(record.value) ? null : <button type="button" className="vp-btn line sm" onClick={() => copy(record.value)}>Copiar</button>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <div className="vp-note">{current.dns_hint || 'Este dominio no necesita datos extra.'}</div>}
                    {observedText(current) ? <div className={`vp-lock ${domainStatus(current).tone === 'g' ? 'ok' : ''}`}>Hoy {current.domain} apunta a: {observedText(current)}</div> : null}
                    {domainStatus(current).checkedAt ? <span className="vp-note">Comprobado {new Date(domainStatus(current).checkedAt).toLocaleString('es-AR')}</span> : null}
                </PanelCard>
            ) : null}

            <Modal
                open={Boolean(confirmRemove)}
                onClose={() => setConfirmRemove(null)}
                theme={theme}
                title={`¿Quitar ${confirmRemove?.domain || ''}?`}
                description="La tienda deja de abrirse con esa dirección. Tus productos y pedidos no se tocan. Lo podés volver a conectar cuando quieras."
                footer={<>
                    <button type="button" className="vp-btn soft" onClick={() => setConfirmRemove(null)}>Cancelar</button>
                    <button type="button" className="vp-btn red" disabled={Boolean(busy)} onClick={async () => { const item = confirmRemove; setConfirmRemove(null); await run(`remove-${item.domain}`, `/tenant/domains/${encodeURIComponent(item.domain)}`, { method: 'DELETE', ok: `${item.domain} quitado` }); if (selected === item.domain) setSelected(''); }}>Quitar</button>
                </>}
            />
        </div>
    );
}
