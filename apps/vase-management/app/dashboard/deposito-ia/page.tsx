'use client'
import { useEffect, useState } from 'react'
import { Bot, Package, Activity, Zap } from 'lucide-react'

export default function DepositoIADashboard() {
  const [stats, setStats] = useState({ totalProducts: 0, locatedProducts: 0, devices: 0, onlineDevices: 0 })

  useEffect(() => {
    fetch('/api/warehouse/summary')
      .then(res => res.json())
      .then(data => { if (!data.error) setStats(data) })
  }, [])

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Depósito IA</h1>
          <p className="page-subtitle">Gestión inteligente de inventario físico y comandos LED</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><Package size={24}/></div>
          <div>
            <div className="text-2xl font-semibold">{stats.totalProducts}</div>
            <div className="text-sm text-gray-500">Productos Totales</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="bg-green-100 p-3 rounded-lg text-green-600"><Bot size={24}/></div>
          <div>
            <div className="text-2xl font-semibold">{stats.locatedProducts}</div>
            <div className="text-sm text-gray-500">Ubicados con IA</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="bg-purple-100 p-3 rounded-lg text-purple-600"><Activity size={24}/></div>
          <div>
            <div className="text-2xl font-semibold">{stats.devices}</div>
            <div className="text-sm text-gray-500">Controladores ESP32</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="bg-orange-100 p-3 rounded-lg text-orange-600"><Zap size={24}/></div>
          <div>
            <div className="text-2xl font-semibold">{stats.onlineDevices}</div>
            <div className="text-sm text-gray-500">ESP32 Online</div>
          </div>
        </div>
      </div>
    </div>
  )
}