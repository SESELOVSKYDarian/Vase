'use client';

import { memo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Usuario } from '@/types/usuario';

interface ConfirmarEliminarUsuarioProps {
  isOpen: boolean;
  usuario: Usuario | null;
  onClose: () => void;
  onConfirm: () => void;
  eliminando: boolean;
}

function ConfirmarEliminarUsuarioBase({
  isOpen,
  usuario,
  onClose,
  onConfirm,
  eliminando,
}: ConfirmarEliminarUsuarioProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar usuario" size="sm">
      <div className="space-y-4">
        <p className="text-[#BCB9B9] text-sm leading-relaxed">
          ¿Estás seguro de que deseas eliminar a <span className="text-white font-semibold">{usuario?.nombre}</span>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={eliminando} className="flex-1">Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} loading={eliminando} className="flex-1">Eliminar</Button>
        </div>
      </div>
    </Modal>
  );
}

export const ConfirmarEliminarUsuario = memo(ConfirmarEliminarUsuarioBase);
