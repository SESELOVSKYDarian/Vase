// components/layout/NotificationsBell.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Bell, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils'

const SEVERITY_DOT: Record<string, string> = {
  INFO: 'bg-blue-500', WARNING: 'bg-amber-500', ERROR: 'bg-red-500', CRITICAL: 'bg-red-600',
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/alertas?limit=8')
      const json = await res.json()
      setAlerts(json.data ?? [])
      setUnreadCount(json.unreadCount ?? 0)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000) // refresh cada 5 min
    return () => clearInterval(interval)
  }, [fetchAlerts])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleOpen() {
    setOpen(o => !o)
    if (!open) fetchAlerts()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm">Notificaciones</p>
            {unreadCount > 0 && <span className="text-xs text-muted-foreground">{unreadCount} sin leer</span>}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 px-4">
                <CheckCircle2 size={28} className="mx-auto text-green-400 mb-2" />
                <p className="text-xs text-muted-foreground">Sin alertas activas</p>
              </div>
            ) : alerts.map(alert => (
              <div key={alert.id} className={cn('px-4 py-3 border-b border-border/50 last:border-0', !alert.isRead && 'bg-muted/30')}>
                <div className="flex items-start gap-2">
                  <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', SEVERITY_DOT[alert.severity] ?? 'bg-muted-foreground')} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link href="/dashboard/alertas" onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium text-primary py-2.5 hover:bg-muted border-t border-border">
            Ver todas las alertas
          </Link>
        </div>
      )}
    </div>
  )
}
