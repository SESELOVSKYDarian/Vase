'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Check, Copy, Cpu, Eye, EyeOff, KeyRound, Lightbulb, LoaderCircle, Plus, PowerOff, Radio, RefreshCcw, Settings2, SlidersHorizontal, Trash2, Zap } from 'lucide-react'
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
  if (device.status === 'ONLINE') {
    const transport = device.lastTransport === 'ETHERNET' ? 'Ethernet' : device.lastTransport === 'WIFI' ? 'Wi-Fi' : 'red no informada'
    return `Polling recibido por ${transport}${device.lastIpAddress ? ` · IP ${device.lastIpAddress}` : ''}.`
  }
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
  const [deleteTarget, setDeleteTarget] = useState<WarehouseDevice | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<WarehouseDevice | null>(null)
  const [config, setConfig] = useState({ serverBaseUrl: '', networkMode: 'AUTO', wifiSsid: '', wifiPassword: '', wifiFallbackSsid: '', wifiFallbackPassword: '', wifiSecondarySsid: '', wifiSecondaryPassword: '', ledCount: '100', brightness: '255', maxActiveLeds: '10' })

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
          : `${device.name} no esta reportando al servidor. Revisa el cable o Wi-Fi, SERVER_BASE_URL y deviceKey.`,
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

  const deleteDevice = async () => {
    if (!deleteTarget) return
    const id = `delete:${deleteTarget.id}`
    setActionId(id)
    setNotice(null)
    try {
      await warehouseRequest(`/api/warehouse/devices/${deleteTarget.id}`, { method: 'DELETE' })
      setDevices((current) => current.filter((device) => device.id !== deleteTarget.id))
      setNotice({ message: `${deleteTarget.name} y sus comandos fueron eliminados permanentemente.`, tone: 'success' })
      setDeleteTarget(null)
    } catch (requestError) {
      setNotice({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setActionId(null)
    }
  }

  const openConfig = (device: WarehouseDevice) => {
    setEditing(device)
    setConfig({
      serverBaseUrl: device.serverBaseUrl || device.pollingUrl.split('/api/')[0],
      networkMode: device.networkMode || 'AUTO',
      wifiSsid: device.wifiSsid || '',
      wifiPassword: '',
      wifiFallbackSsid: device.wifiFallbackSsid || '',
      wifiFallbackPassword: '',
      wifiSecondarySsid: device.wifiSecondarySsid || '',
      wifiSecondaryPassword: '',
      ledCount: String(device.ledCount),
      brightness: String(device.brightness),
      maxActiveLeds: String(device.maxActiveLeds),
    })
  }

  const saveConfig = async () => {
    if (!editing) return
    setActionId(`config:${editing.id}`)
    try {
      const updated = await warehouseRequest<WarehouseDevice>(`/api/warehouse/devices/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...config, ledCount: Number(config.ledCount), brightness: Number(config.brightness), maxActiveLeds: Number(config.maxActiveLeds) }),
      })
      setDevices((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item))
      setEditing(null)
      setNotice({ message: 'Configuración guardada. El ESP32 la aplicará en su próximo polling.', tone: 'success' })
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
                    <div className="rounded-xl border border-border bg-card/70 p-3"><dt className="text-xs text-muted-foreground">Conexion</dt><dd className="mt-1 text-xs font-medium text-foreground">{device.lastTransport === 'ETHERNET' ? 'Ethernet' : device.lastTransport === 'WIFI' ? 'Wi-Fi' : 'Sin detectar'}</dd></div>
                    <div className="rounded-xl border border-border bg-card/70 p-3"><dt className="text-xs text-muted-foreground">Modo preferido</dt><dd className="mt-1 text-xs font-medium text-foreground">{device.networkMode === 'AUTO' ? 'Automatico' : device.networkMode === 'ETHERNET' ? 'Solo Ethernet' : 'Solo Wi-Fi'}</dd></div>
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
                        <p className="mt-1 text-xs text-muted-foreground">Wi-Fi por orden de prioridad y Ethernet como respaldo opcional.</p>
                      </div>
                      <button type="button" className="ui-button ui-button-secondary shrink-0" onClick={() => openConfig(device)}><Settings2 size={15} /> Editar desde web</button>
                    </div>

                    <dl className="grid gap-2 text-xs">
                      <div className="rounded-lg border border-border bg-background/50 p-2"><dt className="mb-1 text-muted-foreground">SERVER_BASE_URL</dt><dd className="flex min-w-0 items-center gap-2"><code className="min-w-0 flex-1 truncate text-foreground">{device.serverBaseUrl || 'Sin configurar'}</code><button type="button" className="ui-icon-button h-8 w-8" onClick={() => copyToClipboard(`base:${device.id}`, 'SERVER_BASE_URL', device.serverBaseUrl || '')} aria-label="Copiar SERVER_BASE_URL">{copiedId === `base:${device.id}` ? <Check size={14} /> : <Copy size={14} />}</button></dd></div>
                      <div className="rounded-lg border border-border bg-background/50 p-2"><dt className="mb-1 text-muted-foreground">Polling URL</dt><dd className="flex min-w-0 items-center gap-2"><code className="min-w-0 flex-1 truncate text-foreground">{device.pollingUrl}</code><button type="button" className="ui-icon-button h-8 w-8" onClick={() => copyToClipboard(`poll:${device.id}`, 'Polling URL', device.pollingUrl)} aria-label="Copiar Polling URL">{copiedId === `poll:${device.id}` ? <Check size={14} /> : <Copy size={14} />}</button></dd></div>
                      <div className="rounded-lg border border-border bg-background/50 p-2"><dt className="mb-1 text-muted-foreground">Complete URL</dt><dd className="flex min-w-0 items-center gap-2"><code className="min-w-0 flex-1 truncate text-foreground">{device.completeUrlTemplate}</code><button type="button" className="ui-icon-button h-8 w-8" onClick={() => copyToClipboard(`complete:${device.id}`, 'Complete URL', device.completeUrlTemplate)} aria-label="Copiar Complete URL">{copiedId === `complete:${device.id}` ? <Check size={14} /> : <Copy size={14} />}</button></dd></div>
                    </dl>

                    <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">En modo automatico el ESP32 intenta Ethernet primero y usa Wi-Fi como respaldo. El firmware base se carga una sola vez.</p>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    <button type="button" className="ui-button ui-button-secondary" onClick={() => verifyConnection(device)} disabled={actionId === `verify:${device.id}`}><RefreshCcw size={15} className={actionId === `verify:${device.id}` ? 'animate-spin' : ''} /> Verificar</button>
                    <button type="button" className="ui-button ui-button-secondary" onClick={() => testLed(device)} disabled={!device.active || actionId === `test:${device.id}`}><Zap size={15} /> Probar LED</button>
                    <button type="button" className="ui-button ui-button-secondary text-destructive" onClick={() => setOffTarget(device)} disabled={!online}><PowerOff size={15} /> Apagar</button>
                    <button type="button" className="ui-button ui-button-secondary text-destructive" onClick={() => setDeleteTarget(device)} disabled={actionId === `delete:${device.id}`}><Trash2 size={15} /> Eliminar</button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : <WarehouseEmptyState icon={Cpu} title="No hay dispositivos registrados" description="Crea un controlador para obtener el deviceKey que usara el ESP32." />}
      </WarehousePanel>

      <WarehouseConfirmDialog open={Boolean(offTarget)} title="Apagar LEDs del dispositivo" description={offTarget ? `Se enviara un comando de apagado a ${offTarget.name}.` : ''} confirmLabel="Enviar apagado" dangerous busy={Boolean(offTarget && actionId === `off:${offTarget.id}`)} onConfirm={turnOff} onClose={() => setOffTarget(null)} />
      <WarehouseConfirmDialog open={Boolean(deleteTarget)} title="Eliminar dispositivo permanentemente" description={deleteTarget ? `Se eliminará ${deleteTarget.name}, su deviceKey y todos sus comandos LED. Esta acción no se puede deshacer; los productos y sus ubicaciones se conservarán.` : ''} confirmLabel="Eliminar permanentemente" dangerous busy={Boolean(deleteTarget && actionId === `delete:${deleteTarget.id}`)} onConfirm={deleteDevice} onClose={() => setDeleteTarget(null)} />

      {editing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="warehouse-device-config-title">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-start justify-between border-b border-border p-5"><div><h2 id="warehouse-device-config-title" className="text-lg font-semibold text-foreground">Configurar {editing.name}</h2><p className="mt-1 text-sm text-muted-foreground">Los cambios se entregan al ESP32 por polling seguro.</p></div><button type="button" className="ui-icon-button" onClick={() => setEditing(null)} aria-label="Cerrar">×</button></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="ui-field sm:col-span-2"><span className="ui-label">URL del servidor</span><input className="input-field" value={config.serverBaseUrl} onChange={(e) => setConfig({ ...config, serverBaseUrl: e.target.value })} placeholder="https://management.vase.ar" /></label>
            <label className="ui-field sm:col-span-2"><span className="ui-label">Tipo de conexión</span><select className="input-field" value={config.networkMode} onChange={(e) => setConfig({ ...config, networkMode: e.target.value })}><option value="AUTO">Automático: Wi-Fi primero, Ethernet después</option><option value="ETHERNET">Solo Ethernet</option><option value="WIFI">Solo Wi-Fi</option></select></label>
            {config.networkMode !== 'ETHERNET' ? <>
              <div className="sm:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">El ESP32 probará estas redes en orden. Dejá las contraseñas vacías si querés conservar la que ya está guardada.</div>
              <label className="ui-field"><span className="ui-label">1. Wi‑Fi principal (celular)</span><input className="input-field" value={config.wifiSsid} onChange={(e) => setConfig({ ...config, wifiSsid: e.target.value })} placeholder="Nombre del hotspot" /></label>
              <label className="ui-field"><span className="ui-label">Contraseña principal</span><input type="password" className="input-field" value={config.wifiPassword} onChange={(e) => setConfig({ ...config, wifiPassword: e.target.value })} placeholder="Dejar vacío para conservar" /></label>
              <label className="ui-field"><span className="ui-label">2. Wi‑Fi alternativo (local)</span><input className="input-field" value={config.wifiFallbackSsid} onChange={(e) => setConfig({ ...config, wifiFallbackSsid: e.target.value })} placeholder="WIFI Damac N4164 " /></label>
              <label className="ui-field"><span className="ui-label">Contraseña alternativa</span><input type="password" className="input-field" value={config.wifiFallbackPassword} onChange={(e) => setConfig({ ...config, wifiFallbackPassword: e.target.value })} placeholder="Dejar vacío para conservar" /></label>
              <label className="ui-field"><span className="ui-label">3. Wi‑Fi secundario (Barra)</span><input className="input-field" value={config.wifiSecondarySsid} onChange={(e) => setConfig({ ...config, wifiSecondarySsid: e.target.value })} placeholder="Barra" /></label>
              <label className="ui-field"><span className="ui-label">Contraseña secundaria</span><input type="password" className="input-field" value={config.wifiSecondaryPassword} onChange={(e) => setConfig({ ...config, wifiSecondaryPassword: e.target.value })} placeholder="Dejar vacío para conservar" /></label>
            </> : <div className="sm:col-span-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">El ESP32 usara DHCP por cable. Los pines del W5500 se configuran al cargar el firmware.</div>}
            <label className="ui-field"><span className="ui-label">Cantidad de LEDs</span><input type="number" min="1" max="1000" className="input-field" value={config.ledCount} onChange={(e) => setConfig({ ...config, ledCount: e.target.value })} /></label>
            <label className="ui-field"><span className="ui-label">Brillo (0–255)</span><input type="number" min="0" max="255" className="input-field" value={config.brightness} onChange={(e) => setConfig({ ...config, brightness: e.target.value })} /></label>
            <label className="ui-field"><span className="ui-label">Máximo de LEDs activos</span><input type="number" min="1" className="input-field" value={config.maxActiveLeds} onChange={(e) => setConfig({ ...config, maxActiveLeds: e.target.value })} /></label>
          </div>
          <div className="flex justify-end gap-3 border-t border-border p-5"><button type="button" className="ui-button ui-button-secondary" onClick={() => setEditing(null)}>Cancelar</button><button type="button" className="ui-button ui-button-primary" onClick={() => void saveConfig()} disabled={actionId === `config:${editing.id}`}>{actionId === `config:${editing.id}` ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Guardar configuración</button></div>
        </div>
      </div> : null}
    </div>
  )
}
