import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowSquareOut,
    Buildings,
    Crosshair,
    MagnifyingGlass,
    MapPin,
    MapTrifold,
    Trash,
} from '@phosphor-icons/react';
import { loadLeaflet } from '../../../utils/leafletLoader';
import { cn } from '../../../utils/cn';

const DEFAULT_CENTER = { lat: -38.0055, lng: -57.5426 };

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
    loading: 'Cargando mapa',
    ready: 'OpenStreetMap listo',
    error: 'No se pudo cargar',
};

const parseCoordinate = (value, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
    return parsed;
};

const extractCoordinatesFromText = (value) => {
    const source = String(value || '').trim();
    if (!source) return null;

    const patterns = [
        /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
        /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
        /[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
        /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
    ];

    for (const pattern of patterns) {
        const match = source.match(pattern);
        if (!match) continue;

        const latitude = parseCoordinate(match[1], -90, 90);
        const longitude = parseCoordinate(match[2], -180, 180);
        if (latitude == null || longitude == null) continue;

        return { latitude, longitude };
    }

    return null;
};

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

const MetricCard = ({ icon: Icon, label, value, accent = '' }) => (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.25)]">
        <div className="flex items-center gap-2">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500', accent)}>
                <Icon size={16} weight="bold" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{label}</p>
                <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
            </div>
        </div>
    </div>
);

