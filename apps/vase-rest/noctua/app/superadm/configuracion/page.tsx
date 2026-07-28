'use client';

import { useState } from 'react';

export default function SuperAdmConfiguracionPage() {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = () => {
    setSaveMessage('¡Configuración guardada exitosamente!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
        <p className="text-[#676b67]">Configura los parámetros generales del sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Información del Negocio */}
        <div className="bg-[#101010] border border-[#252525] rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Información del Negocio</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[#676b67] text-sm mb-2">Nombre del Negocio</label>
              <input
                type="text"
                defaultValue="Noctua Restaurante"
                className="w-full bg-[#0d0d0d] border border-[#252525] rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-[#676b67] text-sm mb-2">Dirección</label>
              <input
                type="text"
                defaultValue="Calle Principal 123"
                className="w-full bg-[#0d0d0d] border border-[#252525] rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-[#676b67] text-sm mb-2">Teléfono</label>
              <input
                type="text"
                defaultValue="+54 9 11 1234-5678"
                className="w-full bg-[#0d0d0d] border border-[#252525] rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Parámetros del Sistema */}
        <div className="bg-[#101010] border border-[#252525] rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Parámetros del Sistema</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[#676b67] text-sm mb-2">PIN de Super Admin</label>
              <input
                type="password"
                defaultValue="123456"
                className="w-full bg-[#0d0d0d] border border-[#252525] rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white">Modo Mantenimiento</span>
              <input type="checkbox" className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
        >
          Guardar Cambios
        </button>
        {saveMessage && (
          <span className="text-green-400">{saveMessage}</span>
        )}
      </div>
    </div>
  );
}
