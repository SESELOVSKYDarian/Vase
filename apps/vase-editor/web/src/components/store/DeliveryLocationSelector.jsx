import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, MagnifyingGlass, MapPinLine, Trash } from '@phosphor-icons/react';

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
    if (!response.ok) throw new Error(`nominatim_${response.status}`);
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
    if (!response.ok) throw new Error(`reverse_${response.status}`);
    return response.json();
};

const DeliveryLocationSelector = ({ value, onChange, onAddressDetected }) => {
    const onChangeRef = useRef(onChange);
    const onAddressDetectedRef = useRef(onAddressDetected);
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

    const setLocation = useCallback(async ({ latitude, longitude, address = '' }) => {
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const roundedLatitude = Number(lat.toFixed(6));
        const roundedLongitude = Number(lng.toFixed(6));
        onChangeRef.current?.({
            latitude: roundedLatitude,
            longitude: roundedLongitude,
        });

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
    }, []);

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
    }, []);

    return (
        <div className="space-y-4 rounded-[28px] border border-gray-200 bg-gray-50 p-5 text-gray-900 shadow-xl shadow-slate-200/60">
            <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Ej: Guemes Mar del Plata o Cordoba 1843"
                        className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <MagnifyingGlass size={18} weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-primary/50 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-60"
                >
                    {searching ? 'Buscando...' : 'Buscar direccion'}
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
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-primary/50 hover:bg-gray-50 hover:text-gray-900"
                >
                    <Trash size={16} weight="bold" />
                    Borrar
                </button>
            </div>

            {selectedPosition ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Ubicacion elegida: {selectedPosition.lat}, {selectedPosition.lng}
                </div>
            ) : (
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
                    Elige tu ubicacion para calcular el envio segun la configuracion del panel admin.
                </div>
            )}

            {results.length ? (
                <div className="space-y-2 rounded-[26px] border border-gray-200 bg-white p-3">
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
                            className="flex w-full items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-left transition hover:border-primary/40 hover:bg-white"
                        >
                            <MapPinLine size={18} weight="duotone" className="mt-0.5 text-primary" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{result.display_name}</p>
                                <p className="mt-1 text-xs text-gray-500">{result.type || result.class || 'direccion'}</p>
                            </div>
                        </button>
                    ))}
                </div>
            ) : null}

            {feedback ? (
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
                    {feedback}
                </div>
            ) : null}
        </div>
    );
};

export default DeliveryLocationSelector;
