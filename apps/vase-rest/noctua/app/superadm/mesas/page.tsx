'use client';

import { useEffect, useState } from 'react';
import { useMesasStore } from '@/store/mesasStore';
import { EditableRow } from '@/components/superadm/shared/EditableRow';
import { ConfirmDeleteModal } from '@/components/superadm/shared/ConfirmDeleteModal';
import { Plus, Trash2, Edit2, PlusCircle, MinusCircle } from 'lucide-react';

export default function SuperAdmMesasPage() {
  const { mesas, isLoading, cargarMesas, crearMesaDesdePanel, eliminarMesaDesdePanel } = useMesasStore();
  const [deleteMesaId, setDeleteMesaId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newMesa, setNewMesa] = useState({
    numero: 1,
    capacidad: 4,
    ubicacion: 'SALÓN PRINCIPAL'
  });

  useEffect(() => {
    cargarMesas();
  }, [cargarMesas]);

  // Group mesas by zona
  const mesasPorZona: Record<string, typeof mesas> = mesas.reduce((acc, mesa) => {
    const zona = mesa.zona || 'SIN ZONA';
    if (!acc[zona]) acc[zona] = [];
    acc[zona].push(mesa);
    return acc;
  }, {} as Record<string, typeof mesas>);

  const handleAddMesa = () => {
    crearMesaDesdePanel(newMesa);
    setAdding(false);
    setNewMesa({
      numero: newMesa.numero + 1,
      capacidad: 4,
      ubicacion: 'SALÓN PRINCIPAL'
    });
  };

  const handleDeleteMesa = (id: string) => {
    eliminarMesaDesdePanel(id);
    setDeleteMesaId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-[#676b67]">
        Cargando mesas...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestión de Mesas</h1>
          <p className="text-[#676b67]">Administra mesas y zonas del local</p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
        >
          <Plus size={18} />
          Nueva Mesa
        </button>
      </div>

      {adding && (
        <div className="p-6 mb-6 bg-[#101010] border border-violet-500/30 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-4">Nueva Mesa</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[#676b67] text-sm mb-2 block">Número de Mesa</label>
              <input
                type="number"
                value={newMesa.numero}
                onChange={(e) => setNewMesa({ ...newMesa, numero: parseInt(e.target.value) || 1 })}
                className="w-full bg-[#0d0d0d] border border-[#252525] rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-[#676b67] text-sm mb-2 block">Capacidad</label>
              <input
                type="number"
                value={newMesa.capacidad}
                onChange={(e) => setNewMesa({ ...newMesa, capacidad: parseInt(e.target.value) || 4 })}
                className="w-full bg-[#0d0d0d] border border-[#252525] rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-[#676b67] text-sm mb-2 block">Zona</label>
              <input
                type="text"
                value={newMesa.ubicacion}
                onChange={(e) => setNewMesa({ ...newMesa, ubicacion: e.target.value })}
                className="w-full bg-[#0d0d0d] border border-[#252525] rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-lg border border-[#252525] text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddMesa}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
            >
              Crear Mesa
            </button>
          </div>
        </div>
      )}

      {Object.entries(mesasPorZona).map(([zona, mesasZona]) => (
        <div key={zona} className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            {zona}
            <span className="text-[#676b67] text-sm font-normal">({mesasZona.length} mesas)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mesasZona.map((mesa) => (
              <div
                key={mesa.id}
                className="p-4 bg-[#101010] border border-[#252525] rounded-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-white">Mesa {mesa.numero}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteMesaId(mesa.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="text-[#676b67] text-sm space-y-1">
                  <p>Capacidad: {mesa.capacidad} personas</p>
                  <p>
                    Estado:
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                      mesa.estado === 'libre' ? 'bg-green-500/20 text-green-400' :
                      mesa.estado === 'ocupada' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {mesa.estado}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(mesasPorZona).length === 0 && (
        <div className="text-center py-16 text-[#676b67]">
          No hay mesas creadas. Crea tu primera mesa!
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteMesaId}
        onClose={() => setDeleteMesaId(null)}
        onConfirm={() => deleteMesaId && handleDeleteMesa(deleteMesaId)}
        message="¿Estás seguro de que quieres eliminar esta mesa?"
        dangerMessage="Esta acción no se puede deshacer."
      />
    </div>
  );
}
