'use client'

import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/utils'

export function WarehousePageHeader({
  eyebrow = 'Depósito IA',
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle max-w-3xl">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function WarehousePanel({
  title,
  description,
  action,
  className,
  children,
}: PropsWithChildren<{
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}>) {
  return (
    <section className={cn('warehouse-panel', className)}>
      {title || description || action ? (
        <div className="warehouse-panel-header">
          <div>
            {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

const statusClasses = {
  success: 'ui-badge-success',
  warning: 'ui-badge-warning',
  danger: 'ui-badge-danger',
  info: 'ui-badge-info',
  neutral: 'ui-badge-neutral',
} as const

export function WarehouseStatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof statusClasses
  children: ReactNode
}) {
  return <span className={cn('ui-badge', statusClasses[tone])}>{children}</span>
}

export function WarehouseMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'primary',
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  detail?: string
  tone?: 'primary' | 'warning' | 'danger' | 'neutral'
}) {
  return (
    <article className="warehouse-kpi">
      <div className={cn('warehouse-kpi-icon', `warehouse-kpi-icon-${tone}`)}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{value}</p>
        {detail ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </article>
  )
}

export function WarehouseLoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5" aria-label="Cargando" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="ui-skeleton h-12 w-full" />
      ))}
    </div>
  )
}

export function WarehouseEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="ui-empty-state">
      <div className="ui-empty-icon"><Icon size={24} aria-hidden="true" /></div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function WarehouseErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="warehouse-error" role="alert">
      <AlertTriangle size={20} className="shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">No pudimos cargar esta información</p>
        <p className="mt-1 text-sm opacity-90">{message}</p>
      </div>
      {onRetry ? (
        <button type="button" className="ui-button ui-button-secondary shrink-0" onClick={onRetry}>
          <RefreshCcw size={15} aria-hidden="true" /> Reintentar
        </button>
      ) : null}
    </div>
  )
}

export function WarehouseConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  dangerous = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  dangerous?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => { if (!nextOpen && !busy) onClose() }}
      title={title}
      description={description}
      className="max-w-lg"
      footer={(
        <>
          <button type="button" className="ui-button ui-button-secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className={cn('ui-button', dangerous ? 'ui-button-danger' : 'ui-button-primary')}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </>
      )}
    >
      <div className="warehouse-confirm-copy">
        <AlertTriangle size={22} aria-hidden="true" />
        <p>Revisá la acción antes de continuar. El resultado se informará en esta pantalla.</p>
      </div>
    </Dialog>
  )
}
