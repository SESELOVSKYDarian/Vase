"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users } from "lucide-react";
import { useMesasStore } from "@/store/mesasStore";
import { useMozosStore } from "@/store/mozosStore";
import { MesaModal } from "@/components/mesas/MesaModal";
import { MesasFloorPlan } from "@/components/mesas/MesasFloorPlan";
import { Button } from "@/components/ui/Button";
import type { Mesa } from "@/types/mesa";



export default function MesasPage() {
  const mesas = useMesasStore((s) => s.mesas);
  const mesasSeleccionadas = useMesasStore((s) => s.mesasSeleccionadas);
  const toggleSeleccionMesa = useMesasStore((s) => s.toggleSeleccionMesa);
  const limpiarSeleccion = useMesasStore((s) => s.limpiarSeleccion);
  
  // Select reactive values from mozos store
  const lastUpdated = useMozosStore((s) => s.lastUpdated);
  const dailyOverrides = useMozosStore((s) => s.dailyOverrides);
  const getTurnoActual = useMozosStore((s) => s.getTurnoActual);
  const getAsignacionesTurnoActual = useMozosStore((s) => s.getAsignacionesTurnoActual);
  const fetchMozos = useMozosStore((s) => s.fetchMozos);
  const suscribirCambiosMozos = useMozosStore((s) => s.suscribirCambiosMozos);
  const desuscribirCambiosMozos = useMozosStore((s) => s.desuscribirCambiosMozos);

  const cargarMesas = useMesasStore((s) => s.cargarMesas);
  const suscribirCambiosMesas = useMesasStore((s) => s.suscribirCambiosMesas);
  const crearMesaDesdePanel = useMesasStore((s) => s.crearMesaDesdePanel);
  const eliminarMesaDesdePanel = useMesasStore((s) => s.eliminarMesaDesdePanel);
  const isLoading = useMesasStore((s) => s.isLoading);
  const error = useMesasStore((s) => s.error);

  const [modalMesa, setModalMesa] = useState<Mesa | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mesaAEliminar, setMesaAEliminar] = useState<Mesa | null>(null);

  const [numeroMesa, setNumeroMesa] = useState("");
  const [capacidadMesa, setCapacidadMesa] = useState("");
  const [ubicacionMesa, setUbicacionMesa] = useState("SALÓN PRINCIPAL");

  useEffect(() => {
    cargarMesas();
    fetchMozos();
    const unsubscribeMesas = suscribirCambiosMesas();
    suscribirCambiosMozos();
    return () => {
      unsubscribeMesas();
      desuscribirCambiosMozos();
    };
  }, [cargarMesas, suscribirCambiosMesas, fetchMozos, suscribirCambiosMozos, desuscribirCambiosMozos]);

  const handleCrearMesa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const numero = Number(numeroMesa);
    const capacidad = Number(capacidadMesa);

    if (!numero || numero <= 0) {
      alert("Ingresá un número de mesa válido");
      return;
    }

    if (!capacidad || capacidad <= 0) {
      alert("Ingresá una capacidad válida");
      return;
    }

    await crearMesaDesdePanel({
      numero,
      capacidad,
      ubicacion: ubicacionMesa,
    });

    setNumeroMesa("");
    setCapacidadMesa("");
    setUbicacionMesa("SALÓN PRINCIPAL");
  };

  const abrirAlertaEliminar = (id: string) => {
  const mesa = mesas.find((m) => m.id === id);

  if (!mesa) return;

  setMesaAEliminar(mesa);
};

const confirmarEliminarMesa = async () => {
  if (!mesaAEliminar) return;

  await eliminarMesaDesdePanel(mesaAEliminar.id);

  setMesaAEliminar(null);
};

