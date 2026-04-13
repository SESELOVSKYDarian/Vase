import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    MagnifyingGlass,
    MapTrifold,
    Trash,
} from '@phosphor-icons/react';
import { loadLeaflet } from '../../../utils/leafletLoader';
import { cn } from '../../../utils/cn';
import { hasZonePolygon } from '../../../utils/shipping';

const DEFAULT_CENTER = { lat: -38.0055, lng: -57.5426 };
const MIN_SPAN_DEGREES = 0.0025;

const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/15';

const buttonClass =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50';

const statusToneMap = {
    loading: 'border-sky-200 bg-sky-50 text-sky-700',
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
};

const statusLabels = {
    loading: 'Preparando mapa',
    ready: 'Area editable',
    error: 'Error de carga',
};

const parseCoordinate = (value, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
    return parsed;
};

const polygonFromBoundingBox = (bounds) => {
    if (!Array.isArray(bounds) || bounds.length < 4) return [];

    const south = parseCoordinate(bounds[0], -90, 90);
    const north = parseCoordinate(bounds[1], -90, 90);
    const west = parseCoordinate(bounds[2], -180, 180);
    const east = parseCoordinate(bounds[3], -180, 180);

    if ([south, north, west, east].some((value) => value == null)) return [];

    return [
        { lat: south, lng: west },
        { lat: north, lng: west },
        { lat: north, lng: east },
        { lat: south, lng: east },
    ];
};

const polygonFromLeafletBounds = (bounds) => {
    if (!bounds) return [];
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();

    return [
        { lat: southWest.lat, lng: southWest.lng },
        { lat: northEast.lat, lng: southWest.lng },
        { lat: northEast.lat, lng: northEast.lng },
        { lat: southWest.lat, lng: northEast.lng },
    ].map((point) => ({
        lat: Number(point.lat.toFixed(6)),
        lng: Number(point.lng.toFixed(6)),
    }));
};

const polygonBounds = (polygon = []) => {
    if (!Array.isArray(polygon) || polygon.length < 3) return null;

    const latitudes = polygon.map((point) => point.lat);
    const longitudes = polygon.map((point) => point.lng);

    return {
        south: Math.min(...latitudes),
        north: Math.max(...latitudes),
        west: Math.min(...longitudes),
        east: Math.max(...longitudes),
    };
};

const normalizeBoundsObject = (bounds = null) => {
    if (!bounds) return null;

    let south = parseCoordinate(bounds.south, -90, 90);
    let north = parseCoordinate(bounds.north, -90, 90);
    let west = parseCoordinate(bounds.west, -180, 180);
    let east = parseCoordinate(bounds.east, -180, 180);

    if ([south, north, west, east].some((value) => value == null)) return null;

    if (south > north) [south, north] = [north, south];
    if (west > east) [west, east] = [east, west];

    if (north - south < MIN_SPAN_DEGREES) {
        const center = (north + south) / 2;
        south = center - MIN_SPAN_DEGREES / 2;
        north = center + MIN_SPAN_DEGREES / 2;
    }

    if (east - west < MIN_SPAN_DEGREES) {
        const center = (east + west) / 2;
        west = center - MIN_SPAN_DEGREES / 2;
        east = center + MIN_SPAN_DEGREES / 2;
    }

    return {
        south: Number(south.toFixed(6)),
        north: Number(north.toFixed(6)),
        west: Number(west.toFixed(6)),
        east: Number(east.toFixed(6)),
    };
};

const polygonFromBoundsObject = (bounds) => {
    const normalized = normalizeBoundsObject(bounds);
    if (!normalized) return [];
    return [
        { lat: normalized.south, lng: normalized.west },
        { lat: normalized.north, lng: normalized.west },
        { lat: normalized.north, lng: normalized.east },
        { lat: normalized.south, lng: normalized.east },
    ];
};

const centerFromBoundsObject = (bounds) => ({
    lat: Number(((bounds.north + bounds.south) / 2).toFixed(6)),
    lng: Number(((bounds.east + bounds.west) / 2).toFixed(6)),
});

