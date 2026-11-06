import React, { useContext, useEffect, useRef } from 'react';
import PageBuilder from '../../components/PageBuilder';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { TenantContext } from '../../context/TenantContext';
import { FOOTER_ID, HEADER_ID, navbarProps } from './chrome';
import { hiddenOn } from '../../utils/sectionStyle';

// Estilos que viven dentro del iframe de la vista previa (ahí no llega .vp).
const PREVIEW_CSS = `
[data-vp-block] { position: relative; cursor: pointer; }
[data-vp-block]::after { content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 60; box-shadow: inset 0 0 0 0 transparent; transition: box-shadow .12s; }
[data-vp-block]:hover::after { box-shadow: inset 0 0 0 2px rgba(23, 201, 132, .55); }
[data-vp-block][data-on="1"]::after { box-shadow: inset 0 0 0 3px #17c984; }
[data-vp-block] > .vp-btag { position: absolute; left: 10px; top: 10px; z-index: 61; display: none; align-items: center; gap: 6px; background: #17c984; color: #04110b; font: 800 11.5px/1 Manrope, system-ui, sans-serif; padding: 6px 9px; border-radius: 8px; pointer-events: none; box-shadow: 0 4px 12px rgba(0,0,0,.18); }
[data-vp-block]:hover > .vp-btag, [data-vp-block][data-on="1"] > .vp-btag { display: inline-flex; }
[data-vp-block][data-off="1"] { opacity: .35; }
[data-vp-chrome="header"] header, [data-vp-chrome="header"] nav { position: relative !important; }
`;

function Selectable({ id, label, selectedId, hidden, children, chrome }) {
    return (
        <div data-vp-block={id} data-on={selectedId === id ? '1' : '0'} data-off={hidden ? '1' : '0'} data-vp-chrome={chrome}>
            <span className="vp-btag">{label}</span>
            {children}
        </div>
    );
}

// La tienda dentro del editor: misma cabecera, bloques y pie que ve el cliente, con los cambios sin publicar.
// Tocar un bloque lo elige; los links y botones no navegan.
export default function StorePreview({ settings, sections, labelFor, selectedId, onSelect, isPiquim, viewport = 'desktop' }) {
    const tenantContext = useContext(TenantContext) || {};
    const rootRef = useRef(null);

    useEffect(() => {
        if (!selectedId || !rootRef.current) return;
        const node = rootRef.current.querySelector(`[data-vp-block="${CSS.escape(selectedId)}"]`);
        node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [selectedId]);

    const selectRef = useRef(onSelect);
    selectRef.current = onSelect;

    // La vista previa vive en un iframe: React no recibe ahí los clics, así que se escuchan a mano.
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;
        const pick = (event) => {
            const target = event.target && event.target.closest ? event.target : null;
            const block = target?.closest('[data-vp-block]');
            if (target?.closest('a, button, input, select, textarea, label, form')) event.preventDefault();
            event.stopPropagation();
            if (block) selectRef.current(block.getAttribute('data-vp-block'));
        };
        const block = (event) => event.preventDefault();
        root.addEventListener('click', pick, true);
        root.addEventListener('submit', block, true);
        return () => {
            root.removeEventListener('click', pick, true);
            root.removeEventListener('submit', block, true);
        };
    }, []);

    return (
        <TenantContext.Provider value={{ ...tenantContext, settings }}>
            <style>{PREVIEW_CSS}</style>
            <div ref={rootRef} className="storefront-preview-root min-h-full flex flex-col">
                <Selectable id={HEADER_ID} label="Menú de arriba" selectedId={selectedId} chrome="header">
                    <Header {...navbarProps(settings, isPiquim)} />
                </Selectable>
                {sections.length ? sections.map((section) => {
                    const offHere = hiddenOn(section.props, viewport);
                    const label = section.enabled === false ? `${labelFor(section)} · oculto` : offHere ? `${labelFor(section)} · oculto en ${viewport === 'mobile' ? 'celular' : 'compu'}` : labelFor(section);
                    return (
                        <Selectable key={section.id} id={section.id} label={label} selectedId={selectedId} hidden={section.enabled === false || offHere}>
                            <PageBuilder sections={[{ ...section, enabled: true }]} ignoreDevice />
                        </Selectable>
                    );
                }) : <PageBuilder sections={[]} />}
                <Selectable id={FOOTER_ID} label="Pie de página" selectedId={selectedId}>
                    <Footer />
                </Selectable>
            </div>
        </TenantContext.Provider>
    );
}
