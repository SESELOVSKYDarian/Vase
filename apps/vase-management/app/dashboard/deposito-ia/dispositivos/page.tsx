'use client'
import { useState, useEffect } from 'react'
import { Cpu, PowerOff } from 'lucide-react'

export default function DepositoDispositivos() {
  const [devices, setDevices] = useState([])
  const [name, setName] = useState('')

  const fetchDevices = async () => {
    const res = await fetch('/api/warehouse/devices')
    const data = await res.json()
    if (!data.error) setDevices(data)
  }

  useEffect(() => { fetchDevices() }, [])

  const create = async () => {
    if (!name) return
    await fetch('/api/warehouse/devices', { method: 'POST', body: JSON.stringify({ name }) })
    setName('')
    fetchDevices()
  }

  const turnOff = async (deviceId: string) => {
    await fetch(`/api/warehouse/devices/${deviceId}/off`, { method: 'POST' })
    alert('Comando de apagado enviado')
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dispositivos ESP32</h1>
          <p className="page-subtitle">Controladores LED del depósito</p>
        </div>
      </div>

      <div className="flex space-x-2 max-w-sm">
        <input 
          type="text" 
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre nuevo dispositivo" 
          className="flex-1 input-field"
        />
        <button onClick={create} className="btn-primary">Crear</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">LEDs</th>
              <th className="px-4 py-3">Device Key</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d: any) => (
              <tr key={d.id} className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <Cpu size={16} className="text-gray-400"/> {d.name}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${d.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3">{d.ledCount}</td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded select-all cursor-pointer">
                    {d.deviceKey.substring(0, 8)}...
                  </code>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => turnOff(d.id)} className="text-red-500 hover:text-red-600 flex items-center gap-1 text-xs">
                    <PowerOff size={14} /> Apagar Todos
                  </button>
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">No hay dispositivos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}