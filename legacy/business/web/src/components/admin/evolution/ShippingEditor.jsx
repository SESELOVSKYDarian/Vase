import React, { useMemo, useState } from 'react';
import {
    Buildings,
    MapPin,
    NavigationArrow,
    Sparkle,
} from '@phosphor-icons/react';
import BranchLocationPicker from './BranchLocationPicker';
import ShippingZonesMapPreview from './ShippingZonesMapPreview';
import ShippingZoneAreaPicker from './ShippingZoneAreaPicker';
import { hasZonePolygon } from '../../../utils/shipping';

const createLocalId = () => (
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const EMPTY_BRANCH = () => ({
    id: createLocalId(),
    name: '',
    address: '',
    hours: '',
    phone: '',
    pickup_fee: 0,
    latitude: '',
    longitude: '',
    enabled: true,
});

const EMPTY_SHIPPING_ZONE = () => ({
    id: createLocalId(),
    name: '',
    description: '',
    price: 0,
    price_per_km: 0,
    type: 'flat',
    distance_pricing_mode: 'fixed',
    branch_id: '',
    polygon: [],
    coverage_mode: 'manual',
    min_distance_km: 0,
    max_distance_km: '',
    enabled: true,
});

const fieldClass =
    'w-full rounded-xl border border-white/25 bg-zinc-900/70 px-3 py-2.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30';

const compactFieldClass =
    'w-full rounded-lg border border-white/25 bg-zinc-900/70 px-2.5 py-1.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30';

const SummaryCard = ({ icon: Icon, label, value, description }) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-evolution-indigo">
            <Icon size={20} weight="duotone" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
        <p className="mt-1 text-xl font-bold text-white">{value}</p>
        <p className="mt-1 text-xs text-zinc-400">{description}</p>
    </div>
);

