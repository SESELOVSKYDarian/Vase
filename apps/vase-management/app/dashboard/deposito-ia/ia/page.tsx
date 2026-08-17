'use client'
import { useState } from 'react'
import { Bot, Send } from 'lucide-react'

export default function DepositoIAPanel() {
  const [text, setText] = useState('')
  const [chat, setChat] = useState<{role: 'user' | 'ai', msg: string, data?: any}[]>([])

  const send = async () => {
    if (!text.trim()) return
    const currentText = text
    setChat(prev => [...prev, { role: 'user', msg: currentText }])
    setText('')

    const res = await fetch('/api/warehouse/ai/command', {
      method: 'POST',
      body: JSON.stringify({ text: currentText })
    })
    const data = await res.json()
    setChat(prev => [...prev, { role: 'ai', msg: data.text, data }])
  }

  const confirmAction = async (proposal: any) => {
    const res = await fetch('/api/warehouse/ai/command', {
      method: 'POST',
      body: JSON.stringify({ proposal })
    })
    const data = await res.json()
    setChat(prev => [...prev, { role: 'ai', msg: data.text, data }])
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">IA de Depósito</h1>
          <p className="page-subtitle">Prueba los comandos naturales (ej. "donde esta PC06")</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 min-h-[400px] flex flex-col justify-end space-y-4">
        <div className="overflow-y-auto space-y-4 mb-4">
          {chat.map((c, i) => (
            <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl p-3 ${c.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                <div className="whitespace-pre-wrap">{c.msg}</div>
                {c.data?.requiresConfirmation && c.data.proposal && (
                  <button onClick={() => confirmAction(c.data.proposal)} className="mt-2 bg-green-500 text-white px-3 py-1 rounded text-sm w-full font-medium">
                    Confirmar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex space-x-2">
          <input 
            type="text" 
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ej: apagar leds" 
            className="flex-1 input-field"
          />
          <button onClick={send} className="btn-primary px-4"><Send size={18} /></button>
        </div>
      </div>
    </div>
  )
}