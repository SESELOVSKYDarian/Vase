'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Zap, Save, MapPin, Grid3X3, Package,
  ChevronRight, Search, X, Lightbulb, RotateCcw
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────
type Sector = { id: string; name: string; description: string | null; _count: { locations: number } }
type Product = { id: string; code: string; name: string }
type Position = {
  id: string; rack: string; row: string; ledNumber: number | null
  product: Product; productId: string
}
type RackGroup = {
  rack: string; positions: Position[]
  totalPositions: number; assignedLeds: number
}

// ─── Color helpers ──────────────────────────────────────────────────────────
const LED_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
]
function ledColor(n: number | null) {
  if (n == null) return '#d1d5db'
  return LED_COLORS[n % LED_COLORS.length]
}

export default function RacksPage() {
  // ─── State ──────────────────────────────────────────────────────────────
  const [sectors, setSectors] = useState<Sector[]>([])
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null)
  const [racks, setRacks] = useState<RackGroup[]>([])
  const [selectedRack, setSelectedRack] = useState<RackGroup | null>(null)

  // Forms
  const [newSectorName, setNewSectorName] = useState('')
  const [newRackName, setNewRackName] = useState('')
  const [newRowName, setNewRowName] = useState('')
  const [newLedNumber, setNewLedNumber] = useState<string>('')

  // Product search
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searching, setSearching] = useState(false)

  // Feedback
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  // ─── Fetch helpers ────────────────────────────────────────────────────
  const fetchSectors = useCallback(async () => {
    const res = await fetch('/api/warehouse/sectors')
    const data = await res.json()
    if (Array.isArray(data)) setSectors(data)
  }, [])

  const fetchRacks = useCallback(async (sectorId: string) => {
    const res = await fetch(`/api/warehouse/sectors/${sectorId}/racks`)
    const data = await res.json()
    if (Array.isArray(data)) {
      setRacks(data)
      if (selectedRack) {
        const updated = data.find((r: RackGroup) => r.rack === selectedRack.rack)
        setSelectedRack(updated || null)
      }
    }
  }, [selectedRack])

  useEffect(() => { fetchSectors() }, [fetchSectors])

  useEffect(() => {
    if (selectedSector) fetchRacks(selectedSector.id)
  }, [selectedSector]) // eslint-disable-line react-hooks/exhaustive-deps

  // Product search
  const searchProducts = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const res = await fetch(`/api/warehouse/products?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setSearchResults(Array.isArray(data) ? data.map((p: any) => ({ id: p.id, code: p.code, name: p.name })) : [])
    setSearching(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productSearch), 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  // ─── Actions ──────────────────────────────────────────────────────────
  const createSector = async () => {
    if (!newSectorName.trim()) return
    await fetch('/api/warehouse/sectors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSectorName })
    })
    setNewSectorName('')
    fetchSectors()
    showFlash('Sector creado')
  }

  const assignPosition = async () => {
    if (!selectedSector || !selectedProduct) return
    const rack = newRackName.trim() || selectedRack?.rack
    const row = newRowName.trim()
    if (!rack || !row) return

    setSaving(true)
    await fetch('/api/warehouse/rack-positions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectorId: selectedSector.id,
        rack,
        row,
        productId: selectedProduct.id,
        ledNumber: newLedNumber ? parseInt(newLedNumber) : undefined,
      })
    })
    setSaving(false)
    setSelectedProduct(null)
    setProductSearch('')
    setNewRowName('')
    setNewLedNumber('')
    fetchRacks(selectedSector.id)
    showFlash('Posición guardada')
  }

  const removePosition = async (productId: string) => {
    if (!selectedSector) return
    await fetch('/api/warehouse/rack-positions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    })
    fetchRacks(selectedSector.id)
    showFlash('Posición eliminada')
  }

  const testLed = async (ledNumber: number) => {
    await fetch('/api/warehouse/rack-positions/test-led', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ledNumber })
    })
    showFlash(`LED #${ledNumber} encendido`)
  }

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2500)
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Racks y Ubicaciones</h1>
          <p className="page-subtitle">Configurá visualmente los racks, asigná productos y LEDs</p>
        </div>
      </div>

      {flash && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 animate-pulse">
          <Zap size={14} /> {flash}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* ─── Left: Sectors ─────────────────────────────────── */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
              <MapPin size={14} /> Sectores
            </h3>

            <div className="space-y-1 mb-3 max-h-[300px] overflow-y-auto">
              {sectors.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSector(s); setSelectedRack(null) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    selectedSector?.id === s.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="text-xs text-gray-400">{s._count.locations}</span>
                </button>
              ))}
              {sectors.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No hay sectores aún</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text" value={newSectorName}
                onChange={e => setNewSectorName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createSector()}
                placeholder="Nuevo sector..." className="input-field flex-1 text-sm"
              />
              <button onClick={createSector} className="btn-primary px-3 py-1.5 text-sm">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Racks within sector */}
          {selectedSector && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                <Grid3X3 size={14} /> Racks en {selectedSector.name}
              </h3>
              <div className="space-y-1 max-h-[250px] overflow-y-auto">
                {racks.map(r => (
                  <button
                    key={r.rack}
                    onClick={() => setSelectedRack(r)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      selectedRack?.rack === r.rack
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <ChevronRight size={12} /> {r.rack}
                    </span>
                    <span className="text-xs text-gray-400">
                      {r.assignedLeds}/{r.totalPositions} LEDs
                    </span>
                  </button>
                ))}
                {racks.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Agregá posiciones para crear racks
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Center: Rack visual ──────────────────────────── */}
        <div className="col-span-6">
          {selectedRack ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Grid3X3 size={18} className="text-purple-500" />
                  Rack {selectedRack.rack}
                  <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                    {selectedRack.totalPositions} posiciones
                  </span>
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Lightbulb size={12} />
                  {selectedRack.assignedLeds} LEDs asignados
                </div>
              </div>

              {/* Visual grid of positions */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {selectedRack.positions.map(pos => (
                  <div
                    key={pos.id}
                    className="relative bg-gray-50 rounded-xl p-3 border border-gray-100 hover:border-gray-300 transition-all group"
                  >
                    {/* LED indicator */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {pos.ledNumber != null && (
                        <button
                          onClick={() => testLed(pos.ledNumber!)}
                          title={`Probar LED #${pos.ledNumber}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <div
                            className="w-4 h-4 rounded-full animate-pulse shadow-lg cursor-pointer"
                            style={{
                              backgroundColor: ledColor(pos.ledNumber),
                              boxShadow: `0 0 8px ${ledColor(pos.ledNumber)}`
                            }}
                          />
                        </button>
                      )}
                    </div>

                    {/* Position info */}
                    <div className="text-xs text-gray-400 mb-1">Fila {pos.row}</div>
                    <div className="font-mono text-sm font-semibold text-gray-800 truncate" title={pos.product.code}>
                      {pos.product.code}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5" title={pos.product.name}>
                      {pos.product.name}
                    </div>

                    {pos.ledNumber != null && (
                      <div className="mt-2 flex items-center gap-1">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: ledColor(pos.ledNumber) }}
                        />
                        <span className="text-[10px] font-mono text-gray-500">LED #{pos.ledNumber}</span>
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => removePosition(pos.productId)}
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                      title="Quitar de este rack"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* LED strip visualization */}
              {selectedRack.positions.some(p => p.ledNumber != null) && (
                <div className="bg-gray-900 rounded-xl p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                    Tira LED — Vista previa
                  </div>
                  <div className="flex gap-0.5 flex-wrap">
                    {Array.from({ length: Math.max(
                      ...selectedRack.positions.filter(p => p.ledNumber != null).map(p => p.ledNumber!),
                      0
                    ) + 5 }).map((_, i) => {
                      const pos = selectedRack.positions.find(p => p.ledNumber === i)
                      return (
                        <div
                          key={i}
                          title={pos ? `#${i}: ${pos.product.code}` : `#${i}: vacío`}
                          className="w-3 h-3 rounded-sm cursor-pointer transition-all hover:scale-150"
                          style={{
                            backgroundColor: pos ? ledColor(i) : '#374151',
                            boxShadow: pos ? `0 0 4px ${ledColor(i)}` : 'none',
                          }}
                          onClick={() => pos && testLed(i)}
                        />
                      )
                    })}
                  </div>
                  <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
                    <span>● Asignado</span>
                    <span className="text-gray-600">● Vacío</span>
                    <span>Click para probar</span>
                  </div>
                </div>
              )}
            </div>
          ) : selectedSector ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <Grid3X3 size={48} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">Seleccioná un rack de la izquierda o creá una nueva posición</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <MapPin size={48} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">Seleccioná un sector para ver sus racks</p>
            </div>
          )}
        </div>

        {/* ─── Right: Add position panel ────────────────────── */}
        <div className="col-span-3">
          {selectedSector && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4 sticky top-4">
              <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <Package size={14} /> Agregar posición
              </h3>

              {/* Rack name */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Rack</label>
                <input
                  type="text"
                  value={newRackName}
                  onChange={e => setNewRackName(e.target.value)}
                  placeholder={selectedRack ? selectedRack.rack : 'Ej: A1'}
                  className="input-field w-full text-sm"
                />
              </div>

              {/* Row */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fila / Nivel</label>
                <input
                  type="text"
                  value={newRowName}
                  onChange={e => setNewRowName(e.target.value)}
                  placeholder="Ej: 1, 2, 3..."
                  className="input-field w-full text-sm"
                />
              </div>

              {/* LED Number */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nº de LED en la tira</label>
                <input
                  type="number"
                  value={newLedNumber}
                  onChange={e => setNewLedNumber(e.target.value)}
                  placeholder="Ej: 14"
                  className="input-field w-full text-sm"
                  min={0}
                />
              </div>

              {/* Product search */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Producto</label>
                {selectedProduct ? (
                  <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 text-sm">
                    <Package size={14} className="text-blue-500" />
                    <span className="font-mono font-medium">{selectedProduct.code}</span>
                    <span className="text-gray-500 truncate flex-1">{selectedProduct.name}</span>
                    <button onClick={() => { setSelectedProduct(null); setProductSearch('') }}>
                      <X size={14} className="text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Buscar código o nombre..."
                        className="input-field w-full text-sm pl-9"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-full max-h-[200px] overflow-y-auto">
                        {searchResults.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedProduct(p)
                              setSearchResults([])
                              setProductSearch('')
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-2 border-b border-gray-50 last:border-0"
                          >
                            <span className="font-mono font-medium text-gray-800">{p.code}</span>
                            <span className="text-gray-500 truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searching && (
                      <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-full p-3 text-center text-xs text-gray-400">
                        Buscando...
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={assignPosition}
                disabled={!selectedProduct || saving || !(newRackName.trim() || selectedRack) || !newRowName.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} /> {saving ? 'Guardando...' : 'Guardar posición'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