const searchNominatim = async (query) => {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'ar');
    url.searchParams.set('q', query);

    const response = await fetch(url.toString(), {
        headers: {
            Accept: 'application/json',
            'Accept-Language': 'es-AR,es;q=0.9',
        },
    });

    if (!response.ok) {
        throw new Error(`nominatim_${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
};

const createFallbackBoundingBox = (latitude, longitude, span = 0.01) => [
    latitude - span,
    latitude + span,
    longitude - span,
    longitude + span,
];

const ResultRow = ({ result, onSelect }) => (
    <button
        type="button"
        onClick={() => onSelect(result)}
        className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-all hover:border-slate-300 hover:bg-slate-50"
    >
        <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{result.display_name}</p>
            <p className="mt-1 text-xs text-slate-500">
                {result.type || result.class || 'area'} · {result.lat}, {result.lon}
            </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">
            Usar
        </span>
    </button>
);

const GuideCard = ({ title, children }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.12)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{title}</p>
        <div className="mt-2 space-y-1.5 text-sm text-slate-600">{children}</div>
    </div>
);

const ShippingZoneAreaPicker = ({ zone, onChange }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const polygonLayerRef = useRef(null);
    const cornerHandlesRef = useRef([]);
    const centerHandleRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const [status, setStatus] = useState('loading');
    const [query, setQuery] = useState(zone?.name || '');
    const [feedback, setFeedback] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const polygon = useMemo(
        () => (Array.isArray(zone?.polygon) ? zone.polygon.filter((point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng))) : []),
        [zone?.polygon],
    );

    const hasPolygon = hasZonePolygon(zone);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    const clearInteractiveLayers = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;

        if (polygonLayerRef.current) {
            map.removeLayer(polygonLayerRef.current);
            polygonLayerRef.current = null;
        }

        cornerHandlesRef.current.forEach((handle) => {
            try {
                map.removeLayer(handle);
            } catch {}
        });
        cornerHandlesRef.current = [];

        if (centerHandleRef.current) {
            try {
                map.removeLayer(centerHandleRef.current);
            } catch {}
            centerHandleRef.current = null;
        }
    }, []);

    const syncInteractiveBounds = useCallback((boundsObject, options = {}) => {
        const map = mapRef.current;
        const L = window.L;
        if (!map || !L) return;

        clearInteractiveLayers();

        const normalizedBounds = normalizeBoundsObject(boundsObject);
        if (!normalizedBounds) return;

        polygonLayerRef.current = L.rectangle(
            [
                [normalizedBounds.south, normalizedBounds.west],
                [normalizedBounds.north, normalizedBounds.east],
            ],
            {
                color: '#2563eb',
                weight: 2,
                fillColor: '#2563eb',
                fillOpacity: 0.12,
            },
        ).addTo(map);

        const corners = {
            nw: [normalizedBounds.north, normalizedBounds.west],
            ne: [normalizedBounds.north, normalizedBounds.east],
            se: [normalizedBounds.south, normalizedBounds.east],
            sw: [normalizedBounds.south, normalizedBounds.west],
        };

        const oppositeCornerKey = {
            nw: 'se',
            ne: 'sw',
            se: 'nw',
            sw: 'ne',
        };

        const createHandleIcon = (role, color, size) =>
            L.divIcon({
                className: '',
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
                html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:2px solid #ffffff;box-shadow:0 6px 18px rgba(15,23,42,0.18);"></div>`,
            });

        Object.entries(corners).forEach(([role, latLng]) => {
            const marker = L.marker(latLng, {
                draggable: true,
                icon: createHandleIcon(role, '#2563eb', 14),
            }).addTo(map);

            marker.bindTooltip('Arrastra para agrandar o achicar', {
                direction: 'top',
                offset: [0, -8],
            });

            marker.on('dragend', (event) => {
                const current = event.target.getLatLng();
                const opposite = corners[oppositeCornerKey[role]];
                const nextBounds = normalizeBoundsObject({
                    south: Math.min(current.lat, opposite[0]),
                    north: Math.max(current.lat, opposite[0]),
                    west: Math.min(current.lng, opposite[1]),
                    east: Math.max(current.lng, opposite[1]),
                });

                if (!nextBounds) return;

                onChangeRef.current?.({
                    polygon: polygonFromBoundsObject(nextBounds),
                    coverage_mode: 'polygon',
                });
                setFeedback('Area actualizada. Puedes seguir moviendo o ajustando las esquinas.');
            });

            cornerHandlesRef.current.push(marker);
        });

        const center = centerFromBoundsObject(normalizedBounds);
        centerHandleRef.current = L.marker([center.lat, center.lng], {
            draggable: true,
            icon: createHandleIcon('center', '#0f172a', 16),
        }).addTo(map);

        centerHandleRef.current.bindTooltip('Arrastra para mover toda el area', {
            direction: 'top',
            offset: [0, -8],
        });

        centerHandleRef.current.on('dragend', (event) => {
            const nextCenter = event.target.getLatLng();
            const currentCenter = centerFromBoundsObject(normalizedBounds);
            const deltaLat = nextCenter.lat - currentCenter.lat;
            const deltaLng = nextCenter.lng - currentCenter.lng;

            const movedBounds = normalizeBoundsObject({
                south: normalizedBounds.south + deltaLat,
                north: normalizedBounds.north + deltaLat,
                west: normalizedBounds.west + deltaLng,
                east: normalizedBounds.east + deltaLng,
            });

            if (!movedBounds) return;

            onChangeRef.current?.({
                polygon: polygonFromBoundsObject(movedBounds),
                coverage_mode: 'polygon',
            });
            setFeedback('Area movida. Ajusta las esquinas si necesitas un encuadre mas preciso.');
        });

        if (options.fit !== false) {
            map.fitBounds(polygonLayerRef.current.getBounds(), {
                padding: [24, 24],
                maxZoom: 15,
            });
        }
    }, [clearInteractiveLayers]);

    useEffect(() => {
        let cancelled = false;

        const bootMap = async () => {
            try {
                const L = await loadLeaflet();
                if (cancelled || !mapContainerRef.current) return;

                const map = L.map(mapContainerRef.current, {
                    zoomControl: true,
                    attributionControl: true,
                }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors',
                    maxZoom: 19,
                }).addTo(map);

                mapRef.current = map;
                setStatus('ready');
            } catch (error) {
                console.error('Failed to load flat zone area picker', error);
                if (!cancelled) {
                    setStatus('error');
                }
            }
        };

        bootMap();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                clearInteractiveLayers();
                mapRef.current.remove();
            }
            mapRef.current = null;
            polygonLayerRef.current = null;
        };
    }, [clearInteractiveLayers]);

    useEffect(() => {
        if (status !== 'ready') return;
        syncInteractiveBounds(polygonBounds(polygon), { fit: false });
    }, [polygon, status, syncInteractiveBounds]);

    const applyPolygon = useCallback(
        (polygonPoints, nextFeedback) => {
            if (!Array.isArray(polygonPoints) || polygonPoints.length < 3) {
                setFeedback('No se pudo construir un area valida.');
                return;
            }

            const normalized = polygonPoints.map((point) => ({
                lat: Number(point.lat.toFixed(6)),
                lng: Number(point.lng.toFixed(6)),
            }));

            onChangeRef.current?.({
                polygon: normalized,
                coverage_mode: 'polygon',
            });
            setFeedback(nextFeedback);
        },
        [],
    );

    const handleSearch = useCallback(async () => {
        const rawQuery = String(query || '').trim();
        if (!rawQuery) return;

        setIsSearching(true);
        setFeedback('');
        setSearchResults([]);

        try {
            const results = await searchNominatim(rawQuery);
            if (!results.length) {
                setFeedback('No encontramos un barrio o zona con ese nombre.');
                return;
            }

            if (results.length === 1) {
                const first = results[0];
                const fallbackBounds = createFallbackBoundingBox(Number(first.lat), Number(first.lon));
                applyPolygon(
                    polygonFromBoundingBox(first.boundingbox || fallbackBounds),
                    `Area cargada desde ${first.display_name}.`,
                );
                return;
            }

            setSearchResults(results);
            setFeedback('Elegí el resultado correcto para aplicar su area.');
        } catch (error) {
            console.error('Failed to search fixed shipping zone', error);
            setFeedback('No se pudo consultar OpenStreetMap para esa zona.');
        } finally {
            setIsSearching(false);
        }
    }, [applyPolygon, query]);

    const handleSelectResult = useCallback(
        (result) => {
            const fallbackBounds = createFallbackBoundingBox(Number(result.lat), Number(result.lon));
            applyPolygon(
                polygonFromBoundingBox(result.boundingbox || fallbackBounds),
                `Area cargada desde ${result.display_name}.`,
            );
            setSearchResults([]);
        },
        [applyPolygon],
    );

    const useViewportBounds = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        applyPolygon(
            polygonFromLeafletBounds(map.getBounds()),
            'Area guardada a partir del cuadro visible del mapa.',
        );
    }, [applyPolygon]);

    const clearPolygon = useCallback(() => {
        onChangeRef.current?.({
            polygon: [],
            coverage_mode: 'manual',
        });
        setFeedback('La zona vuelve a modo seleccion manual.');
        setSearchResults([]);
    }, []);

    const clearAll = useCallback(() => {
        clearPolygon();
        setQuery('');
        setSearchResults([]);
        setFeedback('');

        if (mapRef.current) {
            mapRef.current.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12);
        }
    }, [clearPolygon]);

    const polygonStats = useMemo(() => {
        const bounds = polygonBounds(polygon);
        if (!bounds) return null;
        return {
            heightKm: Math.abs(bounds.north - bounds.south) * 111.32,
            widthKm:
                Math.abs(bounds.east - bounds.west) *
                111.32 *
                Math.cos((((bounds.north + bounds.south) / 2) * Math.PI) / 180),
        };
    }, [polygon]);

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-34px_rgba(15,23,42,0.22)]">
            <div className="border-b border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <MapTrifold size={18} weight="duotone" className="text-evolution-indigo" />
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-900">Area de zona fija</p>
                            <span
                                className={cn(
                                    'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]',
                                    statusToneMap[status] || statusToneMap.loading,
                                )}
                            >
                                {statusLabels[status] || statusLabels.loading}
                            </span>
                        </div>
                        <p className="max-w-2xl text-sm text-slate-500">
                            Busca un barrio, un sector o ajusta el mapa y guarda el area visible. Si esta zona tiene poligono, el cliente obtiene la cotizacion automaticamente por ubicacion.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1.15fr)_320px]">
                <div className="space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row">
                        <input
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Ej: Guemes Mar del Plata"
                            className={inputClass}
                        />
                        <button
                            type="button"
                            onClick={handleSearch}
                            disabled={isSearching}
                            className={buttonClass}
                        >
                            <MagnifyingGlass size={16} weight="bold" />
                            {isSearching ? 'Buscando...' : 'Buscar zona'}
                        </button>
                        <button type="button" onClick={clearAll} className={buttonClass}>
                            <Trash size={16} weight="bold" />
                            Borrar todo
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <GuideCard title="Que poner">
                            <p>`Guemes Mar del Plata`</p>
                            <p>`Centro Mar del Plata`</p>
                            <p>`Los Troncos Mar del Plata`</p>
                        </GuideCard>
                        <GuideCard title="Flujo recomendado">
                            <p>1. Busca el barrio o sector.</p>
                            <p>2. Revisa el encuadre del mapa.</p>
                            <p>3. Guarda el area visible.</p>
                            <p>4. Arrastra el centro para mover y las esquinas para agrandar.</p>
                        </GuideCard>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-20px_rgba(15,23,42,0.2)]">
                        <div ref={mapContainerRef} className="h-[320px] w-full" />
                        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-700 shadow-sm">
                            {hasPolygon ? 'Area activa' : 'Sin area cargada'}
                        </div>
                        {hasPolygon ? (
                            <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-600 shadow-sm">
                                Arrastra el punto central para mover toda el area.
                                <br />
                                Arrastra las esquinas para agrandar o reducir la cobertura.
                            </div>
                        ) : null}
                        {status !== 'ready' ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/90 px-6 text-center text-sm text-slate-600">
                                {status === 'loading'
                                    ? 'Preparando la vista de OpenStreetMap.'
                                    : 'No se pudo cargar el mapa para esta zona.'}
                            </div>
                        ) : null}
                    </div>

                    {searchResults.length ? (
                        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Resultados</p>
                            <div className="space-y-2">
                                {searchResults.map((result) => (
                                    <ResultRow
                                        key={`${result.place_id}-${result.osm_id || result.display_name}`}
                                        result={result}
                                        onSelect={handleSelectResult}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Acciones</p>
                        <div className="mt-3 grid gap-2">
                            <button type="button" onClick={useViewportBounds} className={buttonClass}>
                                <MapTrifold size={16} weight="bold" />
                                Guardar area visible
                            </button>
                            <button type="button" onClick={clearPolygon} className={buttonClass}>
                                <Trash size={16} weight="bold" />
                                Limpiar solo area
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Estado</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                            <p>{hasPolygon ? 'La zona cotiza por ubicacion del cliente.' : 'La zona queda como seleccion manual.'}</p>
                            {polygonStats ? (
                                <p>
                                    Cobertura aproximada: {polygonStats.widthKm.toFixed(1)} km x {polygonStats.heightKm.toFixed(1)} km
                                </p>
                            ) : null}
                            {feedback ? (
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                    {feedback}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShippingZoneAreaPicker;
