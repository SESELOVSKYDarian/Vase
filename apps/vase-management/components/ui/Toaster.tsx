// components/ui/Toaster.tsx
'use client'

import * as React from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils'
import { AnimatePresence, m } from 'motion/react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
}

// Store global simple
let toasts: Toast[] = []
let listeners: Set<() => void> = new Set()

function notifyListeners() {
  listeners.forEach((fn) => fn())
}

export function toast(params: { type?: ToastType; title: string; description?: string }) {
  const id = Math.random().toString(36).slice(2)
  const newToast: Toast = { id, type: params.type ?? 'info', title: params.title, description: params.description }
  toasts = [...toasts, newToast]
  notifyListeners()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    notifyListeners()
  }, 4000)
}

export const toastSuccess = (title: string, description?: string) => toast({ type: 'success', title, description })
export const toastError = (title: string, description?: string) => toast({ type: 'error', title, description })
export const toastWarning = (title: string, description?: string) => toast({ type: 'warning', title, description })
export const toastInfo = (title: string, description?: string) => toast({ type: 'info', title, description })

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-green-500" />,
  error: <AlertCircle size={18} className="text-red-500" />,
  warning: <AlertTriangle size={18} className="text-yellow-500" />,
  info: <Info size={18} className="text-info" />,
}

const styles: Record<ToastType, string> = {
  success: 'border-primary/20',
  error: 'border-destructive/20',
  warning: 'border-orange-500/20',
  info: 'border-info/20',
}

export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([])

  React.useEffect(() => {
    function update() { setItems([...toasts]) }
    listeners.add(update)
    return () => { listeners.delete(update) }
  }, [])

  function dismiss(id: string) {
    toasts = toasts.filter((t) => t.id !== id)
    notifyListeners()
  }

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      <AnimatePresence initial={false}>
      {items.map((item) => (
        <m.div
          key={item.id}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 18, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className={cn(
            'glass-panel pointer-events-auto flex items-start gap-3 rounded-2xl p-4',
            styles[item.type]
          )}
        >
          <div className="flex-shrink-0 mt-0.5">{icons[item.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(item.id)}
            aria-label="Cerrar notificación"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={15} />
          </button>
        </m.div>
      ))}
      </AnimatePresence>
    </div>
  )
}
