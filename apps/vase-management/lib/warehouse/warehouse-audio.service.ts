export async function transcribeWarehouseAudio(file: File) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY no está configurada')

  const body = new FormData()
  body.append('file', file, file.name || 'warehouse-audio.webm')
  body.append('model', 'whisper-large-v3-turbo')
  body.append('language', 'es')
  body.append('response_format', 'json')

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
  })
  if (!response.ok) throw new Error(`No se pudo transcribir el audio (${response.status})`)
  const data = await response.json() as { text?: string }
  if (!data.text?.trim()) throw new Error('La transcripción llegó vacía')
  return data.text.trim()
}
