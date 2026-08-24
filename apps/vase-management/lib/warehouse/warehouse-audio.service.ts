type WhatsAppMediaMetadata = {
  url?: string
  mime_type?: string
}

export async function downloadWhatsAppAudio(mediaId: string, accessToken: string, apiVersion = 'v18.0') {
  if (!mediaId.trim()) throw new Error('El audio de WhatsApp no tiene media ID')
  if (!accessToken.trim()) throw new Error('El canal de WhatsApp no tiene access token')

  const headers = { Authorization: `Bearer ${accessToken}` }
  const metadataResponse = await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(mediaId)}`, { headers })
  if (!metadataResponse.ok) throw new Error(`No se pudo obtener el audio de WhatsApp (${metadataResponse.status})`)

  const metadata = await metadataResponse.json() as WhatsAppMediaMetadata
  if (!metadata.url) throw new Error('Meta no devolvió la URL del audio')

  const audioResponse = await fetch(metadata.url, { headers })
  if (!audioResponse.ok) throw new Error(`No se pudo descargar el audio de WhatsApp (${audioResponse.status})`)

  const mimeType = metadata.mime_type || audioResponse.headers.get('content-type') || 'audio/ogg'
  const extension = mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('wav') ? 'wav' : 'ogg'
  return new File([await audioResponse.arrayBuffer()], `whatsapp-${mediaId}.${extension}`, { type: mimeType })
}

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
