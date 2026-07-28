'use client';

import { useEffect, useState } from 'react';
import { useSuperAdmStore } from '@/store/superadmStore';
import { EditableRow } from '@/components/superadm/shared/EditableRow';
import { ConfirmDeleteModal } from '@/components/superadm/shared/ConfirmDeleteModal';
import { ColorPickerField } from '@/components/superadm/shared/ColorPickerField';
import { DragHandle } from '@/components/superadm/shared/DragHandle';
import { generateId } from '@/hooks/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableStatus({ status, onUpdate, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-[#101010] border border-[#252525] rounded-xl mb-3"
    >
      <div {...attributes} {...listeners}><DragHandle /></div>

      <div className="flex-1">
        <EditableRow value={status.name} onSave={(v) => onUpdate(status.id, { name: v })} />
      </div>

      <ColorPickerField
        label="Texto"
        value={status.color}
        onChange={(v) => onUpdate(status.id, { color: v })}
      />

      <ColorPickerField
        label="Fondo"
        value={status.bgColor}
        onChange={(v) => onUpdate(status.id, { bgColor: v })}
      />

      <div
        className="px-3 py-1 rounded-lg text-sm font-bold"
        style={{ color: status.color, backgroundColor: status.bgColor }}
      >
        Vista previa
      </div>

      <label className="flex items-center gap-2 text-sm text-white">
        Terminal
        <input
          type="checkbox"
          checked={status.isTerminal}
          onChange={(e) => onUpdate(status.id, { isTerminal: e.target.checked })}
          className="w-4 h-4"
        />
      </label>

      <button onClick={() => onDelete(status.id)} className="text-red-400 hover:text-red-300">
        <Trash2 size={20} />
      </button>
    </div>
  );
}

export default function SuperAdmCocinaPage() {
  const {
    config, isDirty, isSaving,
    updateKitchenStatus, addKitchenStatus, deleteKitchenStatus,
    reorderKitchenStatuses, saveAll, discardChanges, initializeConfig
  } = useSuperAdmStore();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('Nuevo estado');

  useEffect(() => {
    const load = async () => {
      await initializeConfig();
    };
    load();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = config.kitchenStatuses.findIndex((s) => s.id === active.id);
      const newIndex = config.kitchenStatuses.findIndex((s) => s.id === over.id);
      const newArray = arrayMove(config.kitchenStatuses, oldIndex, newIndex);
      reorderKitchenStatuses(newArray.map((s) => s.id));
    }
    setActiveId(null);
  };

  const handleAdd = () => {
    addKitchenStatus({
      id: generateId(), name: newName, color: '#ffffff', bgColor: '#4b5563',
      order: config.kitchenStatuses.length, isTerminal: false
    });
    setAdding(false);
    setNewName('Nuevo estado');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Estados de Cocina</h1>
          <p className="text-[#676b67]">Gestiona los estados de los pedidos de cocina</p>
        </div>
        {isDirty && (
          <div className="flex gap-3">
            <button onClick={discardChanges} className="px-4 py-2 rounded-lg border border-[#252525] text-white">
              Descartar
            </button>
            <button onClick={saveAll} disabled={isSaving} className="px-6 py-2 rounded-lg bg-violet-600 text-white">
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>

      {isDirty && (
        <div className="mb-6 px-4 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-300">
          Hay cambios sin guardar
        </div>
      )}

      <DndContext
        sensors={sensors} collisionDetection={closestCenter}
        onDragEnd={handleDragEnd} onDragStart={(e) => setActiveId(String(e.active.id))}
      >
        <SortableContext items={config.kitchenStatuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {config.kitchenStatuses.map((status) => (
            <SortableStatus
              key={status.id} status={status}
              onUpdate={updateKitchenStatus} onDelete={setDeleteId}
            />
          ))}
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div className="p-4 bg-[#151515] border-2 border-violet-500 rounded-xl shadow-2xl">
              Arrastrando estado...
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {adding ? (
        <div className="flex items-center gap-4 p-4 bg-[#101010] border border-violet-500/50 rounded-xl mt-4">
          <input
            value={newName} onChange={(e) => setNewName(e.target.value)}
            className="bg-[#0d0d0d] border border-[#252525] rounded px-3 py-2 text-white"
          />
          <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg border border-[#252525] text-white">
            Cancelar
          </button>
          <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-violet-600 text-white">
            Añadir
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#101010] border border-dashed border-[#252525] text-[#676b67] hover:text-violet-400"
        >
          <Plus size={20} />
          Añadir estado
        </button>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteKitchenStatus(deleteId)}
        message="¿Estás seguro de eliminar este estado?"
      />
    </div>
  );
}
