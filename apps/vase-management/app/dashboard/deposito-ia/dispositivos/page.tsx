'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Check, Copy, Cpu, Eye, EyeOff, KeyRound, Lightbulb, LoaderCircle, Plus, PowerOff, Radio, RefreshCcw, SlidersHorizontal, Zap } from 'lucide-react'
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
  if (key.length <= 12) return `${key.slice(0, 4)}****`
  return `${key.slice(0, 8)}********${key.slice(-4)}`
}

function formatLastSeen(value: string | null) {
  if (!value) return 'Nunca se conecto'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
}

function formatConnectionState(device: WarehouseDevice) {
  if (!device.lastSeenAt) return 'Nunca recibimos polling de este ESP32.'
  if (device.status === 'ONLINE') return 'Polling recibido correctamente.'
  return 'Hubo polling, pero el controlador quedo fuera de linea.'
}

export default function DepositoDispositivos() {
  const [devices, setDevices] = useState<WarehouseDevice[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [offTarget, setOffTarget] = useState<WarehouseDevice | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  const copyToClipboard = async (id: string, label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedId(id)
      setNotice({ message: `${label} copiado.`, tone: 'success' })
      window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 1600)
    } catch {
      setNotice({ message: `No se pudo copiar ${label}.`, tone: 'danger' })
    }
  }

  const createDevice = async () => {
    if (name.trim().length < 2) return setNotice({ message: 'Ingresa un nombre de al menos 2 caracteres.', tone: 'danger' })
    setActionId('create')
    setNotice(null)
    try {
      await warehouseRequest('/api/warehouse/devices', { method: 'POST', body: JSON.stringify({ name: name.trim() }) })
      setName('')
      setNotice({ message: 'Dispositivo creado. Copia su configuracion desde la tarjeta del ESP32.', tone: 'success' })
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
          ? `${device.name} esta reportando al servidor. Ultimo ping: ${formatLastSeen(current.lastSeenAt)}.`
          : `${device.name} no esta reportando al servidor. Revisa Wi-Fi, SERVER_BASE_URL y deviceKey.`,
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
      setNotice({ message: `Prueba encolada para ${device.name}. Si el ESP32 esta online la toma enseguida; si esta offline la toma cuando vuelva a hacer polling.`, tone: 'success' })
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
        description="Supervisa el polling, copia la configuracion del firmware y envia comandos seguros a cada controlador."
        actions={<button type="button" className="ui-button ui-button-secondary" onClick={loadDevices} disabled={loading}><RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar estados</button>}
      />

      {notice ? <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === 'success' ? 'ui-badge-success' : notice.tone === 'danger' ? 'ui-badge-danger' : 'ui-badge-info'}`} role="status">{notice.message}</div> : null}
      {error ? <WarehouseErrorState message={error} onRetry={loadDevices} /> : null}

      <div className="warehouse-grid">
        <WarehouseMetric icon={Cpu} label="Controladores" value={devices.length} detail="Registrados y activos" />
        <WarehouseMetric icon={Radio} label="Online" value={onlineCount} detail={`${Math.max(devices.length - onlineCount, 0)} fuera de linea`} tone={devices.length && onlineCount < devices.length ? 'warning' : 'primary'} />
        <WarehouseMetric icon={Lightbulb} label="LEDs configurados" value={totalLeds} detail="Capacidad total informada" />
        <WarehouseMetric icon={Activity} label="Polling" value={onlineCount ? 'Activo' : 'Sin senal'} detail="ESP32 -> servidor" tone={onlineCount ? 'primary' : 'warning'} />
      </div>

      <WarehousePanel title="Registrar controlador" description="El deviceKey se genera automaticamente al crear el dispositivo.">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <label className="ui-field min-w-0 flex-1"><span className="ui-label">Nombre del dispositivo</span><input className="input-field" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createDevice() }} placeholder="Ej: Tira Rack Norte" /></label>
          <button type="button" className="ui-button ui-button-primary" onClick={createDevice} disabled={actionId === 'create' || name.trim().length < 2}>{actionId === 'create' ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Crear dispositivo</button>
        </div>
      </WarehousePanel>

      <WarehousePanel title="Controladores del deposito" description="El estado online depende del ultimo polling recibido.">
        {loading ? <WarehouseLoadingState rows={4} /> : devices.length ? (
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {devices.map((device) => {
              const online = device.active && device.status === 'ONLINE'
              const keyVisible = Boolean(visibleKeys[device.id])
              return (
                <article key={device.id} className="rounded-2xl border border-border bg-muted/30 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${online ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'}`}><Cpu size={21} /></div><div className="min-w-0"><h3 className="truncate font-semibold text-foreground">{device.name}</h3><p className="mt-1 text-xs text-muted-foreground">{device.type.replaceAll('_', ' ')}</p></div></div>
                    <WarehouseStatusBadge tone={online ? 'success' : 'neutral'}>{online ? 'ONLINE' : 'OFFLINE'}</WarehouseStatusBadge>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-border bg-card/70 p-3"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lightbulb size={13} /> LEDs</dt><dd className="mt-1 font-semibold text-foreground">{device.ledCount}</dd></div>
                    <div className="rounded-xl border border-border bg-card/70 p-3"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><SlidersHorizontal size={13} /> Brillo</dt><dd className="mt-1 font-semibold text-foreground">{device.brightness}/255</dd></div>
                    <div className="rounded-xl border border-border bg-card/70 p-3"><dt className="text-xs text-muted-foreground">Maximo activo</dt><dd className="mt-1 font-semibold text-foreground">{device.maxActiveLeds} LEDs</dd></div>
                    <div className="rounded-xl border border-border bg-card/70 p-3"><dt className="text-xs text-muted-foreground">Ultimo ping</dt><dd className="mt-1 text-xs font-medium text-foreground">{formatLastSeen(device.lastSeenAt)}</dd></div>
                  </dl>

                  <div className="mt-4 space-y-3 rounded-xl border border-border bg-card/70 p-3">
                    <div className="flex items-center gap-2">
                      <KeyRound size={14} className="shrink-0 text-muted-foreground" />
                      <code className="min-w-0 flex-1 truncate text-xs text-foreground">{keyVisible ? device.deviceKey : maskDeviceKey(device.deviceKey)}</code>
                      <button type="button" className="ui-icon-button h-8 w-8" onClick={() => setVisibleKeys((current) => ({ ...current, [device.id]: !keyVisible }))} aria-label={keyVisible ? 'Ocultar deviceKey' : 'Mostrar deviceKey'}>
                        {keyVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button type="button" className="ui-icon-button h-8 w-8" onClick={() => copyToClipboard(`key:${device.id}`, 'deviceKey', device.deviceKey)} aria-label="Copiar deviceKey">
                        {copiedId === `key:${device.id}` ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatConnectionState(device)}</p>
                  </div>

                  <div className="mt-4 rounded-xl border border-border bg-card/70 p-3">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground">Configurar ESP32</h4>
                        <p className="mt-1 text-xs text-muted-foreground">Pega estos valores en el firmware que hace polling al servidor.</p>
                      </div>
                      <button type="button" className="ui-button ui-button-secondary shrink-0" onClick={() => copyToClipboard(`snippet:${device.id}`, 'config Arduino', device.arduinoConfig)}>
                        {copiedId === `snippet:${device.id}` ? <Check size={15} /> : <Copy size={15} />} Copiar config
                      </button>
                    </div>

                    <dl className="grid gap-2 text-xs">
                      <div className="rounded-lg border border-border bg-background/50 p-2"><dt className="mb-1 text-muted-foreground">SERVER_BASE_URL</dt><dd className="flex min-w-0 items-center gap-2"><code className="min-w-0 flex-1 truncate text-foreground">{device.serverBaseUrl}</code><button type="button" className="ui-icon-button h-8 w-8" onClick={() => copyToClipboard(`base:${device.id}`, 'SERVER_BASE_URL', device.serverBaseUrl)} aria-label="Copiar SERVER_BASE_URL">{copiedId === `base:${device.id}` ? <Check size={14} /> : <Copy size={14} />}</button></dd></div>
                      <div className="rounded-lg border border-border bg-background/50 p-2"><dt className="mb-1 text-muted-foreground">Polling URL</dt><dd className="flex min-w-0 items-center gap-2"><code className="min-w-0 flex-1 truncate text-foreground">{device.pollingUrl}</code><button type="button" className="ui-icon-button h-8 w-8" onClick={() => copyToClipboard(`poll:${device.id}`, 'Polling URL', device.pollingUrl)} aria-label="Copiar Polling URL">{copiedId === `poll:${device.id}` ? <Check size={14} /> : <Copy size={14} />}</button></dd></div>
                      <div className="rounded-lg border border-border bg-background/50 p-2"><dt className="mb-1 text-muted-foreground">Complete URL</dt><dd className="flex min-w-0 items-center gap-2"><code className="min-w-0 flex-1 truncate text-foreground">{device.completeUrlTemplate}</code><button type="button" className="ui-icon-button h-8 w-8" onClick={() => copyToClipboard(`complete:${device.id}`, 'Complete URL', device.completeUrlTemplate)} aria-label="Copiar Complete URL">{copiedId === `complete:${device.id}` ? <Check size={14} /> : <Copy size={14} />}</button></dd></div>
                    </dl>

                    <pre className="mt-3 max-h-36 overflow-auto rounded-lg border border-border bg-background/70 p-3 text-xs leading-5 text-foreground"><code>{device.arduinoConfig}</code></pre>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <button type="button" className="ui-button ui-button-secondary" onClick={() => verifyConnection(device)} disabled={actionId === `verify:${device.id}`}><RefreshCcw size={15} className={actionId === `verify:${device.id}` ? 'animate-spin' : ''} /> Verificar</button>
                    <button type="button" className="ui-button ui-button-secondary" onClick={() => testLed(device)} disabled={!device.active || actionId === `test:${device.id}`}><Zap size={15} /> Probar LED</button>
                    <button type="button" className="ui-button ui-button-secondary text-destructive" onClick={() => setOffTarget(device)} disabled={!online}><PowerOff size={15} /> Apagar</button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : <WarehouseEmptyState icon={Cpu} title="No hay dispositivos registrados" description="Crea un controlador para obtener el deviceKey que usara el ESP32." />}
      </WarehousePanel>

      <WarehouseConfirmDialog open={Boolean(offTarget)} title="Apagar LEDs del dispositivo" description={offTarget ? `Se enviara un comando de apagado a ${offTarget.name}.` : ''} confirmLabel="Enviar apagado" dangerous busy={Boolean(offTarget && actionId === `off:${offTarget.id}`)} onConfirm={turnOff} onClose={() => setOffTarget(null)} />
    </div>
  )
}
