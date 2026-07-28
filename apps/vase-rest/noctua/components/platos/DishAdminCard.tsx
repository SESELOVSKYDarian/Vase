'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Plato } from '@/types/platos';

interface DishAdminCardProps {
  plato: Plato;
  onEdit: () => void;
  onDelete: () => void;
}

export function DishAdminCard({ plato, onEdit, onDelete }: DishAdminCardProps) {
  const [showRecipe, setShowRecipe] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#151515] border border-[#252525] rounded-xl p-6"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-semibold text-lg">{plato.nombre}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="px-2 py-1 rounded-full text-xs bg-[#202020] text-[#676b67]">
              {plato.categoriaNombre}
            </span>
            {plato.disponible ? (
              <span className="px-2 py-1 rounded-full text-xs bg-green-600/20 text-green-400">
                Disponibles: {plato.maxDisponible}
              </span>
            ) : (
              <span className="px-2 py-1 rounded-full text-xs bg-red-600/20 text-red-400">
                Agotado
              </span>
            )}
          </div>
        </div>
        <span className="text-white font-bold text-xl">${plato.precio.toFixed(2)}</span>
      </div>

      {plato.descripcion && (
        <p className="text-[#676b67] text-sm mb-3">{plato.descripcion}</p>
      )}

      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowRecipe(!showRecipe)}
          className="flex items-center gap-2 text-[#676b67] hover:text-white text-sm"
        >
          {showRecipe ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Ingredientes de la receta
        </button>
        {showRecipe && (
          <div className="mt-2 space-y-1">
            {plato.receta.length === 0 ? (
              <p className="text-sm text-yellow-400">Sin receta cargada en Supabase.</p>
            ) : (
              plato.receta.map((ing) => (
                <div key={ing.ingredienteId} className="text-sm text-[#676b67] flex justify-between gap-4">
                  <span>{ing.ingredienteNombre}</span>
                  <span>{ing.cantidadNecesaria} {ing.unidad}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 px-3 py-2 rounded-lg border border-[#252525] text-white hover:bg-[#202020] flex items-center justify-center gap-2"
        >
          <Edit2 size={16} />
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
          aria-label={`Eliminar ${plato.nombre}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}
