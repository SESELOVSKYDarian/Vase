// Arma la linea de tiempo del reel a partir de los tiempos reales de la voz (assets/vo/timing.json).
import { readFileSync } from 'node:fs'

const T = JSON.parse(readFileSync(new URL('../assets/vo/timing.json', import.meta.url), 'utf8'))
const P = T.phrases
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const word = (i, w) => {
  const hit = P[i].words.find((x) => norm(x.w).startsWith(norm(w)))
  if (!hit) throw new Error(`No encuentro "${w}" en la frase ${i}: ${P[i].text}`)
  return hit.s
}
export const FPS = 30
export const END = +(T.duration + 2.0).toFixed(2)

// tipo: "clip" = video de Remotion, "hf" = escena hecha en HyperFrames
export const SEGMENTS = [
  { id: 'Visto', kind: 'clip', s: 0, e: P[2].s, ev: { visto: word(1, 'visto') } },
  { id: 'Noche', kind: 'clip', s: P[2].s, e: P[4].s, ev: { tres: word(2, 'tres'), comprar: word(3, 'comprar') } },
  { id: 'quien', kind: 'hf', s: P[4].s, e: P[5].s },
  { id: 'logo', kind: 'hf', s: P[5].s, e: P[6].s },
  { id: 'Bandeja', kind: 'clip', s: P[6].s, e: P[8].s, ev: { wa: word(6, 'whatsapp'), ig: word(6, 'instagram'), fb: word(6, 'facebook'), bandeja: word(7, 'bandeja') } },
  { id: 'Respuesta', kind: 'clip', s: P[8].s, e: P[10].s, ev: { segundos: word(8, 'segundos'), precios: word(9, 'precios'), stock: word(9, 'stock') } },
  { id: 'Conocimiento', kind: 'clip', s: P[10].s, e: P[12].s, ev: { catalogo: word(11, 'catalogo'), preguntas: word(11, 'preguntas'), forma: word(11, 'forma'), hablar: word(11, 'hablar') } },
  { id: 'Senales', kind: 'clip', s: P[12].s, e: P[13].s, ev: { comprar: word(12, 'comprar') } },
  { id: 'Pedido', kind: 'clip', s: P[13].s, e: P[14].s, ev: { pedido: word(13, 'pedido'), solita: word(13, 'solita') } },
  { id: 'duerme', kind: 'hf', s: P[14].s, e: P[16].s },
  { id: 'cta', kind: 'hf', s: P[16].s, e: END },
].map((g) => ({
  ...g,
  s: +g.s.toFixed(3),
  e: +g.e.toFixed(3),
  // eventos en cuadros relativos al inicio del segmento
  evf: Object.fromEntries(Object.entries(g.ev || {}).map(([k, t]) => [k, Math.round((t - g.s) * FPS)])),
}))
export const PHRASES = P
