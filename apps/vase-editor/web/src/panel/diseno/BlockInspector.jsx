import React, { useEffect, useRef, useState } from 'react';
import BlockPropertiesEditor from '../../components/admin/evolution/BlockPropertiesEditor';
import { INSPECTOR_TABS, SPACING, headingTab, sectionStyleOf, withSectionStyle } from '../../utils/sectionStyle';

// Bloques que tienen foto o video aparte para celular (se cargan en Contenido).
const MOBILE_MEDIA = { PiquimHero: 'la foto y el video para celular' };

const Toggle = ({ on, onChange, label }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`vp-tog ${on ? '' : 'off'}`} onClick={() => onChange(!on)} />
);

function SpacingField({ label, value, onChange }) {
    return (
        <div className="vp-fld">
            <span className="vp-fl">{label}</span>
            <div className="vp-seg">
                {SPACING.map(([id, text]) => (
                    <button key={id} type="button" className={value === id ? 'on' : ''} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>
                ))}
            </div>
        </div>
    );
}

// Editor de un bloque con tres pestañas. Las secciones del editor de siempre se reparten
// entre Contenido y Estilo según su título; Estilo y En celular suman opciones propias.
export default function BlockInspector({ block, onChange, tab, onTab, onViewport }) {
    const legacyRef = useRef(null);
    const [counts, setCounts] = useState({ contenido: 0, estilo: 0 });
    const style = sectionStyleOf(block.props);
    const setStyle = (patch) => onChange({ ...block, props: withSectionStyle(block.props, patch) });

    // Marca cada sección del editor anterior con su pestaña y vuelve a marcar si cambia (otro bloque, campos nuevos).
    useEffect(() => {
        const root = legacyRef.current;
        if (!root) return undefined;
        const classify = () => {
            const panels = root.querySelectorAll(':scope > div > div');
            const next = { contenido: 0, estilo: 0 };
            panels.forEach((panel) => {
                const heading = panel.querySelector('[data-section-heading]');
                const target = heading ? headingTab(heading.textContent) : 'contenido';
                if (panel.getAttribute('data-tab') !== target) panel.setAttribute('data-tab', target);
                next[target] += 1;
            });
            setCounts((current) => (current.contenido === next.contenido && current.estilo === next.estilo ? current : next));
        };
        classify();
        const observer = new MutationObserver(classify);
        observer.observe(root, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, [block.id]);

    const pick = (id) => {
        onTab(id);
        if (id === 'celular') onViewport?.('mobile');
    };

    return (
        <>
            <div className="vp-itabs" role="tablist" aria-label="Qué querés cambiar">
                {INSPECTOR_TABS.map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => pick(id)}>{label}</button>
                ))}
            </div>

            {tab === 'estilo' ? (
                <div className="vp-card vp-isub">
                    <b>Espacio alrededor</b>
                    <SpacingField label="Separación arriba" value={style.spaceTop} onChange={(value) => setStyle({ spaceTop: value })} />
                    <SpacingField label="Separación abajo" value={style.spaceBottom} onChange={(value) => setStyle({ spaceBottom: value })} />
                    {!counts.estilo ? <span className="vp-note">Este bloque no tiene colores propios: toma los de la tienda (Colores, logo y pie).</span> : null}
                </div>
            ) : null}

            {tab === 'celular' ? (
                <div className="vp-card vp-isub">
                    <b>Dónde se ve</b>
                    <div className="vp-row">
                        <div className="g"><b>Mostrar en celular</b><span>{style.hideMobile ? 'En celular no aparece.' : 'Se ve en celulares.'}</span></div>
                        <Toggle on={!style.hideMobile} onChange={(on) => setStyle({ hideMobile: !on })} label="Mostrar en celular" />
                    </div>
                    <div className="vp-row">
                        <div className="g"><b>Mostrar en compu</b><span>{style.hideDesktop ? 'En compu no aparece.' : 'Se ve en compus y tablets grandes.'}</span></div>
                        <Toggle on={!style.hideDesktop} onChange={(on) => setStyle({ hideDesktop: !on })} label="Mostrar en compu" />
                    </div>
                    {style.hideMobile && style.hideDesktop ? <div className="vp-lock">Así no se ve en ningún lado. Si es lo que querés, mejor ocultalo con el ojito.</div> : null}
                    {MOBILE_MEDIA[block.type] ? (
                        <span className="vp-note">
                            Para cambiar {MOBILE_MEDIA[block.type]} andá a <button type="button" className="vp-link" onClick={() => onTab('contenido')}>Contenido</button>.
                        </span>
                    ) : null}
                    <span className="vp-note">La vista previa pasó a celular. Cambiala arriba con el botón de compu.</span>
                </div>
            ) : null}

            <div ref={legacyRef} className="vp-legacy vp-inspl" data-show={tab}>
                <BlockPropertiesEditor key={block.id} block={block} onChange={(next) => onChange({ ...block, ...next, id: block.id })} />
            </div>
            {tab === 'contenido' && !counts.contenido ? <span className="vp-note">Este bloque no tiene textos para cambiar.</span> : null}
        </>
    );
}
