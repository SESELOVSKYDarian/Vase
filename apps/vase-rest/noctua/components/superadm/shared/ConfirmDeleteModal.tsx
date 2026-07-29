'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  dangerMessage?: string;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar eliminación',
  message = '¿Estás seguro de que quieres eliminar este ítem?',
  dangerMessage,
}: ConfirmDeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-[#151515] border border-[#252525] rounded-2xl p-6 max-w-md w-full mx-4"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#676b67] hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
            <p className="text-[#676b67] mb-4">{message}</p>
            {dangerMessage && (
              <p className="text-red-400 text-sm mb-6">{dangerMessage}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-[#252525] text-white hover:bg-[#202020]"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