const ShippingEditor = ({ settings, setSettings, onSave, isSaving }) => {
    const [mapBranchIndex, setMapBranchIndex] = useState(null);
    const [mapZoneIndex, setMapZoneIndex] = useState(null);

    const shippingZones = Array.isArray(settings?.commerce?.shipping_zones)
        ? settings.commerce.shipping_zones
        : [];

    const branches = Array.isArray(settings?.commerce?.branches)
        ? settings.commerce.branches
        : [];

    const automaticLocationZones = useMemo(
        () => shippingZones.filter((zone) => zone.type === 'distance' || hasZonePolygon(zone)),
        [shippingZones],
    );

    const updateCommerceField = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            commerce: {
                ...prev.commerce,
                [field]: value,
            },
        }));
    };

    const addShippingZone = () => {
        setMapZoneIndex(shippingZones.length);
        setSettings((prev) => ({
            ...prev,
            commerce: {
                ...prev.commerce,
                shipping_zones: [
                    ...(Array.isArray(prev.commerce?.shipping_zones) ? prev.commerce.shipping_zones : []),
                    EMPTY_SHIPPING_ZONE(),
                ],
            },
        }));
    };

    const updateShippingZone = (index, field, value) => {
        setSettings((prev) => {
            const current = Array.isArray(prev.commerce?.shipping_zones)
                ? [...prev.commerce.shipping_zones]
                : [];
            if (!current[index]) return prev;
            current[index] = { ...current[index], [field]: value };
            return {
                ...prev,
                commerce: {
                    ...prev.commerce,
                    shipping_zones: current,
                },
            };
        });
    };

    const removeShippingZone = (index) => {
        setMapZoneIndex((current) => {
            if (current == null) return current;
            if (current === index) return null;
            return current > index ? current - 1 : current;
        });
        setSettings((prev) => {
            const current = Array.isArray(prev.commerce?.shipping_zones)
                ? [...prev.commerce.shipping_zones]
                : [];
            if (!current[index]) return prev;
            current.splice(index, 1);
            return {
                ...prev,
                commerce: {
                    ...prev.commerce,
                    shipping_zones: current,
                },
            };
        });
    };

    const addBranch = () => {
        setMapBranchIndex(branches.length);
        setSettings((prev) => ({
            ...prev,
            commerce: {
                ...prev.commerce,
                branches: [...(Array.isArray(prev.commerce?.branches) ? prev.commerce.branches : []), EMPTY_BRANCH()],
            },
        }));
    };

    const updateBranch = (index, field, value) => {
        setSettings((prev) => {
            const current = Array.isArray(prev.commerce?.branches) ? [...prev.commerce.branches] : [];
            if (!current[index]) return prev;
            current[index] = { ...current[index], [field]: value };
            return {
                ...prev,
                commerce: {
                    ...prev.commerce,
                    branches: current,
                },
            };
        });
    };

    const removeBranch = (index) => {
        setMapBranchIndex((current) => {
            if (current == null) return current;
            if (current === index) return null;
            return current > index ? current - 1 : current;
        });
        setSettings((prev) => {
            const current = Array.isArray(prev.commerce?.branches) ? [...prev.commerce.branches] : [];
            if (!current[index]) return prev;
            current.splice(index, 1);
            return {
                ...prev,
                commerce: {
                    ...prev.commerce,
                    branches: current,
                },
            };
        });
    };

    const toggleBranchMap = (index) => {
        setMapBranchIndex((current) => (current === index ? null : index));
    };

    const toggleZoneMap = (index) => {
        setMapZoneIndex((current) => (current === index ? null : index));
    };

    const fixedZones = shippingZones.filter((zone) => zone.type !== 'distance');
    const distanceZones = shippingZones.filter((zone) => zone.type === 'distance');

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-evolution-indigo/30 bg-evolution-indigo/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-100">
                        <Sparkle size={14} weight="bold" />
                        Envios y cobertura
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Envios</h2>
                        <p className="max-w-3xl text-sm text-zinc-400">
                            Configura zonas fijas, reglas de flete por distancia y sucursales de origen. Este modulo define la
                            cotizacion que luego usa el checkout del cliente.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="rounded-xl bg-evolution-indigo px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-[0_0_30px_rgba(99,102,241,0.22)] disabled:opacity-50"
                >
                    {isSaving ? 'Guardando...' : 'Guardar envios'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    icon={NavigationArrow}
                    label="Default"
                    value={
                        settings?.commerce?.default_delivery === 'distance:auto'
                            ? 'Segun ubicacion'
                            : settings?.commerce?.default_delivery?.startsWith('branch:')
                                ? 'Retiro en sucursal'
                                : settings?.commerce?.default_delivery?.startsWith('zone:')
                                    ? 'Zona preseleccionada'
                                    : 'Sin definir'
                    }
                    description="Metodo que vera primero el cliente."
                />
                <SummaryCard
                    icon={MapPin}
                    label="Zonas fijas"
                    value={String(fixedZones.length)}
                    description="Barrios o sectores con precio fijo."
                />
                <SummaryCard
                    icon={NavigationArrow}
                    label="Radios"
                    value={String(distanceZones.length)}
                    description="Bandas por distancia desde una sucursal."
                />
                <SummaryCard
                    icon={Buildings}
                    label="Sucursales"
                    value={String(branches.length)}
                    description="Puntos de origen y retiro."
                />
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Logica de entrega</p>
                    <p className="text-sm text-zinc-400">
                        Si el cliente comparte ubicacion, primero intentamos hacer match con una zona fija. Si no coincide,
                        usamos la sucursal mas cercana y calculamos el flete segun la regla configurada.
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Entrega por defecto</label>
                        <select
                            value={settings?.commerce?.default_delivery || ''}
                            onChange={(e) => updateCommerceField('default_delivery', e.target.value)}
                            className={fieldClass}
                        >
                            <option value="" className="bg-zinc-900">Sin definir</option>
                            {automaticLocationZones.length ? (
                                <option value="distance:auto" className="bg-zinc-900">
                                    Envio segun ubicacion
                                </option>
                            ) : null}
                            {shippingZones.map((zone) => (
                                <option key={`zone-${zone.id}`} value={`zone:${zone.id}`} className="bg-zinc-900">
                                    {zone.type === 'distance' ? 'Distancia' : 'Zona'}: {zone.name}
                                </option>
                            ))}
                            {branches.map((branch) => (
                                <option key={`branch-${branch.id}`} value={`branch:${branch.id}`} className="bg-zinc-900">
                                    Sucursal: {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
                        <p className="font-semibold text-zinc-200">Prioridad de cotizacion</p>
                        <ol className="mt-2 space-y-1 text-xs text-zinc-400">
                            <li>1. Zona fija con area dibujada.</li>
                            <li>2. Radio por distancia desde la sucursal mas cercana o la sucursal fijada.</li>
                            <li>3. Zona manual o retiro preseleccionado.</li>
                        </ol>
                    </div>
                </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Zonas de envio</p>
                    <button
                        type="button"
                        onClick={addShippingZone}
                        className="rounded-lg bg-evolution-indigo px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white"
                    >
                        Agregar zona
                    </button>
                </div>
                <div className="space-y-2">
                    {shippingZones.map((zone, index) => (
                        <div key={zone.id || index} className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                            {zone.type === 'distance' ? (
                                <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-zinc-400">
                                    {zone.branch_id
                                        ? 'Esta regla usara la sucursal seleccionada como origen del flete.'
                                        : 'Esta regla buscara automaticamente la sucursal mas cercana al cliente.'}
                                </div>
                            ) : null}
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                <input
                                    type="text"
                                    value={zone.name || ''}
                                    placeholder={zone.type === 'distance' ? 'Ej: Radio centro' : 'Ej: Guemes'}
                                    onChange={(e) => updateShippingZone(index, 'name', e.target.value)}
                                    className={compactFieldClass}
                                />
                                <input
                                    type="number"
                                    value={zone.price ?? 0}
                                    placeholder={
                                        zone.type === 'distance'
                                            ? zone.distance_pricing_mode === 'per_km'
                                                ? 'Base del flete'
                                                : 'Costo fijo'
                                            : 'Ej: 2500'
                                    }
                                    onChange={(e) => updateShippingZone(index, 'price', Number(e.target.value || 0))}
                                    className={compactFieldClass}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                <select
                                    value={zone.type || 'flat'}
                                    onChange={(e) => updateShippingZone(index, 'type', e.target.value)}
                                    className={compactFieldClass}
                                >
                                    <option value="flat" className="bg-zinc-900">Zona fija</option>
                                    <option value="distance" className="bg-zinc-900">Por distancia</option>
                                </select>
                                {zone.type === 'distance' ? (
                                    <select
                                        value={zone.branch_id || ''}
                                        onChange={(e) => updateShippingZone(index, 'branch_id', e.target.value)}
                                        className={compactFieldClass}
                                    >
                                        <option value="" className="bg-zinc-900">Sucursal mas cercana</option>
                                        {branches.map((branch) => (
                                            <option key={branch.id} value={branch.id} className="bg-zinc-900">
                                                {branch.name || branch.id}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-zinc-400">
                                        {hasZonePolygon(zone)
                                            ? 'Esta zona se cotiza por ubicacion del cliente.'
                                            : 'Esta zona queda manual hasta que le dibujes un area.'}
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                value={zone.description || ''}
                                placeholder={zone.type === 'distance' ? 'Ej: Entrega hasta 8 km desde la sucursal' : 'Ej: Entrega dentro de Guemes'}
                                onChange={(e) => updateShippingZone(index, 'description', e.target.value)}
                                className={compactFieldClass}
                            />
                            {zone.type === 'distance' ? (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={zone.min_distance_km ?? 0}
                                            placeholder="Desde km"
                                            onChange={(e) => updateShippingZone(index, 'min_distance_km', Number(e.target.value || 0))}
                                            className={compactFieldClass}
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={zone.max_distance_km ?? ''}
                                            placeholder="Hasta km"
                                            onChange={(e) => updateShippingZone(index, 'max_distance_km', e.target.value === '' ? '' : Number(e.target.value))}
                                            className={compactFieldClass}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                        <select
                                            value={zone.distance_pricing_mode || 'fixed'}
                                            onChange={(e) => updateShippingZone(index, 'distance_pricing_mode', e.target.value)}
                                            className={compactFieldClass}
                                        >
                                            <option value="fixed" className="bg-zinc-900">Costo fijo por rango</option>
                                            <option value="per_km" className="bg-zinc-900">Flete por kilometro</option>
                                        </select>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={zone.price_per_km ?? 0}
                                            placeholder="Costo por km"
                                            onChange={(e) => updateShippingZone(index, 'price_per_km', Number(e.target.value || 0))}
                                            className={compactFieldClass}
                                            disabled={(zone.distance_pricing_mode || 'fixed') !== 'per_km'}
                                        />
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-zinc-400">
                                        {(zone.distance_pricing_mode || 'fixed') === 'per_km'
                                            ? 'El sistema calcula base del flete + kilometros recorridos x costo por km.'
                                            : 'El sistema cobra un valor fijo cuando la distancia cae dentro de este rango.'}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs text-zinc-500">
                                            Busca un barrio o ajusta el mapa para que la zona quede exactamente donde quieres cobrar.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => toggleZoneMap(index)}
                                            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-200 transition-all hover:border-white/25 hover:bg-white/10"
                                        >
                                            {mapZoneIndex === index ? 'Ocultar area' : hasZonePolygon(zone) ? 'Editar area' : 'Definir area'}
                                        </button>
                                    </div>
                                    {mapZoneIndex === index ? (
                                        <ShippingZoneAreaPicker
                                            zone={zone}
                                            onChange={(patch) => {
                                                Object.entries(patch || {}).forEach(([field, value]) => {
                                                    updateShippingZone(index, field, value);
                                                });
                                            }}
                                        />
                                    ) : null}
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <label className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400">
                                    <input
                                        type="checkbox"
                                        checked={zone.enabled !== false}
                                        onChange={(e) => updateShippingZone(index, 'enabled', e.target.checked)}
                                    />
                                    Habilitada
                                </label>
                                <button
                                    type="button"
                                    onClick={() => removeShippingZone(index)}
                                    className="text-xs font-bold uppercase tracking-widest text-rose-300"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Mapa de cobertura</p>
                <ShippingZonesMapPreview branches={branches} shippingZones={shippingZones} />
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Sucursales</p>
                    <button
                        type="button"
                        onClick={addBranch}
                        className="rounded-lg bg-evolution-indigo px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white"
                    >
                        Agregar sucursal
                    </button>
                </div>
                <div className="space-y-2">
                    {branches.map((branch, index) => (
                        <div key={branch.id || index} className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                            <input
                                type="text"
                                value={branch.name || ''}
                                placeholder="Nombre"
                                onChange={(e) => updateBranch(index, 'name', e.target.value)}
                                className={compactFieldClass}
                            />
                            <input
                                type="text"
                                value={branch.address || ''}
                                placeholder="Direccion"
                                onChange={(e) => updateBranch(index, 'address', e.target.value)}
                                className={compactFieldClass}
                            />
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                <input
                                    type="text"
                                    value={branch.hours || ''}
                                    placeholder="Horario"
                                    onChange={(e) => updateBranch(index, 'hours', e.target.value)}
                                    className={compactFieldClass}
                                />
                                <input
                                    type="text"
                                    value={branch.phone || ''}
                                    placeholder="Telefono"
                                    onChange={(e) => updateBranch(index, 'phone', e.target.value)}
                                    className={compactFieldClass}
                                />
                                <input
                                    type="number"
                                    value={branch.pickup_fee ?? 0}
                                    placeholder="Costo retiro"
                                    onChange={(e) => updateBranch(index, 'pickup_fee', Number(e.target.value || 0))}
                                    className={compactFieldClass}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={branch.latitude ?? ''}
                                    placeholder="Latitud"
                                    onChange={(e) => updateBranch(index, 'latitude', e.target.value === '' ? '' : Number(e.target.value))}
                                    className={compactFieldClass}
                                />
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={branch.longitude ?? ''}
                                    placeholder="Longitud"
                                    onChange={(e) => updateBranch(index, 'longitude', e.target.value === '' ? '' : Number(e.target.value))}
                                    className={compactFieldClass}
                                />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs text-zinc-500">
                                    Usa OpenStreetMap para ubicar la sucursal o deja las coordenadas manuales.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => toggleBranchMap(index)}
                                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-200 transition-all hover:border-white/25 hover:bg-white/10"
                                >
                                    {mapBranchIndex === index ? 'Ocultar mapa' : 'Seleccionar en mapa'}
                                </button>
                            </div>
                            {mapBranchIndex === index ? (
                                <BranchLocationPicker
                                    branch={branch}
                                    onAddressChange={(value) => updateBranch(index, 'address', value)}
                                    onCoordinatesChange={({ latitude, longitude }) => {
                                        updateBranch(index, 'latitude', latitude);
                                        updateBranch(index, 'longitude', longitude);
                                    }}
                                />
                            ) : null}
                            <div className="flex items-center justify-between">
                                <label className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400">
                                    <input
                                        type="checkbox"
                                        checked={branch.enabled !== false}
                                        onChange={(e) => updateBranch(index, 'enabled', e.target.checked)}
                                    />
                                    Habilitada
                                </label>
                                <button
                                    type="button"
                                    onClick={() => removeBranch(index)}
                                    className="text-xs font-bold uppercase tracking-widest text-rose-300"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ShippingEditor;
