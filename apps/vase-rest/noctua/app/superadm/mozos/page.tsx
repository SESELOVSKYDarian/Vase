
'use client';

import { useState, useEffect } from 'react';
import { useMozosStore } from '@/store/mozosStore';
import { Plus, Edit2, Trash2, Users, RefreshCcw, Clock, MapPin, Loader2 } from 'lucide-react';
import type { Mozo, NombreZona, NombreTurno } from '@/types/mozos';

const ZONAS: NombreZona[] = ['Zona Terraza', 'Zona Principal', 'Zona Cava', 'Zona Privada'];
const TURNOS: NombreTurno[] = ['Turno Mañana', 'Turno Tarde', 'Turno Vespertino'];

const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export default function SuperAdmMozosPage() {
  const {
    mozos,
    fetchMozos,
    suscribirCambiosMozos,
    desuscribirCambiosMozos,
    agregarMozo,
    editarMozo,
    eliminarMozo,
    setDailyOverride,
    clearDailyOverrides,
    dailyOverrides,
    getDailyOverride,
    lastUpdated,
    isLoading,
    error,
  } = useMozosStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMozo, setEditingMozo] = useState<Mozo | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTurno, setSelectedTurno] = useState<NombreTurno>(TURNOS[0]);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [mozoToDelete, setMozoToDelete] = useState<Mozo | null>(null);

  // Initialize selectedDate client-side only to avoid hydration mismatch
  useEffect(() => {
    setSelectedDate(getTodayString());
  }, []);

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    zona: 'Zona Terraza' as NombreZona,
    posicionCiclo: 0,
    activo: true,
  });

  useEffect(() => {
    fetchMozos();
    suscribirCambiosMozos();
    return () => desuscribirCambiosMozos();
  }, [fetchMozos, suscribirCambiosMozos, desuscribirCambiosMozos]);

  useEffect(() => {
    setShowSavedIndicator(true);
    const timer = setTimeout(() => setShowSavedIndicator(false), 2000);
    return () => clearTimeout(timer);
  }, [lastUpdated]);

  const getCurrentOverride = (zona: NombreZona): string | null => {
    if (!selectedDate) return null;
    const override = dailyOverrides.find((o) => o.fecha === selectedDate);
    if (!override) return null;
    return override.turnos[selectedTurno]?.[zona] || null;
  };

  const getCicloMozo = (zona: NombreZona, turno: NombreTurno): Mozo | undefined => {
    const turnoIndex = TURNOS.indexOf(turno);
    const zonaIndex = ZONAS.indexOf(zona);
    const position = turnoIndex * 4 + zonaIndex;
    return mozos.find((m) => m.posicionCiclo === position);
  };

  const handleOpenModal = (mozo?: Mozo) => {
    if (mozo) {
      setEditingMozo(mozo);
      setFormData({
        nombre: mozo.nombre,
        apellido: mozo.apellido,
        zona: mozo.zona,
        posicionCiclo: mozo.posicionCiclo,
        activo: mozo.activo,
      });
    } else {
      setEditingMozo(null);
      const nextPos = mozos.length > 0 ? Math.max(...mozos.map((m) => m.posicionCiclo)) + 1 : 0;
      const zonaIndex = nextPos % 4;
      setFormData({
        nombre: '',
        apellido: '',
        zona: ZONAS[zonaIndex],
        posicionCiclo: nextPos,
        activo: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveMozo = async () => {
    if (editingMozo) {
      await editarMozo(editingMozo.id, formData);
    } else {
      await agregarMozo(formData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteMozo = (mozo: Mozo) => {
    setMozoToDelete(mozo);
  };

  const confirmDeleteMozo = async () => {
    if (!mozoToDelete) return;
    setIsDeleting(mozoToDelete.id);
    try {
      await eliminarMozo(mozoToDelete.id);
      setMozoToDelete(null);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gestión de Mozos</h1>
            <p className="text-[#676B67]">Administra los mozos, turnos y zonas</p>
          </div>
          {showSavedIndicator && (
            <div className="transition-all duration-300">
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-sm font-semibold">✓ Guardado</span>
            </div>
          )}
          {error && (
            <div className="transition-all duration-300">
              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-sm font-semibold">{error}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 rounded-lg bg-violet-600 text-white flex items-center gap-2 hover:bg-violet-700 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          Nuevo Mozo
        </button>
      </div>

      {/* Daily Overrides */}
      {selectedDate && (
        <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-violet-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Cambios del día</h2>
                <p className="text-[#676B67]">Modifica la asignación para este día y turno</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#151515] border border-[#252525] rounded-lg px-3 py-2 text-white"
              />
              <select
                value={selectedTurno}
                onChange={(e) => setSelectedTurno(e.target.value as NombreTurno)}
                className="bg-[#151515] border border-[#252525] rounded-lg px-3 py-2 text-white"
              >
                {TURNOS.map((turno) => (
                  <option key={turno} value={turno}>{turno}</option>
                ))}
              </select>
              {dailyOverrides.some((o) => o.fecha === selectedDate) && (
                <button
                  onClick={() => clearDailyOverrides(selectedDate)}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white flex items-center gap-2 hover:bg-red-700"
                >
                  <RefreshCcw size={16} />
                  Restablecer
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {ZONAS.map((zona) => {
              const currentOverride = getCurrentOverride(zona);
              const overrideMozo = mozos.find((m) => m.id === currentOverride);
              const originalMozo = getCicloMozo(zona, selectedTurno);

              return (
                <div key={zona} className="bg-[#151515] border border-[#252525] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={16} className="text-violet-400" />
                    <p className="text-white font-semibold">{zona}</p>
                  </div>

                  {overrideMozo && (
                    <div className="mb-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs">
                      Reemplazo activo
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-[#676B67] text-xs uppercase">Original:</p>
                    {originalMozo ? (
                      <p className="text-white">{originalMozo.nombre} {originalMozo.apellido}</p>
                    ) : (
                      <p className="text-[#676B67]">No asignado</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[#676B67] text-xs uppercase mb-1">
                      {overrideMozo ? 'Reemplazo:' : 'Cambiar por:'}
                    </p>
                    <select
                      value={currentOverride || ''}
                      onChange={(e) => setDailyOverride(selectedDate, selectedTurno, zona, e.target.value || null)}
                      className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">Restablecer al original</option>
                      {mozos
                        .filter((m) => m.activo)
                        .map((mozo) => (
                          <option key={mozo.id} value={mozo.id}>
                            {mozo.nombre} {mozo.apellido}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mozos List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {isLoading && mozos.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 size={64} className="text-[#676B67] animate-spin" />
          </div>
        ) : (
          mozos.map((mozo) => (
            <div
              key={mozo.id}
              className={`bg-[#151515] border rounded-xl p-6 transition-all ${
                mozo.activo ? 'border-[#252525] hover:border-violet-500/50' : 'border-[#252525] opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-xl">
                    {mozo.nombre.charAt(0)}{mozo.apellido.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{mozo.nombre} {mozo.apellido}</h3>
                    <p className="text-[#676B67] text-sm">{mozo.zona}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(mozo)}
                    className="text-[#676B67] hover:text-white"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteMozo(mozo)}
                    className="text-[#676B67] hover:text-red-400"
                    disabled={isDeleting === mozo.id}
                  >
                    {isDeleting === mozo.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#676B67]">Posición Ciclo:</span>
                  <span className="text-white">#{mozo.posicionCiclo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#676B67]">Estado:</span>
                  <span className={`font-semibold ${mozo.activo ? 'text-green-400' : 'text-red-400'}`}>
                    {mozo.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}

        {!isLoading && mozos.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users size={64} className="text-[#676B67] mx-auto mb-4" />
            <p className="text-[#676B67]">No hay mozos registrados</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-50">
          <div className="w-full max-w-lg h-full bg-[#080808] border-l border-[#1a1a1a] p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">
                {editingMozo ? 'Editar Mozo' : 'Nuevo Mozo'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#676B67] hover:text-white"
              >
                <Trash2 size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm text-[#676B67] mb-2">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-[#101010] border border-[#252525] rounded-lg px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-[#676B67] mb-2">Apellido</label>
                <input
                  type="text"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  className="w-full bg-[#101010] border border-[#252525] rounded-lg px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-[#676B67] mb-2">Zona</label>
                <select
                  value={formData.zona}
                  onChange={(e) => setFormData({ ...formData, zona: e.target.value as NombreZona })}
                  className="w-full bg-[#101010] border border-[#252525] rounded-lg px-4 py-3 text-white"
                >
                  {ZONAS.map((zona) => (
                    <option key={zona} value={zona}>{zona}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#676B67] mb-2">Posición en Ciclo (0-11)</label>
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={formData.posicionCiclo}
                  onChange={(e) => setFormData({ ...formData, posicionCiclo: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#101010] border border-[#252525] rounded-lg px-4 py-3 text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="activo" className="text-white">Activo</label>
              </div>

              <button
                onClick={handleSaveMozo}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                {editingMozo ? 'Guardar Cambios' : 'Crear Mozo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {mozoToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-[#080808] border border-[#1a1a1a] rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Eliminar Mozo</h3>
                <p className="text-[#676B67]">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <p className="text-white mb-8">
              ¿Estás seguro de que quieres eliminar a <span className="font-semibold text-violet-400">{mozoToDelete.nombre} {mozoToDelete.apellido}</span>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setMozoToDelete(null)}
                className="flex-1 bg-[#151515] hover:bg-[#252525] text-white font-semibold py-3 rounded-xl transition"
                disabled={isDeleting === mozoToDelete.id}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteMozo}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                disabled={isDeleting === mozoToDelete.id}
              >
                {isDeleting === mozoToDelete.id ? <Loader2 size={18} className="animate-spin" /> : null}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
