'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Bot, Cpu, MapPinned, Package, Radio, Search, TriangleAlert, Unplug, Zap } from 'lucide-react'
import { getErrorMessage, warehouseRequest } from '@/components/warehouse/client'
import type { WarehouseSummary } from '@/components/warehouse/types'
import {
  WarehouseEmptyState,
  WarehouseErrorState,
  WarehouseMetric,
  WarehousePageHeader,
  WarehousePanel,
  WarehouseStatusBadge,
} from '@/components/warehouse/ui'

const quickActions = [
  { href: '/dashboard/deposito-ia/productos', label: 'Administrar productos', detail: 'Buscar, crear y asignar LEDs', icon: Package },
  { href: '/dashboard/deposito-ia/ia', label: 'Consultar con IA', detail: 'Usar lenguaje natural', icon: Bot },
  { href: '/dashboard/deposito-ia/racks', label: 'Abrir mapa', detail: 'Sectores, racks y posiciones', icon: MapPinned },
  { href: '/dashboard/deposito-ia/dispositivos', label: 'Ver dispositivos', detail: 'Estado de controladores ESP32', icon: Radio },
]

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function commandTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'DONE') return 'success'
  if (status === 'FAILED' || status === 'EXPIRED') return 'danger'
  if (status === 'PENDING' || status === 'CLAIMED') return 'warning'
  return 'neutral'
}

export default function DepositoIADashboard() {
  const [summary, setSummary] = useState<WarehouseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSummary(await warehouseRequest<WarehouseSummary>('/api/warehouse/summary'))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadSummary() }, [loadSummary])

  const alertCount = summary ? summary.productsWithoutLed + summary.offlineDevices : 0

  return (
    <div className="warehouse-shell">
      <WarehousePageHeader
        title="Control operativo"
        description="Inventario físico, actividad de búsqueda y control de LEDs en una sola vista."
        actions={(
          <Link href="/dashboard/deposito-ia/ia" className="ui-button ui-button-primary">
            <Bot size={17} aria-hidden="true" /> Consultar a la IA
          </Link>
        )}
      />

      {error ? <WarehouseErrorState message={error} onRetry={loadSummary} /> : null}

      <div className="warehouse-grid" aria-busy={loading}>
        {loading ? Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="warehouse-kpi"><div className="ui-skeleton h-20 w-full" /></div>
        )) : (
          <>
            <WarehouseMetric icon={Package} label="Productos activos" value={summary?.totalProducts ?? 0} detail={`${summary?.locatedProducts ?? 0} con ubicación física`} />
            <WarehouseMetric icon={Unplug} label="Sin LED asignado" value={summary?.productsWithoutLed ?? 0} detail="Requieren configuración" tone={(summary?.productsWithoutLed ?? 0) > 0 ? 'warning' : 'primary'} />
            <WarehouseMetric icon={Cpu} label="Dispositivos online" value={`${summary?.onlineDevices ?? 0}/${summary?.devices ?? 0}`} detail={`${summary?.offlineDevices ?? 0} fuera de línea`} tone={(summary?.offlineDevices ?? 0) > 0 ? 'warning' : 'primary'} />
            <WarehouseMetric icon={TriangleAlert} label="Alertas operativas" value={alertCount} detail={alertCount ? 'Hay elementos para revisar' : 'Todo en orden'} tone={alertCount ? 'danger' : 'primary'} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
        <WarehousePanel title="Últimos comandos LED" description="Actividad reciente enviada a los controladores">
          {loading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="ui-skeleton h-14" />)}</div>
          ) : summary?.recentCommands.length ? summary.recentCommands.map((command) => (
            <div key={command.id} className="warehouse-command">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Zap size={18} aria-hidden="true" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">LED #{command.ledNumber}</p>
                  <WarehouseStatusBadge tone={commandTone(command.status)}>{command.status}</WarehouseStatusBadge>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {command.productLocation?.product.code || command.productLocation?.product.name || 'Comando general'} · {command.device.name}
                </p>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground" dateTime={command.createdAt}>{formatTime(command.createdAt)}</time>
            </div>
          )) : (
            <WarehouseEmptyState icon={Zap} title="Todavía no hay comandos" description="Las pruebas y búsquedas que activen LEDs aparecerán en este historial." />
          )}
        </WarehousePanel>

        <WarehousePanel title="Accesos rápidos" description="Tareas frecuentes del depósito">
          <div className="divide-y divide-border/70">
            {quickActions.map(({ href, label, detail, icon: Icon }) => (
              <Link key={href} href={href} className="group flex min-h-20 items-center gap-3 px-5 py-4 transition-colors hover:bg-primary/[.04]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary"><Icon size={18} aria-hidden="true" /></div>
                <div className="min-w-0 flex-1"><p className="font-semibold text-foreground">{label}</p><p className="mt-1 truncate text-sm text-muted-foreground">{detail}</p></div>
                <ArrowRight size={17} className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </WarehousePanel>
      </div>

      <WarehousePanel title="Últimas consultas" description="Interacciones desde web, Telegram y WhatsApp">
        {loading ? (
          <div className="grid gap-3 p-5 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="ui-skeleton h-20" />)}</div>
        ) : summary?.recentConversations.length ? (
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {summary.recentConversations.map((conversation) => (
              <article key={conversation.id} className="rounded-2xl border border-border bg-muted/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <WarehouseStatusBadge tone="neutral">{conversation.channel}</WarehouseStatusBadge>
                  <time className="text-xs text-muted-foreground" dateTime={conversation.createdAt}>{formatTime(conversation.createdAt)}</time>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-foreground">{conversation.transcript || 'Consulta sin transcripción'}</p>
                {conversation.intent ? <p className="mt-2 text-xs font-medium text-primary">{conversation.intent}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <WarehouseEmptyState icon={Search} title="Sin consultas recientes" description="Las búsquedas realizadas desde cualquiera de los canales aparecerán acá." />
        )}
      </WarehousePanel>
    </div>
  )
}
