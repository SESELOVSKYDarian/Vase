import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Buildings,
    MapPin,
    NavigationArrow,
    Package,
    WarningCircle,
} from '@phosphor-icons/react';
import { cn } from '../../../utils/cn';
import { loadLeaflet } from '../../../utils/leafletLoader';
import { hasZonePolygon, normalizeBranches, normalizeShippingZones } from '../../../utils/shipping';

const DISTANCE_COLORS = ['#4f46e5', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const FIXED_COLORS = ['#2563eb', '#0f766e', '#b45309', '#be123c', '#7c3aed', '#0369a1'];
const DEFAULT_CENTER = { lat: -38.0055, lng: -57.5426 };
const LABEL_BEARINGS = [320, 18, 122, 220, 72, 170];

const statusToneMap = {
    loading: 'border-sky-200 bg-sky-50 text-sky-700',
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
};

const statusLabels = {
    loading: 'Cargando mapa',
    ready: 'Mapa listo',
    error: 'Error de carga',
};

const formatMoney = (value) => `$${Number(value || 0).toLocaleString('es-AR')}`;
const formatZonePrice = (value) => (Number(value || 0) <= 0 ? 'Gratis' : formatMoney(value));
const formatDistanceZonePrice = (zone) => {
    if (zone?.distance_pricing_mode === 'per_km') {
        const base = Number(zone?.price || 0);
        const rate = Number(zone?.price_per_km || 0);
        if (base > 0) {
            return `${formatMoney(base)} + ${formatMoney(rate)}/km`;
        }
        return `${formatMoney(rate)}/km`;
    }
    return formatZonePrice(zone?.price || 0);
};

const formatDistanceBand = (zone) => {
    const min = Number(zone.min_distance_km || 0);
    if (zone.max_distance_km == null) {
        return `Desde ${min} km`;
    }
    return `${min} a ${zone.max_distance_km} km`;
};

const getFlatZoneLabelMarkup = (zone) => `
    <div style="
        min-width: 88px;
        max-width: 132px;
        padding: 8px 10px;
        border-radius: 14px;
        border: 1px solid ${zone.color}44;
        background: rgba(255,255,255,0.92);
        box-shadow: 0 8px 20px rgba(15,23,42,0.08);
        text-align: center;
        color: #0f172a;
    ">
        <div style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 2px 7px;
            border-radius: 999px;
            background: rgba(15,23,42,0.05);
            color: #64748b;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
        ">${zone.name || 'Zona'}</div>
        <div style="
            margin-top: 6px;
            font-size: 16px;
            line-height: 1;
            font-weight: 800;
            color: #0f172a;
        ">${formatZonePrice(zone.price)}</div>
        <div style="
            margin-top: 4px;
            font-size: 9px;
            line-height: 1.25;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #94a3b8;
        ">zona fija</div>
    </div>
`;

const offsetCoordinateByKm = (origin, distanceKm, bearingDeg) => {
    const earthRadiusKm = 6371;
    const bearing = (bearingDeg * Math.PI) / 180;
    const lat1 = (origin.lat * Math.PI) / 180;
    const lng1 = (origin.lng * Math.PI) / 180;
    const angularDistance = distanceKm / earthRadiusKm;

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(angularDistance) +
            Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
    );

    const lng2 =
        lng1 +
        Math.atan2(
            Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
            Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
        );

    return {
        lat: (lat2 * 180) / Math.PI,
        lng: (lng2 * 180) / Math.PI,
    };
};

const getZoneLabelDistanceKm = (zone) => {
    const min = Math.max(0, Number(zone.min_distance_km || 0));
    const max = zone.max_distance_km == null ? null : Math.max(min, Number(zone.max_distance_km || 0));

    if (min === 0 && max != null) {
        return Math.max(0.45, max * 0.22);
    }

    if (zone.max_distance_km == null) {
        return Math.max(min + 2.5, 3);
    }

    return Math.max(1.25, min + (max - min) * 0.55);
};

