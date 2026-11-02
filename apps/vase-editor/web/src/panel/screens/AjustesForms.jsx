import React from 'react';
import SeoEditor from '../../components/admin/evolution/SeoEditor';
import EmailEditor from '../../components/admin/evolution/EmailEditor';
import IntegrationsEditor from '../../components/admin/evolution/IntegrationsEditor';
import { useIntegrationManager } from '../../hooks/admin/useIntegrationManager';

// Ajustes que usan los formularios de siempre, adaptados a los colores del panel nuevo.
const Frame = ({ intro, children }) => (
    <div className="vp-scol" style={{ maxWidth: 1120 }}>
        {intro ? <div className="vp-lock ok">{intro}</div> : null}
        <div className="vp-card vp-legacy" style={{ padding: 18 }}>{children}</div>
    </div>
);

export function AjustesSeo({ editor, onSave }) {
    return (
        <Frame intro="Así te encuentran en Google y así se ve tu tienda cuando alguien comparte el link. Si no tocás nada, se usan el nombre y el logo de tu tienda.">
            <SeoEditor settings={editor.settings} setSettings={editor.setSettings} onSave={onSave} isSaving={editor.saving} />
        </Frame>
    );
}

export function AjustesCorreo() {
    return (
        <Frame intro="Desde acá salen los avisos de pedidos, pagos y verificación de cuentas. Probá la conexión antes de guardar.">
            <EmailEditor />
        </Frame>
    );
}

export function AjustesGestion() {
    const manager = useIntegrationManager();
    return (
        <Frame intro="Tu sistema de gestión manda productos, precios y stock. Si un producto tiene “No pisar mis cambios”, la sincronización no cambia su nombre, descripción, marca ni precio.">
            <IntegrationsEditor manager={manager} />
        </Frame>
    );
}
