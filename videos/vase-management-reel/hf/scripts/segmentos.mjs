// Arma la linea de tiempo del reel Vase Management a partir de los tiempos reales de la voz (assets/vo/timing.json).
// Escenas segun guion/escenas.md (E1–E11). Los clips de Remotion arrancan un poco antes de su frase (LEAD)
// para que la pantalla ya este armada cuando la voz nombra la accion.
import { readFileSync } from 'node:fs'

const T = JSON.parse(readFileSync(new URL('../assets/vo/timing.json', import.meta.url), 'utf8'))
const P = T.phrases
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const word = (i, w, nth = 0) => {
  const hits = P[i].words.filter((x) => norm(x.w).startsWith(norm(w)))
  if (!hits[nth]) throw new Error(`No encuentro "${w}" (#${nth}) en la frase ${i}: ${P[i].text}`)
  return hits[nth].s
}
export const FPS = 30
export const END = +(T.duration + 2.0).toFixed(2)
const LEAD = 0.4 // segundos de pantalla antes de la primera palabra del clip

// tipo: "clip" = video de Remotion, "hf" = escena hecha en HyperFrames
export const SEGMENTS = [
  { id: 'gancho', kind: 'hf', s: 0, e: P[2].s }, // E1
  { id: 'planilla', kind: 'hf', s: P[2].s, e: P[4].s }, // E2
  { id: 'drama', kind: 'hf', s: P[4].s, e: P[5].s }, // E3 (silencio)
  { id: 'drop', kind: 'hf', s: P[5].s, e: P[6].s - LEAD }, // E4
  { id: 'Venta', kind: 'clip', s: P[6].s - LEAD, e: P[8].s - LEAD, ev: { vendes: word(6, 'vendes'), descuenta: word(6, 'descuenta'), notenes: word(7, 'no'), venderlo: word(7, 'venderlo') } }, // E5
  { id: 'Reponer', kind: 'clip', s: P[8].s - LEAD, e: P[10].s - LEAD, ev: { avisa: word(8, 'avisa'), reponer: word(8, 'reponer'), yatenes: word(9, 'ya') } }, // E6
  { id: 'Pedidos', kind: 'clip', s: P[10].s - LEAD, e: P[12].s - LEAD, ev: { pedidos: word(10, 'pedidos'), entran: word(10, 'entran'), dos: word(11, 'dos') } }, // E7
  { id: 'Riesgo', kind: 'clip', s: P[12].s - LEAD, e: P[14].s - LEAD, ev: { debe: word(12, 'debe'), cuanto: word(12, 'cuanto'), limite: word(13, 'limite') } }, // E8
  { id: 'Tablero', kind: 'clip', s: P[14].s - LEAD, e: P[15].s - 0.15, ev: { ventas: word(14, 'ventas'), caja: word(14, 'caja'), vistazo: word(14, 'vistazo') } }, // E9
  { id: 'remate', kind: 'hf', s: P[15].s - 0.15, e: P[17].s }, // E10
  { id: 'cta', kind: 'hf', s: P[17].s, e: END }, // E11
].map((g) => ({
  ...g,
  s: +g.s.toFixed(3),
  e: +g.e.toFixed(3),
  // eventos en cuadros relativos al inicio del segmento
  evf: Object.fromEntries(Object.entries(g.ev || {}).map(([k, t]) => [k, Math.round((t - +g.s.toFixed(3)) * FPS)])),
}))
export const PHRASES = P