const getZoneLabelMarkup = (zone) => {
    const isFree = Number(zone.price || 0) <= 0;
    const accent = isFree ? 'rgba(15,23,42,0.18)' : `${zone.color}55`;
    const priceText = zone.priceLabel || formatDistanceZonePrice(zone);
    const bandText = formatDistanceBand(zone);
    const zoneName = zone.name || 'Zona';

    return `
        <div style="
            min-width: 96px;
            max-width: 132px;
            padding: 8px 10px;
            border-radius: 14px;
            border: 1px solid ${accent};
            background: rgba(255,255,255,0.88);
            box-shadow: 0 8px 20px rgba(15,23,42,0.10);
            text-align: center;
            color: #0f172a;
            backdrop-filter: blur(4px);
        ">
            <div style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 2px 7px;
                border-radius: 999px;
                background: rgba(15,23,42,0.05);
                color: #64748b;
                font-size: 8px;
                font-weight: 700;
                letter-spacing: 0.14em;
                text-transform: uppercase;
            ">${zoneName}</div>
            <div style="
                margin-top: 6px;
                font-size: ${isFree ? '18px' : '17px'};
                line-height: 1;
                font-weight: 800;
                color: #0f172a;
            ">${priceText}</div>
            <div style="
                margin-top: 4px;
                font-size: 9px;
                line-height: 1.25;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: #94a3b8;
            ">${bandText}</div>
        </div>
    `;
};

const SummaryCard = ({ icon: Icon, label, value, toneClass = '' }) => (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.25)]">
        <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600', toneClass)}>
                <Icon size={18} weight="duotone" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{label}</p>
                <p className="truncate text-lg font-semibold text-slate-900">{value}</p>
            </div>
        </div>
    </div>
);

const DistanceZoneRow = ({ zone }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
                <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: zone.color }}
                />
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{zone.name}</p>
                    <p className="text-xs text-slate-500">{formatDistanceBand(zone)}</p>
                </div>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-700">
                {zone.priceLabel || formatDistanceZonePrice(zone)}
            </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                {zone.branch?.name || (zone.branch_id ? 'Sucursal' : 'Sucursal mas cercana')}
            </span>
            {zone.description ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                    {zone.description}
                </span>
            ) : null}
        </div>
    </div>
);

const FlatZoneRow = ({ zone }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{zone.name}</p>
                <p className="text-xs text-slate-500">
                    {zone.description ||
                        (hasZonePolygon(zone)
                            ? 'Se cotiza automaticamente por ubicacion.'
                            : 'Seleccion manual del cliente.')}
                </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-700">
                {formatZonePrice(zone.price)}
            </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                {hasZonePolygon(zone) ? 'Area mapeada' : 'Sin area'}
            </span>
            {zone.branch_id ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                    Con sucursal origen
                </span>
            ) : null}
        </div>
    </div>
);

const BranchRow = ({ branch }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.18)]">
        <p className="text-sm font-semibold text-slate-900">{branch.name}</p>
        <p className="mt-1 text-xs text-slate-500">{branch.address || 'Sin direccion cargada'}</p>
        <p className="mt-2 font-mono text-[11px] text-slate-500">
            {branch.latitude}, {branch.longitude}
        </p>
    </div>
);

