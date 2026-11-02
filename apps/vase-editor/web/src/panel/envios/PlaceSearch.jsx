import React, { useState } from 'react';

const searchPlaces = async (query) => {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'ar');
    url.searchParams.set('q', query);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(url.toString(), { signal: controller.signal, headers: { Accept: 'application/json', 'Accept-Language': 'es-AR,es;q=0.9' } });
        if (!response.ok) throw new Error('search_failed');
        const payload = await response.json();
        return Array.isArray(payload) ? payload : [];
    } finally {
        clearTimeout(timer);
    }
};

// "-38.0055, -57.5426" (por ejemplo, copiado de Google Maps) → un lugar con esas coordenadas.
export function placeFromCoordinates(text) {
    const match = String(text || '').match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lon = Number(match[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    const span = 0.01;
    return {
        place_id: `coords-${lat}-${lon}`,
        lat,
        lon,
        name: 'Punto elegido',
        display_name: `${lat}, ${lon}`,
        boundingbox: [lat - span, lat + span, lon - span, lon + span],
    };
}

// Buscador de direcciones y lugares (OpenStreetMap), solo Argentina. También acepta coordenadas.
export default function PlaceSearch({ placeholder, onPick }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const run = async () => {
        if (query.trim().length < 3) return;
        const coords = placeFromCoordinates(query);
        if (coords) {
            onPick(coords);
            setQuery('');
            return;
        }
        setBusy(true);
        setFailed(false);
        try {
            setResults(await searchPlaces(query.trim()));
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="vp-fld">
            <div style={{ display: 'flex', gap: 8 }}>
                <input className="vp-inp" placeholder={placeholder} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); run(); } }} aria-label={placeholder} />
                <button type="button" className="vp-btn soft" onClick={run} disabled={busy}>{busy ? 'Buscando…' : 'Buscar'}</button>
            </div>
            {failed ? <span className="vp-note">No se pudo buscar. Probá de nuevo o pegá las coordenadas (ej.: -38.0055, -57.5426).</span> : null}
            {results.length ? (
                <div className="vp-lmenu">
                    {results.map((place) => (
                        <button key={place.place_id} type="button" className="vp-mi" onClick={() => { onPick(place); setResults([]); setQuery(''); }}>{place.display_name}</button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
