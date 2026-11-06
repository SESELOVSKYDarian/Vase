import React, { useEffect, useRef, useState } from 'react';
import { loadLeaflet } from '../../utils/leafletLoader';
import { branchLocated } from './model';

export const RING_COLORS = ['#17b26a', '#2e90fa', '#f79009', '#7a5af8', '#f04438', '#0ba5ec'];
const DEFAULT_CENTER = [-38.0055, -57.5426];

// Mapa de Envíos: sucursales, anillos por distancia y zonas especiales.
export default function ShippingMap({ branches = [], tiers = [], specials = [], theme }) {
    const boxRef = useRef(null);
    const mapRef = useRef(null);
    const layerRef = useRef(null);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        let alive = true;
        loadLeaflet()
            .then((L) => {
                if (!alive || !boxRef.current || mapRef.current) return;
                const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true }).setView(DEFAULT_CENTER, 11);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
                mapRef.current = map;
                layerRef.current = L.layerGroup().addTo(map);
                setStatus('ready');
            })
            .catch(() => alive && setStatus('error'));
        return () => {
            alive = false;
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        const L = window.L;
        const map = mapRef.current;
        const layer = layerRef.current;
        if (status !== 'ready' || !L || !map || !layer) return;
        layer.clearLayers();
        const bounds = [];
        const located = branches.filter(branchLocated);
        const sorted = [...tiers].filter((tier) => tier.max_km).sort((a, b) => b.max_km - a.max_km);
        located.forEach((branch) => {
            const center = [Number(branch.latitude), Number(branch.longitude)];
            sorted.forEach((tier) => {
                const index = tiers.indexOf(tier);
                const color = RING_COLORS[index % RING_COLORS.length];
                const circle = L.circle(center, { radius: tier.max_km * 1000, color, weight: 1.5, fillColor: color, fillOpacity: 0.08 }).addTo(layer);
                bounds.push(circle.getBounds());
            });
            L.circleMarker(center, { radius: 7, color: '#fff', weight: 2, fillColor: '#101828', fillOpacity: 1 })
                .bindTooltip(branch.name || 'Sucursal', { direction: 'top' })
                .addTo(layer);
            if (!sorted.length) bounds.push(L.latLngBounds([center, center]));
        });
        specials.forEach((zone) => {
            const polygon = L.polygon(zone.polygon.map((point) => [point.lat, point.lng]), { color: '#f04438', weight: 1.5, dashArray: '5 4', fillColor: '#f04438', fillOpacity: 0.12 })
                .bindTooltip(`${zone.name} · $${Number(zone.price || 0).toLocaleString('es-AR')}`, { sticky: true })
                .addTo(layer);
            bounds.push(polygon.getBounds());
        });
        if (bounds.length) {
            const all = bounds.reduce((acc, item) => acc.extend(item), L.latLngBounds(bounds[0].getSouthWest(), bounds[0].getNorthEast()));
            map.fitBounds(all, { padding: [24, 24], maxZoom: 14 });
        }
        setTimeout(() => map.invalidateSize(), 50);
    }, [status, branches, tiers, specials]);

    return (
        <div className="vp-mapw" data-theme-map={theme}>
            <div ref={boxRef} style={{ position: 'absolute', inset: 0 }} aria-label="Mapa de envíos" />
            {status === 'loading' ? <div className="vp-maplegend">Cargando mapa…</div> : null}
            {status === 'error' ? <div className="vp-maplegend">No se pudo cargar el mapa. La configuración funciona igual.</div> : null}
            {status === 'ready' && tiers.length ? (
                <div className="vp-maplegend" style={{ zIndex: 500 }}>
                    {tiers.map((tier, index) => (
                        <div key={tier.id || index} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i style={{ width: 10, height: 10, borderRadius: '50%', background: RING_COLORS[index % RING_COLORS.length], display: 'inline-block' }} />
                            {tier.max_km ? `Hasta ${tier.max_km} km` : 'Sin límite'}
                        </div>
                    ))}
                    {specials.length ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 10, height: 10, background: '#f04438', display: 'inline-block' }} />Zonas especiales</div> : null}
                </div>
            ) : null}
        </div>
    );
}
