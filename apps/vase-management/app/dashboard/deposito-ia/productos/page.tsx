'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit3, Filter, MapPin, Package, Plus, PowerOff, Search, Zap } from 'lucide-react'
import { buildWarehouseProductUrl, getErrorMessage, warehouseRequest } from '@/components/warehouse/client'
import { ProductEditor } from '@/components/warehouse/product-editor'
import type { WarehouseDevice, WarehouseProduct, WarehouseSector } from '@/components/warehouse/types'
import {
  WarehouseConfirmDialog,
  WarehouseEmptyState,
  WarehouseErrorState,
  WarehouseLoadingState,
  WarehousePageHeader,
  WarehousePanel,
  WarehouseStatusBadge,
} from '@/components/warehouse/ui'

type RackSummary = { rack: string }
type Notice = { message: string; tone: 'success' | 'warning' | 'danger' }

export default function DepositoProductos() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [rack, setRack] = useState('')
  const [products, setProducts] = useState<WarehouseProduct[]>([])
  const [sectors, setSectors] = useState<WarehouseSector[]>([])
  const [racks, setRacks] = useState<RackSummary[]>([])
  const [devices, setDevices] = useState<WarehouseDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<WarehouseProduct | null>(null)
  const [confirmOff, setConfirmOff] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProducts(await warehouseRequest<WarehouseProduct[]>(buildWarehouseProductUrl({ query: debouncedQuery, sectorId, rack })))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, rack, sectorId])

  useEffect(() => { void loadProducts() }, [loadProducts])

  useEffect(() => {
    void Promise.all([
      warehouseRequest<WarehouseSector[]>('/api/warehouse/sectors').then(setSectors),
      warehouseRequest<WarehouseDevice[]>('/api/warehouse/devices').then(setDevices),
    ]).catch((requestError) => setNotice({ message: getErrorMessage(requestError), tone: 'danger' }))
  }, [])

  useEffect(() => {
    setRack('')
    if (!sectorId) return setRacks([])
    void warehouseRequest<RackSummary[]>(`/api/warehouse/sectors/${sectorId}/racks`)
      .then(setRacks)
      .catch((requestError) => setNotice({ message: getErrorMessage(requestError), tone: 'danger' }))
  }, [sectorId])

  const onlineDevices = useMemo(() => devices.filter((device) => device.active && device.status === 'ONLINE'), [devices])

  const testLed = async (productId: string) => {
    const id = `test:${productId}`
    setActionId(id)
    setNotice(null)
    try {
      await warehouseRequest(`/api/warehouse/products/${productId}/test-led`, { method: 'POST' })
      setNotice({ message: 'Comando LED enviado. El dispositivo lo tomará en el próximo polling.', tone: 'success' })
    } catch (requestError) {
      setNotice({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setActionId(null)
    }
  }

  const turnOffAll = async () => {
    setActionId('off:all')
    setNotice(null)
    try {
      if (!onlineDevices.length) throw new Error('No hay dispositivos online para apagar.')
      await Promise.all(onlineDevices.map((device) => warehouseRequest(`/api/warehouse/devices/${device.id}/off`, { method: 'POST' })))
      setNotice({ message: `Comando de apagado enviado a ${onlineDevices.length} dispositivo(s).`, tone: 'success' })
      setConfirmOff(false)
    } catch (requestError) {
      setNotice({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setActionId(null)
    }
  }

  const openCreate = () => {
    setEditingProduct(null)
    setEditorOpen(true)
  }

  const openEdit = (product: WarehouseProduct) => {
    setEditingProduct(product)
    setEditorOpen(true)
  }

  const handleSaved = (message: string, tone: 'success' | 'warning' = 'success') => {
    setNotice({ message, tone })
    void loadProducts()
  }

  return (
    <div className="warehouse-shell">
      <WarehousePageHeader
        title="Productos y ubicaciones"
        description="Administrá el catálogo físico, su posición y el LED que guía al operario."
        actions={(
          <>
            <button type="button" className="ui-button ui-button-secondary" onClick={() => setConfirmOff(true)} disabled={!onlineDevices.length}>
              <PowerOff size={16} aria-hidden="true" /> Apagar LEDs
            </button>
            <button type="button" className="ui-button ui-button-primary" onClick={openCreate}>
              <Plus size={17} aria-hidden="true" /> Nuevo producto
            </button>
          </>
        )}
      />

      {notice ? (
        <div className={`rounded-2xl px-4 py-3 text-sm ${notice.tone === 'success' ? 'ui-badge-success' : notice.tone === 'warning' ? 'ui-badge-warning' : 'ui-badge-danger'}`} role="status">
          {notice.message}
        </div>
      ) : null}

      <div className="warehouse-toolbar">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar productos</span>
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input className="input-field pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por código, nombre, descripción o código de barras" />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative">
            <span className="sr-only">Filtrar por sector</span>
            <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select className="input-field min-w-44 pl-9" value={sectorId} onChange={(event) => setSectorId(event.target.value)}>
              <option value="">Todos los sectores</option>
              {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
            </select>
          </label>
          <select className="input-field min-w-36" value={rack} onChange={(event) => setRack(event.target.value)} disabled={!sectorId} aria-label="Filtrar por rack">
            <option value="">Todos los racks</option>
            {racks.map((item) => <option key={item.rack} value={item.rack}>{item.rack}</option>)}
          </select>
        </div>
      </div>

      {error ? <WarehouseErrorState message={error} onRetry={loadProducts} /> : null}

      <WarehousePanel
        title="Inventario físico"
        description={loading ? 'Actualizando resultados…' : `${products.length} producto(s) encontrados`}
      >
        {loading ? <WarehouseLoadingState rows={6} /> : products.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="warehouse-table">
                <thead><tr><th>Código</th><th>Producto</th><th>Ubicación</th><th>LED</th><th className="text-right">Acciones</th></tr></thead>
                <tbody>
                  {products.map((product) => {
                    const location = product.warehouseLocations[0]
                    return (
                      <tr key={product.id}>
                        <td><span className="font-mono font-semibold text-foreground">{product.code || 'Sin código'}</span></td>
                        <td><p className="font-medium text-foreground">{product.name}</p><p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">{product.description || 'Sin descripción'}</p></td>
                        <td>{location ? <span className="inline-flex items-center gap-1.5 text-muted-foreground"><MapPin size={14} className="text-primary" /> {location.sector.name} · {location.rack} · Fila {location.row}{location.box ? ` · Caja ${location.box}` : ''}</span> : <WarehouseStatusBadge tone="warning">Sin ubicación</WarehouseStatusBadge>}</td>
                        <td>{location?.ledNumber != null ? <WarehouseStatusBadge tone="info">LED #{location.ledNumber}</WarehouseStatusBadge> : <WarehouseStatusBadge tone="neutral">Sin LED</WarehouseStatusBadge>}</td>
                        <td><div className="flex justify-end gap-1">
                          <button type="button" className="ui-icon-button" onClick={() => openEdit(product)} aria-label={`Editar ${product.name}`}><Edit3 size={17} /></button>
                          <button type="button" className="ui-icon-button" onClick={() => testLed(product.id)} disabled={location?.ledNumber == null || actionId === `test:${product.id}`} aria-label={`Probar LED de ${product.name}`}><Zap size={17} /></button>
                        </div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {products.map((product) => {
                const location = product.warehouseLocations[0]
                return (
                  <article key={product.id} className="warehouse-mobile-card">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold text-primary">{product.code || 'SIN CÓDIGO'}</p><h3 className="mt-1 font-semibold text-foreground">{product.name}</h3></div><WarehouseStatusBadge tone={location?.ledNumber != null ? 'info' : 'neutral'}>{location?.ledNumber != null ? `LED #${location.ledNumber}` : 'Sin LED'}</WarehouseStatusBadge></div>
                    <p className="mt-3 text-sm text-muted-foreground">{location ? `${location.sector.name} · ${location.rack} · Fila ${location.row}` : 'Sin ubicación física'}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" className="ui-button ui-button-secondary" onClick={() => openEdit(product)}><Edit3 size={16} /> Editar</button><button type="button" className="ui-button ui-button-secondary" onClick={() => testLed(product.id)} disabled={location?.ledNumber == null || actionId === `test:${product.id}`}><Zap size={16} /> Probar LED</button></div>
                  </article>
                )
              })}
            </div>
          </>
        ) : (
          <WarehouseEmptyState icon={Package} title="No encontramos productos" description="Probá otra búsqueda o agregá el primer producto del depósito." action={<button type="button" className="ui-button ui-button-primary" onClick={openCreate}><Plus size={16} /> Nuevo producto</button>} />
        )}
      </WarehousePanel>

      <ProductEditor open={editorOpen} product={editingProduct} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />
      <WarehouseConfirmDialog
        open={confirmOff}
        title="Apagar todos los LEDs"
        description={`Se enviará un comando de apagado a ${onlineDevices.length} dispositivo(s) online.`}
        confirmLabel="Apagar ahora"
        dangerous
        busy={actionId === 'off:all'}
        onConfirm={turnOffAll}
        onClose={() => setConfirmOff(false)}
      />
    </div>
  )
}
