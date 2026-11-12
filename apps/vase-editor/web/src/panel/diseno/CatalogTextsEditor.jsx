import React from 'react';
import { STORE_TEXT_DEFAULTS } from '../../utils/storeTexts';
import { PanelCard } from '@vase/ui/panel/pieces';

const FIELDS = [
    ['badge', 'Etiqueta de arriba'],
    ['title', 'Título'],
    ['description', 'Texto debajo del título', true],
];
const EMPTY_FIELDS = [
    ['empty_title', 'Título'],
    ['empty_text', 'Texto', true],
];

// Diseño › Catálogo en las tiendas sin plantilla propia: los textos de la página de productos.
export default function CatalogTextsEditor({ settings, setSettings }) {
    const texts = settings?.branding?.catalog_page || {};
    const defaults = STORE_TEXT_DEFAULTS.catalog;
    const set = (key, value) => setSettings((prev) => ({
        ...prev,
        branding: { ...(prev?.branding || {}), catalog_page: { ...((prev?.branding || {}).catalog_page || {}), [key]: value } },
    }));
    const field = ([key, label, long]) => (
        <div key={key} className="vp-fld">
            <label htmlFor={`cat-${key}`}>{label}</label>
            {long
                ? <textarea id={`cat-${key}`} className="vp-inp ta" rows={3} value={texts[key] || ''} placeholder={defaults[key]} onChange={(event) => set(key, event.target.value)} />
                : <input id={`cat-${key}`} className="vp-inp" value={texts[key] || ''} placeholder={defaults[key]} onChange={(event) => set(key, event.target.value)} />}
        </div>
    );
    return (
        <div className="vp-scol">
            <PanelCard stack className="vp-card vp-sec" title="Encabezado de la página" description="Lo que se ve arriba de los productos. Si alguien entra a un rubro o una marca, el título pasa a ser ese nombre.">
                {FIELDS.map(field)}
            </PanelCard>
            <PanelCard stack className="vp-card vp-sec" title="Cuando no hay resultados" description="El mensaje que aparece si una búsqueda o un filtro no encuentra productos.">
                {EMPTY_FIELDS.map(field)}
            </PanelCard>
            <span className="vp-note">Dejá un campo vacío para usar el texto de siempre. Los rubros, las marcas y los productos se cambian en Catálogo.</span>
        </div>
    );
}
