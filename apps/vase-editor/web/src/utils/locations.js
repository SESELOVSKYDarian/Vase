const REST_COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,cca2,translations';
const ARGENTINA_PROVINCES_URL = 'https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre';
const ARGENTINA_LOCALITIES_URL = 'https://apis.datos.gob.ar/georef/api/localidades?campos=id,nombre&max=5000&provincia=';
const ARGENTINA_ADDRESSES_URL = 'https://apis.datos.gob.ar/georef/api/direcciones';

export const FALLBACK_COUNTRY_OPTIONS = [
    { value: 'AR', label: 'Argentina' },
    { value: 'UY', label: 'Uruguay' },
    { value: 'CL', label: 'Chile' },
    { value: 'BR', label: 'Brasil' },
    { value: 'PY', label: 'Paraguay' },
    { value: 'BO', label: 'Bolivia' },
    { value: 'PE', label: 'Peru' },
    { value: 'CO', label: 'Colombia' },
    { value: 'MX', label: 'Mexico' },
    { value: 'ES', label: 'Espana' },
];

const countriesState = {
    data: null,
    promise: null,
};

const argentinaProvincesState = {
    data: null,
    promise: null,
};

const argentinaCitiesCache = new Map();
const argentinaAddressesCache = new Map();

const normalizeText = (value = '') =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const FALLBACK_ARGENTINA_PROVINCES = [
    { value: '02', label: 'Ciudad Autonoma de Buenos Aires' },
    { value: '06', label: 'Buenos Aires' },
    { value: '10', label: 'Catamarca' },
    { value: '14', label: 'Cordoba' },
    { value: '18', label: 'Corrientes' },
    { value: '22', label: 'Chaco' },
    { value: '26', label: 'Chubut' },
    { value: '30', label: 'Entre Rios' },
    { value: '34', label: 'Formosa' },
    { value: '38', label: 'Jujuy' },
    { value: '42', label: 'La Pampa' },
    { value: '46', label: 'La Rioja' },
    { value: '50', label: 'Mendoza' },
    { value: '54', label: 'Misiones' },
    { value: '58', label: 'Neuquen' },
    { value: '62', label: 'Rio Negro' },
    { value: '66', label: 'Salta' },
    { value: '70', label: 'San Juan' },
    { value: '74', label: 'San Luis' },
    { value: '78', label: 'Santa Cruz' },
    { value: '82', label: 'Santa Fe' },
    { value: '86', label: 'Santiago del Estero' },
    { value: '90', label: 'Tucuman' },
    { value: '94', label: 'Tierra del Fuego, Antartida e Islas del Atlantico Sur' },
];

const uniqueSortedOptions = (items = []) => {
    const byKey = new Map();
    items.forEach((item) => {
        const label = String(item?.label || '').trim();
        const value = String(item?.value || '').trim();
        if (!label || !value) return;
        const key = `${value}:${normalizeText(label)}`;
        if (!byKey.has(key)) {
            byKey.set(key, { value, label });
        }
    });
    return Array.from(byKey.values()).sort((left, right) => left.label.localeCompare(right.label, 'es'));
};

const fetchJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`location_fetch_failed:${response.status}`);
    }
    return response.json();
};

export const findOptionByText = (options = [], value = '') => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return (
        options.find((option) => normalizeText(option.label) === normalized)
        || options.find((option) => normalizeText(option.value) === normalized)
        || null
    );
};

export const getCountryLabelByCode = (countryCode, options = FALLBACK_COUNTRY_OPTIONS) =>
    options.find((option) => option.value === countryCode)?.label || countryCode;

export const loadCountries = async () => {
    if (Array.isArray(countriesState.data) && countriesState.data.length) {
        return countriesState.data;
    }
    if (countriesState.promise) {
        return countriesState.promise;
    }

    countriesState.promise = fetchJson(REST_COUNTRIES_URL)
        .then((payload) => {
            const options = uniqueSortedOptions(
                (Array.isArray(payload) ? payload : []).map((country) => ({
                    value: String(country?.cca2 || '').trim().toUpperCase(),
                    label:
                        String(country?.translations?.spa?.common || '').trim()
                        || String(country?.name?.common || '').trim(),
                })),
            );
            countriesState.data = options.length ? options : FALLBACK_COUNTRY_OPTIONS;
            return countriesState.data;
        })
        .catch(() => {
            countriesState.data = FALLBACK_COUNTRY_OPTIONS;
            return countriesState.data;
        })
        .finally(() => {
            countriesState.promise = null;
        });

    return countriesState.promise;
};

export const loadArgentinaProvinces = async () => {
    if (Array.isArray(argentinaProvincesState.data) && argentinaProvincesState.data.length) {
        return argentinaProvincesState.data;
    }
    if (argentinaProvincesState.promise) {
        return argentinaProvincesState.promise;
    }

    argentinaProvincesState.promise = fetchJson(ARGENTINA_PROVINCES_URL)
        .then((payload) => {
            const fromApi = uniqueSortedOptions(
                (Array.isArray(payload?.provincias) ? payload.provincias : []).map((province) => ({
                    value: String(province?.id || '').trim(),
                    label: String(province?.nombre || '').trim(),
                })),
            );
            const options = uniqueSortedOptions([...fromApi, ...FALLBACK_ARGENTINA_PROVINCES]);
            argentinaProvincesState.data = options;
            return options;
        })
        .catch(() => {
            const fallback = uniqueSortedOptions(FALLBACK_ARGENTINA_PROVINCES);
            argentinaProvincesState.data = fallback;
            return fallback;
        })
        .finally(() => {
            argentinaProvincesState.promise = null;
        });

    return argentinaProvincesState.promise;
};

