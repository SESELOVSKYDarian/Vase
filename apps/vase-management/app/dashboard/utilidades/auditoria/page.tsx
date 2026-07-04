'use client'
// app/dashboard/utilidades/auditoria/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/utils'
import { toastError } from '@/components/ui/Toaster'
import { Shield, Loader2, RefreshCw, Filter } from 'lucide-react'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  UPDATE: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  DELETE: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  LOGIN: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  CANCEL: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  AUTHORIZE: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20',
  CLOSE_PERIOD: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
}

const MODULE_LABELS: Record<string, string> = {
  clientes: 'Clientes', productos: 'Productos', stock: 'Stock',
  ventas: 'Ventas', facturacion: 'Facturación', compras: 'Compras',
  tesoreria: 'Tesorería', usuarios: 'Usuarios', empresa: 'Empresa', utilidades: 'Utilidades',
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterModule, setFilterModule] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterModule) params.set('module', filterModule)
      const res = await fetch(`/api/utilidades/auditoria?${params}`)
      const json = await res.json()
      setLogs(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [filterModule])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Shield size={20} />Auditoría del Sistema</h1>
          <p className="page-subtitle">Trazabilidad de acciones de todos los usuarios</p>
        </div>
        <button onClick={fetchData} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterModule('')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border', filterModule === '' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}>
          Todos los módulos
        </button>
        {Object.entries(MODULE_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setFilterModule(filterModule === key ? '' : key)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border', filterModule === key ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Shield size={36} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Sin registros de auditoría</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {logs.map(log => (
            <div key={log.id} className="px-5 py-3.5 flex items-start gap-3">
              <span className={cn('px-2 py-1 rounded-lg text-[10px] font-bold uppercase flex-shrink-0 mt-0.5', ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground')}>
                {log.action}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{log.user?.name ?? 'Sistema'}</span>
                  {' '}realizó <span className="text-muted-foreground">{log.action.toLowerCase()}</span>
                  {log.entityType && <span className="text-muted-foreground"> en {log.entityType}</span>}
                  {' '}— <span className="badge-neutral text-[10px]">{MODULE_LABELS[log.module] ?? log.module}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(log.createdAt).toLocaleString('es-AR')}
                  {log.user?.email && ` · ${log.user.email}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
