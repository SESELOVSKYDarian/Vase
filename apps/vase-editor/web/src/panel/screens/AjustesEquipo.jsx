import React, { useEffect, useMemo, useState } from 'react';
import { errorText, panelFetch } from '../api';
import { isClient } from '../clients';

// Ajustes › Equipo: quién entra al panel. Se suma a alguien que ya tiene cuenta en la tienda.
export default function AjustesEquipo({ user, toast }) {
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [saving, setSaving] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const all = [];
                for (let page = 1; page <= 20; page += 1) {
                    const payload = await panelFetch(`/tenant/users?page=${page}&limit=50`, { user });
                    all.push(...(payload.items || []));
                    if (all.length >= Number(payload.total || 0) || !(payload.items || []).length) break;
                }
                setPeople(all);
            } catch {
                toast('No se pudo cargar el equipo.', 'error');
            } finally {
                setLoading(false);
            }
        })();
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const team = people.filter((person) => !isClient(person));
    const q = query.trim().toLowerCase();
    const candidates = useMemo(() => (q.length < 2 ? [] : people.filter((person) => isClient(person) && `${person.name || ''} ${person.email}`.toLowerCase().includes(q)).slice(0, 6)), [people, q]);

    const setRole = async (person, role, message) => {
        setSaving(person.id);
        try {
            await panelFetch(`/tenant/users/${person.id}`, { method: 'PATCH', body: { role, status: 'active' }, user });
            setPeople((list) => list.map((item) => (item.id === person.id ? { ...item, role, status: 'active' } : item)));
            toast(message, 'success');
            setQuery('');
        } catch (err) {
            toast(errorText(err), 'error');
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="vp-scol" style={{ maxWidth: 860 }}>
            <div className="vp-card vp-sec">
                <h3>Personas que entran al panel</h3>
                {loading ? <p>Cargando…</p> : null}
                {team.map((person) => (
                    <div key={person.id} className="vp-row">
                        <div className="g"><b>{person.name || person.email.split('@')[0]}{person.id === user?.id ? ' (vos)' : ''}</b><span>{person.email}</span></div>
                        <span className="vp-tag g"><i />{person.global_role === 'master_admin' ? 'Soporte Vase' : 'Administrador'}</span>
                        {person.id !== user?.id && person.global_role !== 'master_admin' ? (
                            <button type="button" className="vp-btn line sm" disabled={saving === person.id} onClick={() => setRole(person, 'retail', 'Ya no entra al panel')}>Quitar</button>
                        ) : null}
                    </div>
                ))}
            </div>
            <div className="vp-card vp-sec">
                <h3>Sumar a alguien</h3>
                <p>La persona primero se crea una cuenta en tu tienda. Después la buscás acá y la sumás.</p>
                <input className="vp-inp" placeholder="Buscá por nombre o email" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar persona para sumar al equipo" />
                {candidates.map((person) => (
                    <div key={person.id} className="vp-row">
                        <div className="g"><b>{person.name || person.email.split('@')[0]}</b><span>{person.email}</span></div>
                        <button type="button" className="vp-btn acc sm" disabled={saving === person.id} onClick={() => setRole(person, 'tenant_admin', 'Ahora entra al panel')}>Sumar al equipo</button>
                    </div>
                ))}
                {q.length >= 2 && !candidates.length ? <span className="vp-note">No encontramos a nadie con “{query}”.</span> : null}
            </div>
        </div>
    );
}
