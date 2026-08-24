import assert from 'node:assert/strict'

// @ts-expect-error Node's strip-types runner resolves the explicit TypeScript extension.
import { downloadWhatsAppAudio } from '../warehouse-audio.service.ts'

const originalFetch = globalThis.fetch

try {
  const calls: Array<{ url: string; authorization: string | null }> = []
  globalThis.fetch = (async (input, init) => {
    const url = String(input)
    calls.push({ url, authorization: new Headers(init?.headers).get('Authorization') })
    if (url.endsWith('/media-123')) {
      return new Response(JSON.stringify({ url: 'https://cdn.example/audio.ogg', mime_type: 'audio/ogg' }), { status: 200 })
    }
    return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'audio/ogg' } })
  }) as typeof fetch

  const file = await downloadWhatsAppAudio('media-123', 'meta-token')

  assert.equal(file.type, 'audio/ogg')
  assert.equal(file.name, 'whatsapp-media-123.ogg')
  assert.deepEqual(Array.from(new Uint8Array(await file.arrayBuffer())), [1, 2, 3])
  assert.deepEqual(calls, [
    { url: 'https://graph.facebook.com/v18.0/media-123', authorization: 'Bearer meta-token' },
    { url: 'https://cdn.example/audio.ogg', authorization: 'Bearer meta-token' },
  ])

  globalThis.fetch = (async () => new Response(null, { status: 404 })) as typeof fetch
  await assert.rejects(
    () => downloadWhatsAppAudio('missing-media', 'meta-token'),
    /No se pudo obtener el audio de WhatsApp \(404\)/,
  )

  console.log('whatsapp audio download: ok')
} finally {
  globalThis.fetch = originalFetch
}
