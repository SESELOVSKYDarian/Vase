'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, Grid3X3, Lightbulb, LoaderCircle, MapPin, Package, Plus, Save, Search, Trash2, X, Zap } from 'lucide-react'
import { getErrorMessage, warehouseRequest } from '@/components/warehouse/client'
import { getLedColor } from '@/components/warehouse/led-color'
import {
  WarehouseConfirmDialog,
  WarehouseEmptyState,
  WarehouseErrorState,
  WarehousePageHeader,
  WarehousePanel,
  WarehouseStatusBadge,
} from '@/components/warehouse/ui'

type Sector = { id: string; name: string; description: string | null; _count: { locations: number } }
type Product = { id: string; code: string | null; name: string }
type Position = { id: string; rack: string; row: string; ledNumber: number | null; product: Product; productId: string }
type RackGroup = { rack: string; positions: Position[]; totalPositions: number; assignedLeds: number }
type Feedback = { message: string; tone: 'success' | 'danger' }

export default function RacksPage() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null)
  const [racks, setRacks] = useState<RackGroup[]>([])
  const [selectedRack, setSelectedRack] = useState<RackGroup | null>(null)
  const [newSectorName, setNewSectorName] = useState('')
  const [newRackName, setNewRackName] = useState('')
  const [newRowName, setNewRowName] = useState('')
  const [newLedNumber, setNewLedNumber] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loadingSectors, setLoadingSectors] = useState(true)
  const [loadingRacks, setLoadingRacks] = useState(false)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Position | null>(null)

  const loadSectors = useCallback(async () => {
    setLoadingSectors(true)
    setError(null)
    try {
      setSectors(await warehouseRequest<Sector[]>('/api/warehouse/sectors'))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoadingSectors(false)
    }
  }, [])

  const loadRacks = useCallback(async (sectorId: string) => {
    setLoadingRacks(true)
    setError(null)
    try {
      const data = await warehouseRequest<RackGroup[]>(`/api/warehouse/sectors/${sectorId}/racks`)
      setRacks(data)
      setSelectedRack((current) => current ? data.find((rack) => rack.rack === current.rack) || null : null)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoadingRacks(false)
    }
  }, [])

  useEffect(() => { void loadSectors() }, [loadSectors])
  useEffect(() => { if (selectedSector) void loadRacks(selectedSector.id) }, [loadRacks, selectedSector])

  useEffect(() => {
    if (!productSearch.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const data = await warehouseRequest<Array<Product & { warehouseLocations?: unknown[] }>>(`/api/warehouse/products?q=${encodeURIComponent(productSearch)}`)
        setSearchResults(data.map(({ id, code, name }) => ({ id, code, name })))
      } catch (requestError) {
        setFeedback({ message: getErrorMessage(requestError), tone: 'danger' })
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [productSearch])

  const duplicateLeds = useMemo(() => {
    if (!selectedRack) return new Set<number>()
    const counts = new Map<number, number>()
    selectedRack.positions.forEach((position) => {
      if (position.ledNumber != null) counts.set(position.ledNumber, (counts.get(position.ledNumber) || 0) + 1)
    })
    return new Set([...counts].filter(([, count]) => count > 1).map(([led]) => led))
  }, [selectedRack])

  const stripLength = useMemo(() => {
    const assigned = selectedRack?.positions.flatMap((position) => position.ledNumber == null ? [] : [position.ledNumber]) || []
    return assigned.length ? Math.min(Math.max(...assigned) + 5, 200) : 0
  }, [selectedRack])

  const createSector = async () => {
    if (!newSectorName.trim()) return
    setActionId('sector:create')
    try {
      await warehouseRequest('/api/warehouse/sectors', { method: 'POST', body: JSON.stringify({ name: newSectorName.trim() }) })
      setNewSectorName('')
      setFeedback({ message: 'Sector creado correctamente.', tone: 'success' })
      await loadSectors()
    } catch (requestError) {
      setFeedback({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setActionId(null)
    }
  }

  const assignPosition = async () => {
    if (!selectedSector || !selectedProduct) return
    const rack = newRackName.trim() || selectedRack?.rack
    const row = newRowName.trim()
    if (!rack || !row) return setFeedback({ message: 'Completá rack y fila antes de guardar.', tone: 'danger' })
    setSaving(true)
    try {
      await warehouseRequest('/api/warehouse/rack-positions', {
        method: 'POST',
        body: JSON.stringify({ sectorId: selectedSector.id, rack, row, productId: selectedProduct.id, ledNumber: newLedNumber === '' ? undefined : Number(newLedNumber) }),
      })
      setSelectedProduct(null)
      setProductSearch('')
      setNewRowName('')
      setNewLedNumber('')
      setFeedback({ message: 'Posición guardada correctamente.', tone: 'success' })
      await loadRacks(selectedSector.id)
    } catch (requestError) {
      setFeedback({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const removePosition = async () => {
    if (!selectedSector || !removeTarget) return
    setActionId(`remove:${removeTarget.productId}`)
    try {
      await warehouseRequest('/api/warehouse/rack-positions', { method: 'DELETE', body: JSON.stringify({ productId: removeTarget.productId }) })
      setFeedback({ message: 'La ubicación fue eliminada.', tone: 'success' })
      setRemoveTarget(null)
      await loadRacks(selectedSector.id)
    } catch (requestError) {
      setFeedback({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setActionId(null)
    }
  }

  const testLed = async (ledNumber: number) => {
    setActionId(`led:${ledNumber}`)
    try {
      await warehouseRequest('/api/warehouse/rack-positions/test-led', { method: 'POST', body: JSON.stringify({ ledNumber }) })
      setFeedback({ message: `Comando enviado al LED #${ledNumber}.`, tone: 'success' })
    } catch (requestError) {
      setFeedback({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="warehouse-shell">
      <WarehousePageHeader title="Mapa de ubicaciones" description="Organizá sectores, racks, filas y LEDs con una vista operativa del depósito." />
      {feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.tone === 'success' ? 'ui-badge-success' : 'ui-badge-danger'}`} role="status">{feedback.message}</div> : null}
      {error ? <WarehouseErrorState message={error} onRetry={selectedSector ? () => loadRacks(selectedSector.id) : loadSectors} /> : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[15rem_minmax(0,1fr)_18rem]">
        <aside className="space-y-4">
          <WarehousePanel title="Sectores" description={loadingSectors ? 'Cargando…' : `${sectors.length} configurado(s)`}>
            <div className="max-h-72 space-y-1 overflow-y-auto p-3">
              {sectors.map((sector) => <button key={sector.id} type="button" onClick={() => { setSelectedSector(sector); setSelectedRack(null); setNewRackName('') }} className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm transition-colors ${selectedSector?.id === sector.id ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted'}`}><span className="truncate">{sector.name}</span><WarehouseStatusBadge tone="neutral">{sector._count.locations}</WarehouseStatusBadge></button>)}
              {!loadingSectors && !sectors.length ? <p className="px-2 py-5 text-center text-sm text-muted-foreground">Todavía no hay sectores.</p> : null}
            </div>
            <div className="flex gap-2 border-t border-border p-3"><input className="input-field min-w-0 flex-1" value={newSectorName} onChange={(event) => setNewSectorName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createSector() }} placeholder="Nuevo sector" /><button type="button" className="ui-button ui-button-primary w-11 px-0" onClick={createSector} disabled={!newSectorName.trim() || actionId === 'sector:create'} aria-label="Crear sector"><Plus size={17} /></button></div>
          </WarehousePanel>

          {selectedSector ? <WarehousePanel title="Racks" description={`Sector ${selectedSector.name}`}><div className="max-h-72 space-y-1 overflow-y-auto p-3">{loadingRacks ? <div className="ui-skeleton h-24" /> : racks.map((rackItem) => <button key={rackItem.rack} type="button" onClick={() => { setSelectedRack(rackItem); setNewRackName('') }} className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm transition-colors ${selectedRack?.rack === rackItem.rack ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted'}`}><span className="flex items-center gap-1"><ChevronRight size={14} /> {rackItem.rack}</span><span className="text-xs text-muted-foreground">{rackItem.assignedLeds}/{rackItem.totalPositions}</span></button>)}{!loadingRacks && !racks.length ? <p className="px-2 py-5 text-center text-sm text-muted-foreground">Creá la primera posición para iniciar un rack.</p> : null}</div></WarehousePanel> : null}
        </aside>

        <main>
          {selectedRack ? (
            <WarehousePanel title={`Rack ${selectedRack.rack}`} description={`${selectedRack.totalPositions} posiciones · ${selectedRack.assignedLeds} LEDs asignados`} action={duplicateLeds.size ? <WarehouseStatusBadge tone="danger">LED duplicado</WarehouseStatusBadge> : <WarehouseStatusBadge tone="success">Sin conflictos</WarehouseStatusBadge>}>
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {selectedRack.positions.map((position) => {
                  const conflict = position.ledNumber != null && duplicateLeds.has(position.ledNumber)
                  return <article key={position.id} className={`warehouse-rack-slot ${conflict ? 'border-red-500/50 bg-red-500/10' : ''}`}><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-medium text-muted-foreground">Fila {position.row}</p><p className="mt-2 font-mono text-sm font-bold text-foreground">{position.product.code || 'SIN CÓDIGO'}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{position.product.name}</p></div>{position.ledNumber != null ? <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: getLedColor(position.ledNumber), boxShadow: `0 0 10px ${getLedColor(position.ledNumber)}` }} aria-label={`LED ${position.ledNumber}`} /> : null}</div><div className="mt-4 flex items-center justify-between gap-2">{position.ledNumber != null ? <WarehouseStatusBadge tone={conflict ? 'danger' : 'info'}>{conflict ? 'Conflicto ' : ''}LED #{position.ledNumber}</WarehouseStatusBadge> : <WarehouseStatusBadge tone="neutral">Sin LED</WarehouseStatusBadge>}<div className="flex"><button type="button" className="ui-icon-button h-9 w-9" onClick={() => position.ledNumber != null && testLed(position.ledNumber)} disabled={position.ledNumber == null || actionId === `led:${position.ledNumber}`} aria-label={`Probar LED de ${position.product.name}`}><Zap size={15} /></button><button type="button" className="ui-icon-button h-9 w-9 text-destructive" onClick={() => setRemoveTarget(position)} aria-label={`Quitar ${position.product.name} del rack`}><Trash2 size={15} /></button></div></div></article>
                })}
              </div>

              {stripLength ? <div className="m-4 rounded-2xl bg-[#09110d] p-4"><div className="mb-3 flex items-center justify-between text-xs text-slate-400"><span className="font-semibold uppercase tracking-[.12em]">Vista previa de tira LED</span><span>0–{stripLength - 1}</span></div><div className="flex flex-wrap gap-1">{Array.from({ length: stripLength }).map((_, index) => { const position = selectedRack.positions.find((item) => item.ledNumber === index); return <button key={index} type="button" className="h-4 w-4 min-h-0 rounded-sm transition-transform hover:scale-125 focus-visible:scale-125" style={{ backgroundColor: position ? getLedColor(index) : '#26352E', boxShadow: position ? `0 0 6px ${getLedColor(index)}` : 'none' }} onClick={() => { if (position) void testLed(index) }} disabled={!position} title={position ? `LED #${index}: ${position.product.name}` : `LED #${index}: libre`} aria-label={position ? `Probar LED ${index} de ${position.product.name}` : `LED ${index} libre`} /> })}</div></div> : null}
            </WarehousePanel>
          ) : (
            <WarehousePanel><WarehouseEmptyState icon={selectedSector ? Grid3X3 : MapPin} title={selectedSector ? 'Seleccioná un rack' : 'Seleccioná un sector'} description={selectedSector ? 'Elegí un rack para ver sus posiciones y LEDs.' : 'La jerarquía del mapa comienza por un sector.'} /></WarehousePanel>
          )}
        </main>

        <aside>
          <WarehousePanel title="Asignar posición" description={selectedSector ? `Dentro de ${selectedSector.name}` : 'Seleccioná un sector para empezar'}>
            <div className="space-y-4 p-4">
              <label className="ui-field"><span className="ui-label">Rack *</span><input className="input-field" value={newRackName} onChange={(event) => setNewRackName(event.target.value)} placeholder={selectedRack?.rack || 'Ej: A1'} disabled={!selectedSector} /></label>
              <label className="ui-field"><span className="ui-label">Fila / nivel *</span><input className="input-field" value={newRowName} onChange={(event) => setNewRowName(event.target.value)} placeholder="Ej: 2" disabled={!selectedSector} /></label>
              <label className="ui-field"><span className="ui-label">Índice LED</span><input type="number" min="0" className="input-field" value={newLedNumber} onChange={(event) => setNewLedNumber(event.target.value)} placeholder="Ej: 14" disabled={!selectedSector} /></label>
              <div className="ui-field"><span className="ui-label">Producto *</span>{selectedProduct ? <div className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3"><Package size={15} className="text-primary" /><span className="min-w-0 flex-1 truncate text-sm"><b className="font-mono">{selectedProduct.code || 'SIN CÓDIGO'}</b> · {selectedProduct.name}</span><button type="button" className="ui-icon-button h-8 w-8" onClick={() => { setSelectedProduct(null); setProductSearch('') }} aria-label="Quitar producto seleccionado"><X size={14} /></button></div> : <div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input className="input-field pl-9" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Código o nombre" disabled={!selectedSector} />{searching ? <LoaderCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" /> : null}{searchResults.length ? <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl">{searchResults.map((product) => <button key={product.id} type="button" className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-popover-foreground hover:bg-muted" onClick={() => { setSelectedProduct(product); setSearchResults([]); setProductSearch('') }}><span className="font-mono font-semibold">{product.code || '—'}</span><span className="truncate text-muted-foreground">{product.name}</span></button>)}</div> : null}</div>}</div>
              <button type="button" className="ui-button ui-button-primary w-full" onClick={assignPosition} disabled={!selectedSector || !selectedProduct || saving || !(newRackName.trim() || selectedRack) || !newRowName.trim()}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Guardando…' : 'Guardar posición'}</button>
              <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Lightbulb size={14} className="mt-0.5 shrink-0 text-primary" />Podés usar un rack existente o escribir un nombre nuevo.</p>
            </div>
          </WarehousePanel>
        </aside>
      </div>

      <WarehouseConfirmDialog open={Boolean(removeTarget)} title="Quitar ubicación" description={removeTarget ? `${removeTarget.product.name} dejará de estar asociado al rack ${removeTarget.rack}.` : ''} confirmLabel="Quitar ubicación" dangerous busy={Boolean(removeTarget && actionId === `remove:${removeTarget.productId}`)} onConfirm={removePosition} onClose={() => setRemoveTarget(null)} />
    </div>
  )
}
