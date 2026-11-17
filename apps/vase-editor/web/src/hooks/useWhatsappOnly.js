// ¿La tienda vende solo por WhatsApp? Los datos públicos de la tienda no traen por dónde llegan los
// pedidos, así que se piden a los ajustes de compra (la misma dirección que usa el checkout).
import { useEffect, useState } from 'react';
import { getApiBase, getTenantHeaders } from '../utils/api';
import { isWhatsappOnlyStore } from '../utils/orderChannels';

export function useWhatsappOnly(commerce) {
    const [remote, setRemote] = useState(null);

    useEffect(() => {
        let active = true;
        fetch(`${getApiBase()}/api/settings/checkout`, { headers: getTenantHeaders() })
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
                if (active && data) setRemote({ order_channels: data.order_channels, whatsapp_number: data.whatsapp_number });
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    return isWhatsappOnlyStore({ ...(commerce || {}), ...(remote || {}) });
}