const BranchLocationPicker = ({ branch, onCoordinatesChange, onAddressChange }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const onCoordinatesChangeRef = useRef(onCoordinatesChange);
    const onAddressChangeRef = useRef(onAddressChange);
    const [status, setStatus] = useState('loading');
    const [query, setQuery] = useState(branch?.address || '');
    const [feedback, setFeedback] = useState('');
    const [isResolving, setIsResolving] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    const selectedPosition = useMemo(() => {
        const latitude = parseCoordinate(branch?.latitude, -90, 90);
        const longitude = parseCoordinate(branch?.longitude, -180, 180);
        if (latitude == null || longitude == null) return null;
        return { lat: latitude, lng: longitude };
    }, [branch?.latitude, branch?.longitude]);

    useEffect(() => {
        onCoordinatesChangeRef.current = onCoordinatesChange;
    }, [onCoordinatesChange]);

    useEffect(() => {
        onAddressChangeRef.current = onAddressChange;
    }, [onAddressChange]);

    useEffect(() => {
        setQuery(branch?.address || '');
    }, [branch?.address]);

    const setLocation = useCallback(
        ({ latitude, longitude, address = '' }) => {
            const lat = Number(latitude);
            const lng = Number(longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const roundedLatitude = Number(lat.toFixed(6));
            const roundedLongitude = Number(lng.toFixed(6));

            onCoordinatesChangeRef.current?.({
                latitude: roundedLatitude,
                longitude: roundedLongitude,
            });

            if (address) {
                setQuery(address);
                onAddressChangeRef.current?.(address);
            }

            if (mapRef.current) {
                mapRef.current.setView([roundedLatitude, roundedLongitude], 16);
            }

            if (markerRef.current) {
                markerRef.current.setLatLng([roundedLatitude, roundedLongitude]);
            }

            setFeedback(`Ubicacion seleccionada: ${roundedLatitude}, ${roundedLongitude}`);
        },
        [],
    );

    const reverseLookup = useCallback(async (latitude, longitude) => {
        try {
            const url = new URL('https://nominatim.openstreetmap.org/reverse');
            url.searchParams.set('format', 'jsonv2');
            url.searchParams.set('lat', latitude);
            url.searchParams.set('lon', longitude);

            const response = await fetch(url.toString(), {
                headers: {
                    Accept: 'application/json',
                    'Accept-Language': 'es-AR,es;q=0.9',
                },
            });

            if (!response.ok) return;
            const payload = await response.json();
            const displayName = payload?.display_name;
            if (displayName) {
                setQuery(displayName);
                onAddressChangeRef.current?.(displayName);
            }
        } catch (error) {
            console.error('Failed to reverse lookup OSM address', error);
        }
    }, []);

    const resolveFromInput = useCallback(async () => {
        const rawValue = String(query || '').trim();
        if (!rawValue) return;

        setIsResolving(true);
        setFeedback('');
        setSearchResults([]);

        try {
            const extractedCoordinates = extractCoordinatesFromText(rawValue);
            if (extractedCoordinates) {
                setLocation({
                    latitude: extractedCoordinates.latitude,
                    longitude: extractedCoordinates.longitude,
                    address: branch?.address || rawValue,
                });
                return;
            }

            const results = await searchNominatim(rawValue);
            if (!results.length) {
                setFeedback('No encontramos resultados para esa direccion.');
                return;
            }

            if (results.length === 1) {
                const first = results[0];
                setLocation({
                    latitude: Number(first.lat),
                    longitude: Number(first.lon),
                    address: first.display_name || rawValue,
                });
                return;
            }

            setSearchResults(results);
            setFeedback('Selecciona uno de los resultados para fijar la sucursal.');
        } catch (error) {
            console.error('Failed to resolve OSM location', error);
            setFeedback('No se pudo resolver la ubicacion ingresada.');
        } finally {
            setIsResolving(false);
        }
    }, [branch?.address, query, setLocation]);

    const useCurrentLocation = useCallback(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setFeedback('Este navegador no permite usar geolocalizacion.');
            return;
        }

        setIsResolving(true);
        setFeedback('');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latitude = position?.coords?.latitude;
                const longitude = position?.coords?.longitude;
                if (latitude == null || longitude == null) {
                    setIsResolving(false);
                    setFeedback('No se pudo obtener la ubicacion actual.');
                    return;
                }

                setLocation({ latitude, longitude });
                await reverseLookup(latitude, longitude);
                setIsResolving(false);
            },
            (error) => {
                console.error('Failed to get current browser location', error);
                setIsResolving(false);
                setFeedback('No se pudo acceder a la ubicacion actual.');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            },
        );
    }, [reverseLookup, setLocation]);

    const applySearchResult = useCallback(
        (result) => {
            setSearchResults([]);
            setLocation({
                latitude: Number(result.lat),
                longitude: Number(result.lon),
                address: result.display_name || query.trim(),
            });
        },
        [query, setLocation],
    );

    useEffect(() => {
        let cancelled = false;
        let clickHandler = null;
        let dragHandler = null;

        const bootMap = async () => {
            try {
                const L = await loadLeaflet();
                if (cancelled || !mapContainerRef.current) return;

                const center = selectedPosition || DEFAULT_CENTER;
                const map = L.map(mapContainerRef.current, {
                    zoomControl: true,
                    attributionControl: true,
                }).setView([center.lat, center.lng], selectedPosition ? 16 : 10);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors',
                    maxZoom: 19,
                }).addTo(map);

                const marker = L.marker([center.lat, center.lng], {
                    draggable: true,
                    autoPan: true,
                }).addTo(map);

                if (!selectedPosition) {
                    marker.remove();
                }

                mapRef.current = map;
                markerRef.current = marker;

                clickHandler = async (event) => {
                    const latitude = event?.latlng?.lat;
                    const longitude = event?.latlng?.lng;
                    if (latitude == null || longitude == null) return;

                    if (!map.hasLayer(marker)) {
                        marker.addTo(map);
                    }

                    setLocation({ latitude, longitude });
                    await reverseLookup(latitude, longitude);
                };

                dragHandler = async (event) => {
                    const latitude = event?.target?.getLatLng?.().lat;
                    const longitude = event?.target?.getLatLng?.().lng;
                    if (latitude == null || longitude == null) return;
                    setLocation({ latitude, longitude });
                    await reverseLookup(latitude, longitude);
                };

                map.on('click', clickHandler);
                marker.on('dragend', dragHandler);
                setStatus('ready');
            } catch (error) {
                console.error('Failed to load Leaflet branch picker', error);
                if (!cancelled) {
                    setStatus('error');
                    setFeedback('No se pudo cargar el mapa gratuito de OpenStreetMap.');
                }
            }
        };

        bootMap();

        return () => {
            cancelled = true;
            if (mapRef.current && clickHandler) {
                mapRef.current.off('click', clickHandler);
            }
            if (markerRef.current && dragHandler) {
                markerRef.current.off('dragend', dragHandler);
            }
            if (mapRef.current) {
                mapRef.current.remove();
            }
            mapRef.current = null;
            markerRef.current = null;
        };
    }, [reverseLookup, selectedPosition, setLocation]);

    useEffect(() => {
        const map = mapRef.current;
        const marker = markerRef.current;
        if (!map || !marker) return;

        if (!selectedPosition) {
            if (map.hasLayer(marker)) {
                marker.remove();
            }
            map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 10);
            return;
        }

        if (!map.hasLayer(marker)) {
            marker.addTo(map);
        }

        marker.setLatLng([selectedPosition.lat, selectedPosition.lng]);
        map.setView([selectedPosition.lat, selectedPosition.lng], 16);
    }, [selectedPosition]);

    const previewUrl =
        selectedPosition != null
            ? `https://www.openstreetmap.org/?mlat=${selectedPosition.lat}&mlon=${selectedPosition.lng}#map=17/${selectedPosition.lat}/${selectedPosition.lng}`
            : '';

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-evolution-indigo">
                            <MapTrifold size={22} weight="duotone" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-900">Ubicacion de la sucursal</p>
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
                                Busca por direccion, pega un link, escribe coordenadas o marca el punto directo en el mapa.
                            </p>
                        </div>
                    </div>

                    <div className="grid min-w-full grid-cols-1 gap-2 md:min-w-[280px] md:grid-cols-2">
                        <MetricCard
                            icon={Buildings}
                            label="Sucursal"
                            value={branch?.name || 'Sin nombre'}
                            accent="text-indigo-600"
                        />
                        <MetricCard
                            icon={MapPin}
                            label="Estado"
                            value={selectedPosition ? 'Con punto fijado' : 'Pendiente de ubicar'}
                            accent="text-amber-600"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] md:p-5">
                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Ingreso rapido</p>
                                <p className="text-xs text-slate-500">Direccion, link de Maps o coordenadas.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                            <input
                                type="text"
                                value={query}
                                placeholder="Ej: Av. Independencia 1234, Mar del Plata"
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    onAddressChange(event.target.value);
                                }}
                                className={inputClass}
                            />
                            <button
                                type="button"
                                onClick={resolveFromInput}
                                disabled={isResolving || !query.trim()}
                                className={cn(buttonClass, 'disabled:cursor-not-allowed disabled:opacity-50')}
                            >
                                <MagnifyingGlass size={15} weight="bold" />
                                {isResolving ? 'Resolviendo' : 'Buscar'}
                            </button>
                        </div>

                        {searchResults.length ? (
                            <div className="mt-3 space-y-2">
                                {searchResults.map((result) => (
                                    <button
                                        key={`${result.place_id || result.osm_id || result.display_name}`}
                                        type="button"
                                        onClick={() => applySearchResult(result)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-all hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        <p className="text-sm font-semibold text-slate-900">{result.display_name}</p>
                                        {result.type ? <p className="mt-1 text-xs text-slate-500">{result.type}</p> : null}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-20px_rgba(15,23,42,0.25)]">
                        <div ref={mapContainerRef} className="h-[360px] w-full" />
                        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-700 shadow-sm backdrop-blur">
                            Click o arrastra el pin
                        </div>
                        {status !== 'ready' ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/90 px-6 text-center text-sm text-slate-600">
                                {status === 'loading'
                                    ? 'Preparando el mapa gratuito.'
                                    : 'No se pudo cargar OpenStreetMap. Puedes seguir con coordenadas manuales.'}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                            type="button"
                            onClick={useCurrentLocation}
                            disabled={isResolving}
                            className={cn(buttonClass, 'w-full justify-center disabled:cursor-not-allowed disabled:opacity-50')}
                        >
                            <Crosshair size={15} weight="bold" />
                            Mi ubicacion
                        </button>
                        {selectedPosition ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onCoordinatesChangeRef.current?.({ latitude: '', longitude: '' });
                                    setFeedback('Se limpiaron las coordenadas actuales.');
                                }}
                                className={cn(buttonClass, 'w-full justify-center')}
                            >
                                <Trash size={15} weight="bold" />
                                Limpiar
                            </button>
                        ) : (
                            <div className="hidden sm:block" />
                        )}
                        {previewUrl ? (
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(buttonClass, 'w-full justify-center')}
                            >
                                <ArrowSquareOut size={15} weight="bold" />
                                Abrir mapa
                            </a>
                        ) : (
                            <div className="hidden sm:block" />
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.2)]">
                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Coordenadas actuales</p>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Latitud</span>
                                <span className="mt-1 block text-base font-semibold text-slate-900">
                                    {selectedPosition ? selectedPosition.lat.toFixed(6) : 'Sin definir'}
                                </span>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Longitud</span>
                                <span className="mt-1 block text-base font-semibold text-slate-900">
                                    {selectedPosition ? selectedPosition.lng.toFixed(6) : 'Sin definir'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(16,185,129,0.2)]">
                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700">Flujo recomendado</p>
                        <ol className="mt-3 space-y-2 text-sm text-slate-700">
                            <li>1. Busca la direccion o pega las coordenadas.</li>
                            <li>2. Ajusta el punto en el mapa si hace falta.</li>
                            <li>3. Guarda la sucursal para habilitar envios por distancia.</li>
                        </ol>
                    </div>

                    {feedback ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.2)]">
                            {feedback}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default BranchLocationPicker;