export const loadArgentinaCities = async (provinceId) => {
    const normalizedProvinceId = String(provinceId || '').trim();
    if (!normalizedProvinceId) return [];

    const cached = argentinaCitiesCache.get(normalizedProvinceId);
    if (Array.isArray(cached?.data) && cached.data.length) {
        return cached.data;
    }
    if (cached?.promise) {
        return cached.promise;
    }

    const promise = fetchJson(`${ARGENTINA_LOCALITIES_URL}${encodeURIComponent(normalizedProvinceId)}`)
        .then((payload) => {
            const byLabel = new Map();
            (Array.isArray(payload?.localidades) ? payload.localidades : []).forEach((city) => {
                const label = String(city?.nombre || '').trim();
                const value = String(city?.id || '').trim();
                const key = normalizeText(label);
                if (!label || !value || byLabel.has(key)) return;
                byLabel.set(key, { value, label });
            });
            const options = Array.from(byLabel.values()).sort((left, right) => left.label.localeCompare(right.label, 'es'));
            argentinaCitiesCache.set(normalizedProvinceId, { data: options, promise: null });
            return options;
        })
        .catch(() => {
            argentinaCitiesCache.set(normalizedProvinceId, { data: [], promise: null });
            return [];
        });

    argentinaCitiesCache.set(normalizedProvinceId, { data: null, promise });
    return promise;
};

const buildAddressLabel = (entry = {}) => {
    const nomenclatura = String(entry?.nomenclatura || '').trim();
    if (nomenclatura) return nomenclatura;

    const street = String(entry?.calle?.nombre || '').trim();
    const alturaValue = entry?.altura?.valor;
    const altura = Number.isFinite(Number(alturaValue)) ? String(alturaValue) : '';
    const locality =
        String(entry?.localidad_censal?.nombre || entry?.localidad?.nombre || '').trim();
    const province = String(entry?.provincia?.nombre || '').trim();

    const head = [street, altura].filter(Boolean).join(' ');
    const tail = [locality, province].filter(Boolean).join(', ');
    return [head, tail].filter(Boolean).join(', ');
};

export const loadArgentinaAddresses = async ({
    query = '',
    province = '',
    city = '',
    limit = 8,
} = {}) => {
    const normalizedQuery = String(query || '').trim();
    if (normalizedQuery.length < 3) return [];

    const provinceFilter = String(province || '').trim();
    const cityFilter = String(city || '').trim();
    const max = Math.max(1, Math.min(20, Number(limit || 8)));
    const cacheKey = `${normalizeText(normalizedQuery)}|${normalizeText(provinceFilter)}|${normalizeText(cityFilter)}|${max}`;

    const cached = argentinaAddressesCache.get(cacheKey);
    if (Array.isArray(cached?.data)) return cached.data;
    if (cached?.promise) return cached.promise;

    const fetchBatch = async ({ withProvince, withCity }) => {
        const params = new URLSearchParams();
        params.set('direccion', normalizedQuery);
        params.set('max', String(Math.max(10, max)));
        params.set('campos', 'nomenclatura,calle,altura,localidad_censal,provincia');
        if (withProvince && provinceFilter) params.set('provincia', provinceFilter);
        if (withCity && cityFilter) params.set('localidad', cityFilter);
        const payload = await fetchJson(`${ARGENTINA_ADDRESSES_URL}?${params.toString()}`);
        return Array.isArray(payload?.direcciones) ? payload.direcciones : [];
    };

    const promise = Promise.all([
        fetchBatch({ withProvince: true, withCity: true }).catch(() => []),
        fetchBatch({ withProvince: true, withCity: false }).catch(() => []),
        fetchBatch({ withProvince: false, withCity: false }).catch(() => []),
    ])
        .then((batches) => {
            const byLabel = new Map();
            let counter = 0;
            batches.flat().forEach((entry) => {
                const label = buildAddressLabel(entry);
                const normalized = normalizeText(label);
                if (!label || !normalized || byLabel.has(normalized)) return;
                counter += 1;
                byLabel.set(normalized, {
                    value: String(counter),
                    label,
                    provinceLabel: String(entry?.provincia?.nombre || '').trim(),
                    cityLabel: String(entry?.localidad_censal?.nombre || entry?.localidad?.nombre || '').trim(),
                    postalCode: String(entry?.codigo_postal || entry?.cp || '').trim(),
                    countryCode: 'AR',
                    countryLabel: 'Argentina',
                });
            });
            const options = Array.from(byLabel.values()).slice(0, max);
            argentinaAddressesCache.set(cacheKey, { data: options, promise: null });
            return options;
        })
        .catch(() => {
            argentinaAddressesCache.set(cacheKey, { data: [], promise: null });
            return [];
        });

    argentinaAddressesCache.set(cacheKey, { data: null, promise });
    return promise;
};
