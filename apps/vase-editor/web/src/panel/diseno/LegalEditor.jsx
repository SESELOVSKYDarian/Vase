import React, { useState } from 'react';
import { Modal } from '../components/Overlays';
import { LEGAL_DEFAULTS, legalDisplaySections, legalPage } from '../../data/legalPages';

const KINDS = ['terms', 'privacy'];

// Diseño › Términos y políticas: las dos páginas legales, por secciones. Sirve para cualquier tienda.
export default function LegalEditor({ settings, setSettings, theme }) {
    const [kind, setKind] = useState('terms');
    const [confirmReset, setConfirmReset] = useState(false);
    const page = legalPage(kind, settings);
    const base = LEGAL_DEFAULTS[kind];
    // Tal como se escribió, para poder vaciar el campo y escribir otro.
    const rawTitle = settings?.branding?.legal_pages?.[kind]?.title;

    const save = (patch) => setSettings((prev) => {
        const branding = prev?.branding || {};
        const pages = branding.legal_pages || {};
        const current = legalPage(kind, prev);
        return {
            ...prev,
            branding: {
                ...branding,
                legal_pages: {
                    ...pages,
                    [kind]: { title: current.title, sections: current.sections, hide_footer_link: current.hide_footer_link, updated_at: new Date().toISOString(), ...patch },
                },
            },
        };
    });

    const setSections = (sections) => save({ sections });
    const setSection = (index, patch) => setSections(page.sections.map((section, i) => (i === index ? { ...section, ...patch } : section)));
    const move = (index, to) => {
        if (to < 0 || to >= page.sections.length) return;
        const next = [...page.sections];
        const [item] = next.splice(index, 1);
        next.splice(to, 0, item);
        setSections(next);
    };
    const reset = () => {
        setSettings((prev) => {
            const branding = prev?.branding || {};
            const { [kind]: removed, ...pages } = branding.legal_pages || {};
            return { ...prev, branding: { ...branding, legal_pages: pages } };
        });
        setConfirmReset(false);
    };

    return (
        <div className="vp-scol">
            <div className="vp-card vp-sec">
                <div className="vp-sech">
                    <div className="vp-inline" role="tablist" aria-label="Página legal">
                        {KINDS.map((id) => (
                            <button key={id} type="button" role="tab" aria-selected={kind === id} className={`vp-btn sm ${kind === id ? 'acc' : 'line'}`} onClick={() => setKind(id)}>{LEGAL_DEFAULTS[id].tab}</button>
                        ))}
                    </div>
                    <a className="vp-link" href={base.path} target="_blank" rel="noopener noreferrer">Ver página publicada ↗</a>
                </div>
                <div className="vp-fld">
                    <label htmlFor="legal-title">Título de la página</label>
                    <input id="legal-title" className="vp-inp" value={rawTitle ?? page.title} placeholder={base.title} onChange={(event) => save({ title: event.target.value })} />
                </div>
                {kind === 'privacy' ? (
                    <div className="vp-row">
                        <div className="g"><b>Link en el pie de página</b><span>Agrega “Privacidad y seguridad” si el pie no tiene ya un link a esta página.</span></div>
                        <button type="button" role="switch" aria-checked={!page.hide_footer_link} aria-label="Link en el pie de página" className={`vp-tog ${page.hide_footer_link ? 'off' : ''}`} onClick={() => save({ hide_footer_link: !page.hide_footer_link })} />
                    </div>
                ) : null}
                <span className="vp-note">
                    Escribí <b>{'{empresa}'}</b> y se reemplaza por el nombre legal de Ajustes › Pagos. Dejá una línea en blanco para separar párrafos, empezá con “- ” para una lista y usá **dos asteriscos** para negrita.
                </span>
            </div>

            {legalDisplaySections(page).map((section, position) => {
                if (section.fixed) {
                    return (
                        <div key="fixed" className="vp-card vp-sec">
                            <div className="vp-sech">
                                <h3>Sección {position + 1} · {section.title}</h3>
                                <span className="vp-tag"><i />Fija</span>
                            </div>
                            <p>{section.body.replace(/\*\*/g, '')}</p>
                            <span className="vp-note">Esta cláusula la pone Vase en todas las tiendas y no se puede cambiar ni quitar.</span>
                        </div>
                    );
                }
                const index = section.sourceIndex;
                return (
                    <div key={index} className="vp-card vp-sec">
                        <div className="vp-sech">
                            <h3>Sección {position + 1}</h3>
                            <div className="vp-inline">
                                <button type="button" className="vp-ibtn sm" aria-label={`Subir sección ${position + 1}`} disabled={index === 0} onClick={() => move(index, index - 1)}>↑</button>
                                <button type="button" className="vp-ibtn sm" aria-label={`Bajar sección ${position + 1}`} disabled={index === page.sections.length - 1} onClick={() => move(index, index + 1)}>↓</button>
                                <button type="button" className="vp-ibtn sm del" aria-label={`Quitar sección ${position + 1}`} onClick={() => setSections(page.sections.filter((_, i) => i !== index))}>×</button>
                            </div>
                        </div>
                        <div className="vp-fld">
                            <label htmlFor={`legal-t-${index}`}>Título</label>
                            <input id={`legal-t-${index}`} className="vp-inp" value={section.title || ''} onChange={(event) => setSection(index, { title: event.target.value })} />
                        </div>
                        <div className="vp-fld">
                            <label htmlFor={`legal-b-${index}`}>Texto</label>
                            <textarea id={`legal-b-${index}`} className="vp-inp ta" rows={Math.min(14, Math.max(4, Math.ceil(String(section.body || '').length / 90) + 1))} value={section.body || ''} onChange={(event) => setSection(index, { body: event.target.value })} />
                        </div>
                    </div>
                );
            })}

            <div className="vp-inline" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="vp-btn line" onClick={() => setSections([...page.sections, { title: 'Nueva sección', body: '' }])}>+ Agregar sección</button>
                {page.customized ? <button type="button" className="vp-btn soft" onClick={() => setConfirmReset(true)}>Volver al texto original</button> : null}
            </div>
            <span className="vp-note">Los cambios se guardan como borrador. Publicar los sube a la tienda.</span>

            <Modal
                open={confirmReset}
                onClose={() => setConfirmReset(false)}
                theme={theme}
                title="¿Volver al texto original?"
                description={`Se pierden los cambios hechos en ${base.tab}. Se aplica cuando toques Publicar.`}
                footer={<>
                    <button type="button" className="vp-btn soft" onClick={() => setConfirmReset(false)}>Cancelar</button>
                    <button type="button" className="vp-btn red" onClick={reset}>Volver al original</button>
                </>}
            />
        </div>
    );
}
