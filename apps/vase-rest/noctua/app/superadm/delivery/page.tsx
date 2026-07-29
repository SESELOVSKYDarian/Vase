'use client';

import { useEffect, useState } from 'react';
import { useSuperAdmStore } from '@/store/superadmStore';
import { ConfirmDeleteModal } from '@/components/superadm/shared/ConfirmDeleteModal';
import { generateId } from '@/hooks/lib/utils';
import { Plus, Trash2, Settings, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const platformPresets = [
  { id: 'pedidosya', name: 'PedidosYa', icon: 'PY' },
  { id: 'rappi', name: 'Rappi', icon: 'R' },
  { id: 'glovo', name: 'Glovo', icon: 'G' },
  { id: 'ubereats', name: 'Uber Eats', icon: 'UE' },
];

function ApiConnectionStatus({ status }: { status: 'connected' | 'error' | 'unconfigured' }) {
  if (status === 'connected') return <CheckCircle className="text-green-500" size={18} />;
  if (status === 'error') return <AlertCircle className="text-red-500" size={18} />;
  return <Activity className="text-yellow-500" size={18} />;
}

function AddAppModal({ onClose, onSave }: any) {
  const [name, setName] = useState('');
  const [preset, setPreset] = useState<string | null>(null);
  const [envVar, setEnvVar] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const handleSave = () => {
    onSave({
      id: generateId(), name, isActive: true,
      apiKeyEnvVar: preset ? `${preset.toUpperCase()}_API_KEY` : envVar,
      webhookUrl, connectionStatus: 'unconfigured'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0d0d0d] border border-[#252525] rounded-2xl w-full max-w-lg p-8"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Añadir app de delivery</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#676b67] text-sm mb-2 block">Selecciona plataforma</label>
            <div className="grid grid-cols-4 gap-2">
              {platformPresets.map((p) => (
                <button
                  key={p.id} onClick={() => {
                    setPreset(p.id);
                    setName(p.name);
                    setEnvVar(`${p.id.toUpperCase()}_API_KEY`);
                  }}
                  className={`p-4 rounded-xl border transition-all ${
                    preset === p.id ? 'border-violet-500 bg-violet-500/10' : 'border-[#252525] hover:border-[#333]'
                  }`}
                >
                  <div className="text-white font-bold text-xl mb-1">{p.icon}</div>
                  <div className="text-[#676b67] text-xs">{p.name}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[#676b67] text-sm mb-2 block">Nombre de la app</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#101010] border border-[#252525] rounded-xl px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="text-[#676b67] text-sm mb-2 block">Variable de entorno para API Key</label>
            <input
              value={envVar} onChange={(e) => setEnvVar(e.target.value)}
              className="w-full bg-[#101010] border border-[#252525] rounded-xl px-4 py-3 text-white font-mono"
            />
            <p className="text-xs text-[#676b67] mt-2">Solo se almacena el nombre, nunca el valor</p>
          </div>
          <div>
            <label className="text-[#676b67] text-sm mb-2 block">URL del webhook (opcional)</label>
            <input
              value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-[#101010] border border-[#252525] rounded-xl px-4 py-3 text-white"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="px-4 py-2 rounded border border-[#252525] text-white">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-violet-600 text-white">Añadir</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SuperAdmDeliveryPage() {
  const { config, isDirty, saveAll, discardChanges, initializeConfig, addDeliveryApp, updateDeliveryApp, deleteDeliveryApp } = useSuperAdmStore();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      await initializeConfig();
    };
    load();
  }, []);

  const testConnection = async (appId: string) => {
    setTestingId(appId);
    await new Promise(r => setTimeout(r, 1500));
    updateDeliveryApp(appId, { connectionStatus: 'connected', lastChecked: new Date() });
    setTestingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Apps de Delivery</h1>
          <p className="text-[#676b67]">Gestiona las conexiones con las plataformas</p>
        </div>
        {isDirty && (
          <div className="flex gap-3">
            <button onClick={discardChanges} className="px-4 py-2 rounded-lg border border-[#252525] text-white">
              Descartar
            </button>
            <button onClick={saveAll} className="px-6 py-2 rounded-lg bg-violet-600 text-white">
              Guardar cambios
            </button>
          </div>
        )}
      </div>
      <div className="grid gap-4 mb-6">
        {config.deliveryApps.map((app: any) => (
          <div key={app.id} className="bg-[#101010] border border-[#252525] rounded-2xl p-6 flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center text-xl font-bold">
              {app.name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white">{app.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  app.isActive ? 'bg-green-500/10 text-green-400' : 'bg-[#252525] text-[#676b67]'
                }`}>
                  {app.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="text-[#676b67] text-sm mt-1 flex items-center gap-3">
                <ApiConnectionStatus status={app.connectionStatus} />
                <span>{app.connectionStatus === 'connected' ? 'Conectado' : app.connectionStatus === 'error' ? 'Error' : 'Sin configurar'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => testConnection(app.id)}
                disabled={testingId === app.id}
                className="px-4 py-2 rounded-lg border border-[#252525] text-white hover:bg-[#151515]"
              >
                {testingId === app.id ? 'Probando...' : 'Probar conexión'}
              </button>
              <button className="px-4 py-2 rounded-lg border border-[#252525] text-white hover:bg-[#151515]">
                <Settings size={18} />
              </button>
              <label className="flex items-center gap-2 text-white mr-4">
                <input
                  type="checkbox" checked={app.isActive}
                  onChange={(e) => updateDeliveryApp(app.id, { isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                Activa
              </label>
              <button
                onClick={() => setDeleteId(app.id)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#101010] border border-dashed border-[#252525] text-[#676b67] hover:text-violet-400"
      >
        <Plus size={20} /> Añadir app de delivery
      </button>
      <AnimatePresence>
        {adding && (
          <AddAppModal
            onClose={() => setAdding(false)}
            onSave={addDeliveryApp}
          />
        )}
      </AnimatePresence>
      <ConfirmDeleteModal
        isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteDeliveryApp(deleteId)}
        message="¿Estás seguro de eliminar esta app?"
        dangerMessage="Se desconectarán todos los pedidos activos de esta plataforma"
      />
    </div>
  );
}
