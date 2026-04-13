import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Crosshair,
    MagnifyingGlass,
    MapPinLine,
    Trash,
} from '@phosphor-icons/react';
import { loadLeaflet } from '../../utils/leafletLoader';

const DEFAULT_CENTER = { lat: -38.0055, lng: -57.5426 };

const parseCoordinate = (value, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
    return parsed;
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

const reverseLookup = async (latitude, longitude) => {
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

    if (!response.ok) {
        throw new Error(`reverse_${response.status}`);
    }

    return response.json();
};

const GuideBox = ({ title, children }) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">{title}</p>
        <div className="mt-2 space-y-1 text-xs text-zinc-300">{children}</div>
    </div>
);

const DeliveryLocationSelector = ({ value, onChange, onAddressDetected }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const onAddressDetectedRef = useRef(onAddressDetected);
    const [status, setStatus] = useState('loading');
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [feedback, setFeedback] = useState('');
    const [locating, setLocating] = useState(false);

    const selectedPosition = useMemo(() => {
        const latitude = parseCoordinate(value?.latitude, -90, 90);
        const longitude = parseCoordinate(value?.longitude, -180, 180);
        if (latitude == null || longitude == null) return null;
        return { lat: latitude, lng: longitude };
    }, [value?.latitude, value?.longitude]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        onAddressDetectedRef.current = onAddressDetected;
    }, [onAddressDetected]);

    const setLocation = useCallback(
        async ({ latitude, longitude, address = '' }) => {
            const lat = Number(latitude);
            const lng = Number(longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const roundedLatitude = Number(lat.toFixed(6));
            const roundedLongitude = Number(lng.toFixed(6));

            onChangeRef.current?.({
                latitude: roundedLatitude,
                longitude: roundedLongitude,
            });

            if (mapRef.current) {
                mapRef.current.setView([roundedLatitude, roundedLongitude], 16);
            }

            if (markerRef.current) {
                markerRef.current.setLatLng([roundedLatitude, roundedLongitude]);
            }

            if (address) {
                setQuery(address);
                onAddressDetectedRef.current?.(address);
                setFeedback(`Ubicacion seleccionada en ${address}.`);
                return;
            }

            try {
                const payload = await reverseLookup(roundedLatitude, roundedLongitude);
                const displayName = payload?.display_name || '';
                if (displayName) {
                    setQuery(displayName);
                    onAddressDetectedRef.current?.(displayName);
                    setFeedback(`Ubicacion seleccionada en ${displayName}.`);
                    return;
                }
            } catch (error) {
                console.error('No se pudo resolver la direccion del cliente', error);
            }

            setFeedback(`Ubicacion seleccionada: ${roundedLatitude}, ${roundedLongitude}.`);
        },
        [],
    );

    useEffect(() => {
        let cancelled = false;

        const bootMap = async () => {
            try {
                const L = await loadLeaflet();
                if (cancelled || !mapContainerRef.current) return;

                const map = L.map(mapContainerRef.current, {
                    zoomControl: true,
                    attributionControl: true,
                }).setView(
                    selectedPosition ? [selectedPosition.lat, selectedPosition.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
                    selectedPosition ? 15 : 11,
                );

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors',
                    maxZoom: 19,
                }).addTo(map);

                const marker = L.marker(
                    selectedPosition ? [selectedPosition.lat, selectedPosition.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
                    { draggable: true },
                ).addTo(map);

                marker.on('dragend', async () => {
                    const latLng = marker.getLatLng();
                    await setLocation({
                        latitude: latLng.lat,
                        longitude: latLng.lng,
                    });
                });

                map.on('click', async (event) => {
                    await setLocation({
                        latitude: event.latlng.lat,
                        longitude: event.latlng.lng,
                    });
                });

                mapRef.current = map;
                markerRef.current = marker;
                setStatus('ready');
            } catch (error) {
                console.error('No se pudo cargar el selector de ubicacion del checkout', error);
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
            markerRef.current = null;
        };
    }, [setLocation]);

    useEffect(() => {
        if (!selectedPosition || !mapRef.current || !markerRef.current) return;
        markerRef.current.setLatLng([selectedPosition.lat, selectedPosition.lng]);
        mapRef.current.setView([selectedPosition.lat, selectedPosition.lng], Math.max(mapRef.current.getZoom(), 15));
    }, [selectedPosition]);

    const handleSearch = useCallback(async () => {
        const rawQuery = String(query || '').trim();
        if (!rawQuery) return;

        setSearching(true);
        setFeedback('');
        setResults([]);

        try {
            const payload = await searchNominatim(rawQuery);
            if (!payload.length) {
                setFeedback('No encontramos esa direccion.');
                return;
            }

            if (payload.length === 1) {
                const first = payload[0];
                await setLocation({
                    latitude: Number(first.lat),
                    longitude: Number(first.lon),
                    address: first.display_name || rawQuery,
                });
                return;
            }

            setResults(payload);
            setFeedback('Selecciona el resultado correcto para cotizar el envio.');
        } catch (error) {
            console.error('No se pudo buscar la direccion del cliente', error);
            setFeedback('No se pudo consultar OpenStreetMap en este momento.');
        } finally {
            setSearching(false);
        }
    }, [query, setLocation]);

    const handleUseCurrentLocation = useCallback(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setFeedback('Este navegador no permite usar tu ubicacion.');
            return;
        }

        setLocating(true);
        setFeedback('');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                await setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setLocating(false);
            },
            (error) => {
                console.error('No se pudo leer la ubicacion del cliente', error);
                setFeedback('No pudimos leer tu ubicacion. Revisa los permisos del navegador.');
                setLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0,
            },
        );
    }, [setLocation]);

    const handleClearAll = useCallback(() => {
        setQuery('');
        setResults([]);
        setFeedback('');
        onChangeRef.current?.(null);

        if (markerRef.current) {
            markerRef.current.setLatLng([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]);
        }
        if (mapRef.current) {
            mapRef.current.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 11);
        }
    }, []);

    return (
        <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#0d131c]/95 p-5 text-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.8)] backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Ej: Guemes Mar del Plata o Cordoba 1843"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <MagnifyingGlass size={18} weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                </div>
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary/50 hover:bg-white/10 disabled:opacity-60"
                >
                    {searching ? 'Buscando...' : 'Buscar'}
                </button>
                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={locating}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_-24px_var(--color-primary)] transition hover:bg-primary/90 disabled:opacity-60"
                >
                    <Crosshair size={16} weight="bold" />
                    {locating ? 'Ubicando...' : 'Usar mi ubicacion'}
                </button>
                <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary/50 hover:bg-white/10"
                >
                    <Trash size={16} weight="bold" />
                    Borrar todo
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <GuideBox title="Que podes poner">
                    <p>`Guemes Mar del Plata`</p>
                    <p>`Cordoba 1843 Mar del Plata`</p>
                    <p>`Usar mi ubicacion` para cotizar directo</p>
                </GuideBox>
                <GuideBox title="Como funciona">
                    <p>1. Busca o marca tu punto en el mapa.</p>
                    <p>2. El sistema valida si caes en una zona fija.</p>
                    <p>3. Si no, calcula por distancia.</p>
                </GuideBox>
            </div>

            <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#090d13]">
                <div ref={mapContainerRef} className="h-[280px] w-full" />
                <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-[#0d131c]/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-300 shadow-sm backdrop-blur">
                    {status === 'ready' ? 'Seleccion de ubicacion' : status === 'loading' ? 'Cargando mapa' : 'Error de mapa'}
                </div>
                {status !== 'ready' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0d131c]/92 px-6 text-center text-sm text-zinc-300">
                        {status === 'loading' ? 'Preparando OpenStreetMap.' : 'No se pudo cargar el mapa.'}
                    </div>
                ) : null}
            </div>

            {results.length ? (
                <div className="space-y-2 rounded-[26px] border border-white/10 bg-white/5 p-3">
                    {results.map((result) => (
                        <button
                            key={`${result.place_id}-${result.osm_id || result.display_name}`}
                            type="button"
                            onClick={() =>
                                setLocation({
                                    latitude: Number(result.lat),
                                    longitude: Number(result.lon),
                                    address: result.display_name,
                                })
                            }
                            className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-[#111827] px-3 py-3 text-left transition hover:border-primary/40"
                        >
                            <MapPinLine size={18} weight="duotone" className="mt-0.5 text-primary" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white">{result.display_name}</p>
                                <p className="mt-1 text-xs text-zinc-400">
                                    {result.type || result.class || 'direccion'}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            ) : null}

            {feedback ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-zinc-300">
                    {feedback}
                </div>
            ) : null}
        </div>
    );
};

export default DeliveryLocationSelector;
