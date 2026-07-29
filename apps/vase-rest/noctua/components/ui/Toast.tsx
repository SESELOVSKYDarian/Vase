'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/hooks/lib/utils';
import {
  useNotificationsStore,
  type Notification,
} from '@/store/notificationsStore';

export function ToastContainer() {
  const notifications = useNotificationsStore((state) => state.notifications);

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-label="Notificaciones"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((item) => (
          <ToastItem key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ item }: { item: Notification }) {
  const removeNotification = useNotificationsStore((state) => state.removeNotification);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      removeNotification(item.id);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [item.id, removeNotification]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl text-sm font-medium max-w-xs backdrop-blur-md',
        item.type === 'success' && 'bg-[#0d1f0d]/90 border-green-800/60 text-green-300',
        item.type === 'error' && 'bg-[#1f0d0d]/90 border-red-800/60 text-red-300',
        item.type === 'info' && 'bg-[#0d151f]/90 border-blue-800/60 text-blue-300',
        item.type === 'warning' && 'bg-[#1f1a0d]/90 border-yellow-800/60 text-yellow-300'
      )}
      role="status"
    >
      <ToastIcon type={item.type} />

      <div className="flex-1 overflow-hidden">
        <p className="font-bold text-[10px] uppercase tracking-widest opacity-60 mb-0.5">
          {item.title}
        </p>
        {item.message && <p className="line-clamp-2 leading-snug">{item.message}</p>}
      </div>

      <button
        onClick={() => removeNotification(item.id)}
        className="flex-shrink-0 p-1 hover:bg-white/5 rounded-lg transition-colors opacity-50 hover:opacity-100"
        aria-label="Cerrar notificación"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

function ToastIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'success':
      return <CheckCircle size={18} className="text-green-400 flex-shrink-0" />;
    case 'error':
      return <XCircle size={18} className="text-red-400 flex-shrink-0" />;
    case 'warning':
      return <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0" />;
    case 'info':
    default:
      return <Info size={18} className="text-blue-400 flex-shrink-0" />;
  }
}

function notify(type: Notification['type'], title: string, message = '') {
  useNotificationsStore.getState().addNotification({ title, message, type });
}

export const toast = {
  success: (title: string, message?: string) => notify('success', title, message),
  error: (title: string, message?: string) => notify('error', title, message),
  warning: (title: string, message?: string) => notify('warning', title, message),
  info: (title: string, message?: string) => notify('info', title, message),
};
