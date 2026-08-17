'use client'
import { useState, useEffect } from 'react'
import { Search, MapPin, Zap } from 'lucide-react'

export default function DepositoProductos() {
  const [query, setQuery] = useState('')
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(false)

  const search = async () => {
    setLoading(true)
    const res = await fetch(`/api/warehouse/products?q=${query}`)
    const data = await res.json()
    setProductos(data)
    setLoading(false)
  }

  const testLed = async (productId: string) => {
    await fetch(`/api/warehouse/products/${productId}/test-led`, { method: 'POST' })
    alert('Comando enviado al LED')
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos en Depósito</h1>
          <p className="page-subtitle">Ubicación física y asignación de LEDs</p>
        </div>
      </div>

      <div className="flex space-x-2">
        <input 
          type="text" 
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar producto por código o nombre..." 
          className="flex-1 input-field"
        />
        <button onClick={search} className="btn-primary flex items-center gap-2">
          <Search size={16} /> Buscar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Ubicación</th>
              <th className="px-4 py-3">LED</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="p-4 text-center">Cargando...</td></tr> : null}
            {!loading && productos.map((p: any) => {
              const loc = p.warehouseLocations?.[0]
              return (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium">{p.code}</td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">
                    {loc ? (
                      <span className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                        <MapPin size={12}/> Sec: {loc.sector?.name} | R: {loc.rack} | F: {loc.row}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {loc?.ledNumber != null ? (
                      <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">#{loc.ledNumber}</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {loc?.ledNumber != null && (
                      <button onClick={() => testLed(p.id)} className="text-orange-500 hover:text-orange-600" title="Probar LED">
                        <Zap size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {!loading && productos.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">Usa el buscador para encontrar productos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}