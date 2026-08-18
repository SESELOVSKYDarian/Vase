'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Cpu, KeyRound, Lightbulb, LoaderCircle, Plus, PowerOff, Radio, RefreshCcw, SlidersHorizontal, Zap } from 'lucide-react'
import { getErrorMessage, warehouseRequest } from '@/components/warehouse/client'
import type { WarehouseDevice } from '@/components/warehouse/types'
import {
  WarehouseConfirmDialog,
  WarehouseEmptyState,
  WarehouseErrorState,
  WarehouseLoadingState,
  WarehouseMetric,
  WarehousePageHeader,
  WarehousePanel,
  WarehouseStatusBadge,
} from '@/components/warehouse/ui'

type Notice = { message: string; tone: 'success' | 'danger' | 'info' }

function maskDeviceKey(key: string) {
  if (key.length <= 12) return `${key.slice(0, 4)}••••`
  return `${key.slice(0, 8)}••••••••${key.slice(-4)}`
}

function formatLastSeen(value: string | null) {
  if (!value) return 'Nunca se conectó'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
}

export default function DepositoDispositivos() {
  const [devices, setDevices] = useState<WarehouseDevice[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [offTarget, setOffTarget] = useState<WarehouseDevice | null>(null)

  const loadDevices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDevices(await warehouseRequest<WarehouseDevice[]>('/api/warehouse/devices'))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadDevices() }, [loadDevices])

  const onlineCount = useMemo(() => devices.filter((device) => device.active && device.status === 'ONLINE').length, [devices])
  const totalLeds = useMemo(() => devices.reduce((sum, device) => sum + device.ledCount, 0), [devices])

  const createDevice = async () => {
    if (name.trim().length < 2) return setNotice({ message: 'Ingresá un nombre de al menos 2 caracteres.', tone: 'danger' })
    setActionId('create')
    setNotice(null)
    try {
      await warehouseRequest('/api/warehouse/devices', { method: 'POST', body: JSON.stringify({ name: name.trim() }) })
      setName('')
      setNotice({ message: 'Dispositivo creado. Copiá su clave desde la configuración segura del ESP32.', tone: 'success' })
      await loadDevices()
    } catch (requestError) {
      setNotice({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setActionId(null)
    }
  }

  const verifyConnection = async (device: WarehouseDevice) => {
    const id = `verify:${device.id}`
    setActionId(id)
    setNotice(null)
    try {
      const updated = await warehouseRequest<WarehouseDevice[]>('/api/warehouse/devices')
      setDevices(updated)
      const current = updated.find((item) => item.id === device.id)
      setNotice({
        message: current?.status === 'ONLINE'
          ? `${device.name} está reportando al servidor. Último ping: ${formatLastSeen(current.lastSeenAt)}.`
          : `${device.name} no está reportando al servidor. Revisá Wi-Fi, URL y deviceKey.`,
        tone: current?.status === 'ONLINE' ? 'success' : 'info',
      })
    } catch (requestError) {
      setNotice({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setActionId(null)
    }
  }

  const testLed = async (device: WarehouseDevice) => {
    const id = `test:${device.id}`
    setActionId(id)
    setNotice(null)
    try {
      await warehouseRequest(`/api/warehouse/devices/${device.id}/test-led`, { method: 'POST', body: JSON.stringify({ ledNumber: 0 }) })
      setNotice({ message: `Prueba enviada a ${device.name}. Se encenderán los primeros LEDs durante 5 segundos.`, tone: 'success' })
    } catch (requestError) {
      setNotice({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setActionId(null)
    }
  }

  const turnOff = async () => {
    if (!offTarget) return
    const id = `off:${offTarget.id}`
    setActionId(id)
    setNotice(null)
    try {
      await warehouseRequest(`/api/warehouse/devices/${offTarget.id}/off`, { method: 'POST' })
      setNotice({ message: `Comando de apagado enviado a ${offTarget.name}.`, tone: 'success' })
      setOffTarget(null)
    } catch (requestError) {
      setNotice({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="warehouse-shell">
      <WarehousePageHeader
        title="Dispositivos ESP32"
        description="Supervisá el polling, probá la tira y enviá comandos seguros a cada controlador."
        actions={<button type="button" className="ui-button ui-button-secondary" onClick={loadDevices} disabled={loading}><RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar estados</button>}
      />

      {notice ? <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === 'success' ? 'ui-badge-success' : notice.tone === 'danger' ? 'ui-badge-danger' : 'ui-badge-info'}`} role="status">{notice.message}</div> : null}
      {error ? <WarehouseErrorState message={error} onRetry={loadDevices} /> : null}

      <div className="warehouse-grid">
        <WarehouseMetric icon={Cpu} label="Controladores" value={devices.length} detail="Registrados y activos" />
        <WarehouseMetric icon={Radio} label="Online" value={onlineCount} detail={`${Math.max(devices.length - onlineCount, 0)} fuera de línea`} tone={devices.length && onlineCount < devices.length ? 'warning' : 'primary'} />
        <WarehouseMetric icon={Lightbulb} label="LEDs configurados" value={totalLeds} detail="Capacidad total informada" />
        <WarehouseMetric icon={Activity} label="Polling" value={onlineCount ? 'Activo' : 'Sin señal'} detail="ESP32 → servidor" tone={onlineCount ? 'primary' : 'warning'} />
      </div>

      <WarehousePanel title="Registrar controlador" description="El deviceKey se genera automáticamente al crear el dispositivo.">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <label className="ui-field min-w-0 flex-1"><span className="ui-label">Nombre del dispositivo</span><input className="input-field" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createDevice() }} placeholder="Ej: Tira Rack Norte" /></label>
          <button type="button" className="ui-button ui-button-primary" onClick={createDevice} disabled={actionId === 'create' || name.trim().length < 2}>{actionId === 'create' ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Crear dispositivo</button>
        </div>
      </WarehousePanel>

      <WarehousePanel title="Controladores del depósito" description="El estado online depende del último polling recibido.">
        {loading ? <WarehouseLoadingState rows={4} /> : devices.length ? (
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {devices.map((device) => {
              const online = device.active && device.status === 'ONLINE'
              return (
                <article key={device.id} className="rounded-2xl border border-border bg-muted/30 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${online ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'}`}><Cpu size={21} /></div><div className="min-w-0"><h3 className="truncate font-semibold text-foreground">{device.name}</h3><p className="mt-1 text-xs text-muted-foreground">{device.type.replaceAll('_', ' ')}</p></div></div>
                    <WarehouseStatusBadge tone={online ? 'success' : 'neutral'}>{online ? 'ONLINE' : 'OFFLINE'}</WarehouseStatusBadge>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-border bg-card/70 p-3"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lightbulb size={13} /> LEDs</dt><dd className="mt-1 font-semibold text-foreground">{device.ledCount}</dd></div>
                    <div className="rounded-xl border border-border bg-card/70 p-3"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><SlidersHorizontal size={13} /> Brillo</dt><dd className="mt-1 font-semibold text-foreground">{device.brightness}/255</dd></div>
                    <div className="rounded-xl border border-border bg-card/70 p-3"><dt className="text-xs text-muted-foreground">Máximo activo</dt><dd className="mt-1 font-semibold text-foreground">{device.maxActiveLeds} LEDs</dd></div>
                    <div className="rounded-xl border border-border bg-card/70 p-3"><dt className="text-xs text-muted-foreground">Último ping</dt><dd className="mt-1 text-xs font-medium text-foreground">{formatLastSeen(device.lastSeenAt)}</dd></div>
                  </dl>

                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2"><KeyRound size={14} className="shrink-0 text-muted-foreground" /><code className="min-w-0 flex-1 truncate text-xs text-foreground" title="Clave enmascarada">{maskDeviceKey(device.deviceKey)}</code></div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <button type="button" className="ui-button ui-button-secondary" onClick={() => verifyConnection(device)} disabled={actionId === `verify:${device.id}`}><RefreshCcw size={15} className={actionId === `verify:${device.id}` ? 'animate-spin' : ''} /> Verificar</button>
                    <button type="button" className="ui-button ui-button-secondary" onClick={() => testLed(device)} disabled={!online || actionId === `test:${device.id}`}><Zap size={15} /> Probar LED</button>
                    <button type="button" className="ui-button ui-button-secondary text-destructive" onClick={() => setOffTarget(device)} disabled={!online}><PowerOff size={15} /> Apagar</button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : <WarehouseEmptyState icon={Cpu} title="No hay dispositivos registrados" description="Creá un controlador para obtener el deviceKey que usará el ESP32." />}
      </WarehousePanel>

      <WarehouseConfirmDialog open={Boolean(offTarget)} title="Apagar LEDs del dispositivo" description={offTarget ? `Se enviará un comando de apagado a ${offTarget.name}.` : ''} confirmLabel="Enviar apagado" dangerous busy={Boolean(offTarget && actionId === `off:${offTarget.id}`)} onConfirm={turnOff} onClose={() => setOffTarget(null)} />
    </div>
  )
}