const ShippingZonesMapPreview = ({ branches = [], shippingZones = [] }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const layersRef = useRef([]);
    const [status, setStatus] = useState('loading');

    const normalizedBranches = useMemo(() => normalizeBranches(branches), [branches]);
    const normalizedZones = useMemo(() => normalizeShippingZones(shippingZones), [shippingZones]);

    const mappableBranches = useMemo(
        () =>
            normalizedBranches.filter(
                (branch) => branch.latitude != null && branch.longitude != null,
            ),
        [normalizedBranches],
    );

    const branchMap = useMemo(
        () => new Map(mappableBranches.map((branch) => [branch.id, branch])),
        [mappableBranches],
    );

    const distanceZones = useMemo(
        () =>
            normalizedZones
                .filter((zone) => zone.type === 'distance')
                .map((zone, index) => {
                    const branch = zone.branch_id ? branchMap.get(zone.branch_id) : mappableBranches[0];
                    return {
                        ...zone,
                        branch: branch || null,
                        color: DISTANCE_COLORS[index % DISTANCE_COLORS.length],
                    };
                })
                .filter((zone) => zone.branch && zone.branch.latitude != null && zone.branch.longitude != null)
                .sort((a, b) => {
                    const aMax = a.max_distance_km == null ? Number.POSITIVE_INFINITY : Number(a.max_distance_km);
                    const bMax = b.max_distance_km == null ? Number.POSITIVE_INFINITY : Number(b.max_distance_km);
                    return aMax - bMax;
                }),
        [branchMap, mappableBranches, normalizedZones],
    );

    const distanceZonesWithLabels = useMemo(() => {
        const perBranchCount = new Map();

        return distanceZones.map((zone) => {
            const branchKey = zone.branch?.id || 'default';
            const branchIndex = perBranchCount.get(branchKey) || 0;
            perBranchCount.set(branchKey, branchIndex + 1);

            return {
                ...zone,
                labelBearing: LABEL_BEARINGS[branchIndex % LABEL_BEARINGS.length],
                labelDistanceKm: getZoneLabelDistanceKm(zone),
                        priceLabel: formatDistanceZonePrice(zone),
                    };
        });
    }, [distanceZones]);

    const flatZones = useMemo(
        () => normalizedZones.filter((zone) => zone.type !== 'distance'),
        [normalizedZones],
    );

    const mappedFlatZones = useMemo(
        () =>
            flatZones
                .filter((zone) => hasZonePolygon(zone))
                .map((zone, index) => ({
                    ...zone,
                    color: FIXED_COLORS[index % FIXED_COLORS.length],
                })),
        [flatZones],
    );

    const manualFlatZones = useMemo(
        () => flatZones.filter((zone) => !hasZonePolygon(zone)),
        [flatZones],
    );

    const missingDistanceZones = useMemo(() => {
        const mappedIds = new Set(distanceZonesWithLabels.map((zone) => zone.id));
        return normalizedZones.filter(
            (zone) => zone.type === 'distance' && !mappedIds.has(zone.id),
        );
    }, [distanceZonesWithLabels, normalizedZones]);

    useEffect(() => {
        let cancelled = false;

        const bootMap = async () => {
            try {
                const L = await loadLeaflet();
                if (cancelled || !mapContainerRef.current) return;

                const map = L.map(mapContainerRef.current, {
                    zoomControl: true,
                    attributionControl: true,
                }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 10);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors',
                    maxZoom: 19,
                }).addTo(map);

                mapRef.current = map;
                setStatus('ready');
            } catch (error) {
                console.error('Failed to load shipping zones preview map', error);
                if (!cancelled) {
                    setStatus('error');
                }
            }
        };

        bootMap();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
            }
            mapRef.current = null;
            layersRef.current = [];
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        const L = window.L;
        if (!map || !L) return;

        layersRef.current.forEach((layer) => {
            try {
                map.removeLayer(layer);
            } catch {}
        });
        layersRef.current = [];

        const bounds = [];

        mappedFlatZones.forEach((zone) => {
            const polygonLayer = L.polygon(
                zone.polygon.map((point) => [point.lat, point.lng]),
                {
                    color: zone.color,
                    weight: 2,
                    fillColor: zone.color,
                    fillOpacity: 0.12,
                },
            ).addTo(map);

            polygonLayer.bindTooltip(`${zone.name} · ${formatZonePrice(zone.price)}`, {
                direction: 'top',
                offset: [0, -6],
            });

            layersRef.current.push(polygonLayer);
            bounds.push(polygonLayer.getBounds().getNorthEast());
            bounds.push(polygonLayer.getBounds().getSouthWest());

            if (zone.centroid?.lat != null && zone.centroid?.lng != null) {
                const labelMarker = L.marker([zone.centroid.lat, zone.centroid.lng], {
                    interactive: false,
                    icon: L.divIcon({
                        className: 'shipping-zone-fixed-label',
                        iconSize: null,
                        html: getFlatZoneLabelMarkup(zone),
                    }),
                }).addTo(map);

                layersRef.current.push(labelMarker);
                bounds.push([zone.centroid.lat, zone.centroid.lng]);
            }
        });

        distanceZonesWithLabels.forEach((zone) => {
            const center = [zone.branch.latitude, zone.branch.longitude];
            bounds.push(center);

            const marker = L.circleMarker(center, {
                radius: 7,
                color: '#ffffff',
                weight: 2,
                fillColor: zone.color,
                fillOpacity: 1,
            }).addTo(map);

            marker.bindTooltip(`${zone.branch.name} · ${zone.name}`, {
                direction: 'top',
                offset: [0, -6],
            });

            const minRadius = Math.max(0, Number(zone.min_distance_km || 0)) * 1000;
            const maxRadiusRaw = zone.max_distance_km == null ? zone.min_distance_km : zone.max_distance_km;
            const maxRadius = Math.max(Number(maxRadiusRaw || 0), Number(zone.min_distance_km || 0)) * 1000;

            if (maxRadius > 0) {
                const outerCircle = L.circle(center, {
                    radius: maxRadius,
                    color: zone.color,
                    weight: 2,
                    fillColor: zone.color,
                    fillOpacity: 0.12,
                }).addTo(map);
                layersRef.current.push(outerCircle);
                bounds.push(outerCircle.getBounds().getNorthEast());
                bounds.push(outerCircle.getBounds().getSouthWest());
            }

            if (minRadius > 0) {
                const innerCircle = L.circle(center, {
                    radius: minRadius,
                    color: zone.color,
                    weight: 1.5,
                    dashArray: '7 7',
                    fillOpacity: 0,
                }).addTo(map);
                layersRef.current.push(innerCircle);
            }

            const labelPosition = offsetCoordinateByKm(
                { lat: zone.branch.latitude, lng: zone.branch.longitude },
                zone.labelDistanceKm,
                zone.labelBearing,
            );

            const labelMarker = L.marker([labelPosition.lat, labelPosition.lng], {
                interactive: false,
                icon: L.divIcon({
                    className: 'shipping-zone-price-label',
                    iconSize: null,
                    html: getZoneLabelMarkup(zone),
                }),
            }).addTo(map);

            layersRef.current.push(labelMarker);
            bounds.push([labelPosition.lat, labelPosition.lng]);
            layersRef.current.push(marker);
        });

        mappableBranches.forEach((branch) => {
            const represented = distanceZonesWithLabels.some((zone) => zone.branch?.id === branch.id);
            if (represented) return;

            const marker = L.circleMarker([branch.latitude, branch.longitude], {
                radius: 6,
                color: '#ffffff',
                weight: 2,
                fillColor: '#94a3b8',
                fillOpacity: 1,
            }).addTo(map);

            marker.bindTooltip(branch.name, {
                direction: 'top',
                offset: [0, -6],
            });

            layersRef.current.push(marker);
            bounds.push([branch.latitude, branch.longitude]);
        });

        if (bounds.length) {
            map.fitBounds(bounds, {
                padding: [32, 32],
                maxZoom: 13,
            });
        } else {
            map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 10);
        }
    }, [distanceZonesWithLabels, mappedFlatZones, mappableBranches]);

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-5">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <NavigationArrow size={18} weight="duotone" className="text-evolution-indigo" />
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-900">Mapa de zonas de envio</p>
                                <span
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em]',
                                        statusToneMap[status] || statusToneMap.loading,
                                    )}
                                >
                                    {statusLabels[status] || statusLabels.loading}
                                </span>
                            </div>
                            <p className="max-w-2xl text-sm text-slate-500">
                                Visualiza radios por sucursal y zonas fijas dibujadas. Las zonas fijas mapeadas se cotizan automaticamente cuando la ubicacion del cliente cae dentro del area.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <SummaryCard
                            icon={NavigationArrow}
                            label="Zonas por distancia"
                            value={distanceZonesWithLabels.length}
                            toneClass="text-indigo-600"
                        />
                        <SummaryCard
                            icon={Package}
                            label="Zonas fijas"
                            value={mappedFlatZones.length ? `${mappedFlatZones.length}/${flatZones.length}` : flatZones.length}
                            toneClass="text-amber-600"
                        />
                        <SummaryCard
                            icon={Buildings}
                            label="Sucursales mapeadas"
                            value={mappableBranches.length}
                            toneClass="text-sky-600"
                        />
                        <SummaryCard
                            icon={WarningCircle}
                            label="Pendientes"
                            value={missingDistanceZones.length + manualFlatZones.length}
                            toneClass="text-rose-600"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1.15fr)_360px] md:p-5">
                <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-20px_rgba(15,23,42,0.25)]">
                        <div ref={mapContainerRef} className="h-[420px] w-full" />

                        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-700 shadow-sm backdrop-blur">
                            Radios activos: {distanceZonesWithLabels.length}
                        </div>

                        <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
                            Las zonas azules rellenadas son areas fijas.
                            <br />
                            Los anillos muestran bandas por distancia desde cada sucursal.
                        </div>

                        {status !== 'ready' ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/90 px-6 text-center text-sm text-slate-600">
                                {status === 'loading'
                                    ? 'Preparando el mapa de cobertura.'
                                    : 'No se pudo cargar la vista de zonas de envio.'}
                            </div>
                        ) : null}
                    </div>

                    {missingDistanceZones.length || manualFlatZones.length ? (
                        <div className="rounded-2xl border border-rose-200 bg-white p-4 text-sm text-slate-700 shadow-[0_8px_24px_-20px_rgba(244,63,94,0.18)]">
                            Hay {missingDistanceZones.length + manualFlatZones.length} zona{missingDistanceZones.length + manualFlatZones.length > 1 ? 's' : ''} todavia sin representar del todo.
                            {missingDistanceZones.length ? ' Revisa radios sin sucursal o sin coordenadas.' : ''}
                            {manualFlatZones.length ? ' Las zonas fijas sin area siguen quedando como seleccion manual.' : ''}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-slate-700 shadow-[0_8px_24px_-20px_rgba(16,185,129,0.18)]">
                            Todas las zonas por distancia con origen valido ya se estan representando en el mapa.
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <MapPin size={18} weight="duotone" className="text-evolution-indigo" />
                            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Radios activos</p>
                        </div>
                        <div className="space-y-2">
                            {distanceZonesWithLabels.length ? (
                                distanceZonesWithLabels.map((zone) => (
                                    <DistanceZoneRow key={`zone-${zone.id}`} zone={zone} />
                                ))
                            ) : (
                                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                                    Aun no hay radios configurados con coordenadas validas.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <Package size={18} weight="duotone" className="text-amber-600" />
                            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Zonas fijas</p>
                        </div>
                        <div className="space-y-2">
                            {flatZones.length ? (
                                flatZones.map((zone) => <FlatZoneRow key={`flat-${zone.id}`} zone={zone} />)
                            ) : (
                                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                                    No hay zonas fijas cargadas.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <Buildings size={18} weight="duotone" className="text-sky-600" />
                            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Sucursales visibles</p>
                        </div>
                        <div className="space-y-2">
                            {mappableBranches.length ? (
                                mappableBranches.map((branch) => (
                                    <BranchRow key={`branch-${branch.id}`} branch={branch} />
                                ))
                            ) : (
                                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                                    Carga latitud y longitud en una sucursal para verla en el mapa.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShippingZonesMapPreview;
