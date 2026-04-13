import React from 'react';

const TenantsEditor = ({ manager }) => {
    if (!manager) return null;

    const { tenants, tenantsLoading, tenantsError, loadTenants, isMasterAdmin } = manager;

    return (
        <div className="space-y-4 pb-8">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-white tracking-tight">Empresas registradas</h2>
                {isMasterAdmin ? (
                    <button
                        type="button"
                        onClick={loadTenants}
                        className="rounded-lg bg-evolution-indigo px-3 py-2 text-xs font-bold uppercase tracking-widest text-white"
                    >
                        Recargar
                    </button>
                ) : null}
            </div>

            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                {tenantsLoading ? <p className="text-sm text-zinc-400">Cargando empresas...</p> : null}
                {tenantsError ? <p className="text-sm text-rose-400">{tenantsError}</p> : null}
                {!tenantsLoading && !tenantsError && tenants.length === 0 ? (
                    <p className="text-sm text-zinc-400">No hay empresas registradas.</p>
                ) : null}
                {tenants.map((tenant) => (
                    <div key={tenant.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-sm font-bold text-white">{tenant.name}</p>
                        <p className="text-xs text-zinc-400">ID: {tenant.id}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TenantsEditor;