const cancelarEliminarMesa = () => {
  setMesaAEliminar(null);
};

  const handleSingleClick = useCallback(
    (id: string) => {
      toggleSeleccionMesa(id);
    },
    [toggleSeleccionMesa]
  );

  const handleDoubleClick = useCallback(
    (mesa: Mesa) => {
      setModalMesa(mesa);
      setModalOpen(true);
      limpiarSeleccion();
    },
    [limpiarSeleccion]
  );

  return (
    <div className="space-y-6">
      {/* Mozos Asignados */}
      <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-violet-400" />
            <div>
              <h2 className="text-white font-bold tracking-widest uppercase">
                Mozos del turno actual
              </h2>
              <p className="text-[#676b67] text-xs">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          {getTurnoActual() && (
            <div className="px-3 py-1 rounded-full bg-violet-600 text-white text-sm font-semibold">
              {getTurnoActual()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {getAsignacionesTurnoActual().map((asignacion) => {
            // Check if this is an override
            const today = new Date().toISOString().split('T')[0];
            const isOverride = dailyOverrides.some(
              o => o.fecha === today && o.turnos[asignacion.turno]?.[asignacion.zona] === asignacion.mozo.id
            );
            
            return (
              <div
                key={asignacion.zona}
                className={`bg-[#151515] border rounded-lg p-4 ${
                  isOverride ? 'border-amber-500/50' : 'border-[#252525]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[#676b67] text-xs uppercase font-semibold">
                    {asignacion.zona}
                  </p>
                  {isOverride && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] uppercase">
                      Reemplazo
                    </span>
                  )}
                </div>
                <p className="text-white font-semibold">
                  {asignacion.mozo.nombre} {asignacion.mozo.apellido}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulario para agregar mesas */}
      <form
        onSubmit={handleCrearMesa}
        className="bg-[#080808] border border-[#1a1a1a] rounded-xl p-5 space-y-4"
      >
        <div>
        <h2 className="text-white font-bold tracking-widest uppercase">
            Agregar mesa
          </h2>
          <p className="text-[#676B67] text-sm">
            Crea una mesa nueva y la guarda en el backend.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#676B67] uppercase font-semibold">
              Número
            </label>
            <input
              type="number"
              value={numeroMesa}
              onChange={(e) => setNumeroMesa(e.target.value)}
              placeholder="Ej: 1"
              className="bg-black border border-[#2a2a2a] rounded-md px-3 py-2 text-white outline-none focus:border-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#676B67] uppercase font-semibold">
              Capacidad
            </label>
            <input
              type="number"
              value={capacidadMesa}
              onChange={(e) => setCapacidadMesa(e.target.value)}
              placeholder="Ej: 4"
              className="bg-black border border-[#2a2a2a] rounded-md px-3 py-2 text-white outline-none focus:border-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#676B67] uppercase font-semibold">
              Ubicación
            </label>
            <select
              value={ubicacionMesa}
              onChange={(e) => setUbicacionMesa(e.target.value)}
              className="bg-black border border-[#2a2a2a] rounded-md px-3 py-2 text-white outline-none focus:border-white"
            >
              <option value="SALÓN PRINCIPAL">SALÓN PRINCIPAL</option>
              <option value="TERRAZA EXTERIOR">TERRAZA EXTERIOR</option>
              <option value="BAR">BAR</option>
              <option value="ZONA SOFÁS">ZONA SOFÁS</option>
              <option value="ZONA COCINA">ZONA COCINA</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={isLoading}
            >
              <Plus size={14} />
              Agregar mesa
            </Button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>

      {isLoading && mesas.length === 0 && (
        <div className="text-[#BCB9B9]">
          Cargando mesas desde el backend...
        </div>
      )}

      {/* Plano de planta de mesas */}
      <MesasFloorPlan
        mesas={mesas}
        mesasSeleccionadas={mesasSeleccionadas}
        onSingleClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
        onDelete={abrirAlertaEliminar}
      />

      {/* Mesa Modal */}
      <MesaModal
      mesa={modalMesa}
      isOpen={modalOpen}
      onClose={() => {
        setModalOpen(false);
        setModalMesa(null);
  }}
/>
<AnimatePresence>
  {mesaAEliminar && (
    <motion.div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-md bg-[#080808] border border-[#1f1f1f] rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <span className="text-red-400 text-2xl font-black">!</span>
          </div>

          <div className="flex-1">
            <h2 className="text-white text-lg font-black tracking-widest uppercase">
              Eliminar mesa
            </h2>

            <p className="text-[#BCB9B9] text-sm mt-2 leading-relaxed">
              ¿Seguro que querés eliminar la mesa{" "}
              <span className="text-white font-bold">
                N° {mesaAEliminar.numero}
              </span>
              ?
            </p>

            <p className="text-[#676B67] text-xs mt-2 leading-relaxed">
              Esta acción eliminará la mesa del sistema si no tiene pedidos o
              reservas asociadas.
            </p>
          </div>
        </div>

        <div className="mt-6 bg-black border border-[#1a1a1a] rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[#676B67] text-xs uppercase font-semibold">
                Ubicación
              </p>
              <p className="text-white font-semibold">
                {mesaAEliminar.zona}
              </p>
            </div>

            <div>
              <p className="text-[#676B67] text-xs uppercase font-semibold">
                Capacidad
              </p>
              <p className="text-white font-semibold">
                {mesaAEliminar.capacidad} personas
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={cancelarEliminarMesa}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="danger"
            className="flex-1"
            onClick={confirmarEliminarMesa}
            loading={isLoading}
          >
            Eliminar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
    </div>
  );
}