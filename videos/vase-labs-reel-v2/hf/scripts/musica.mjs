// Mezcla del reel Vase Labs v2: voz (assets/vo/voz.wav) + beat RKT/dembow 100 BPM con 808 + efectos sincronizados.
// Determinista. Uso: node scripts/musica.mjs → assets/audio/mezcla.wav
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { END, PHRASES as ph, SEGMENTS, word } from './segmentos.mjs'

const SR = 48000, DUR = END, N = Math.round(SR * DUR), TAU = Math.PI * 2
let seed = 2087; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); const noise = () => rnd() * 2 - 1
const readWav = (f) => { const b = readFileSync(f); let o = 12, d; while (o < b.length - 8) { const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4); if (id === 'data') { d = b.subarray(o + 8, o + 8 + sz); break } o += 8 + sz + (sz % 2) } const x = new Float32Array(d.length / 2); for (let i = 0; i < x.length; i++) x[i] = d.readInt16LE(i * 2) / 32768; return x }
const lpA = (x, c) => { const a = Math.exp((-TAU * c) / SR); const y = new Float32Array(x.length); let s = 0; for (let i = 0; i < x.length; i++) y[i] = s = a * s + (1 - a) * x[i]; return y }
const hpA = (x, c) => { const l = lpA(x, c); return x.map((v, i) => v - l[i]) }
const seg = (id) => SEGMENTS.find((g) => g.id === id)

// ---- Voz: limpieza, presencia, compresion
let v = new Float32Array(N); { const x = readWav(new URL('../assets/vo/voz.wav', import.meta.url).pathname); v.set(x.subarray(0, Math.min(x.length, N))) }
v = hpA(v, 110)
{ const pres = lpA(hpA(v, 2400), 6500), body = lpA(hpA(v, 160), 400), air = hpA(v, 9500); v = v.map((s, i) => s + pres[i] * 0.45 + body[i] * 0.2 + air[i] * 0.25) }
{ let env = 0, pk = 1e-6; for (const s of v) pk = Math.max(pk, Math.abs(s)); const at = Math.exp(-1 / (SR * 0.003)), rl = Math.exp(-1 / (SR * 0.07))
  for (let i = 0; i < N; i++) { v[i] /= pk; const a = Math.abs(v[i]); env = a > env ? at * env + (1 - at) * a : rl * env + (1 - rl) * a; const g = env > 0.25 ? (0.25 + (env - 0.25) / 3) / env : 1; v[i] = Math.tanh(v[i] * g * 1.8) * 0.95 } }
const duck = new Float32Array(N); { let e = 0; const at = Math.exp(-1 / (SR * 0.01)), rl = Math.exp(-1 / (SR * 0.25)); for (let i = 0; i < N; i++) { const a = Math.min(1, Math.abs(v[i]) * 3); e = a > e ? at * e + (1 - at) * a : rl * e + (1 - rl) * a; duck[i] = e } }

// ---- Buses: M = beat (se filtra/duckea), F = efectos
const ML = new Float32Array(N), MR = new Float32Array(N), FL = new Float32Array(N), FR = new Float32Array(N), sL = new Float32Array(N), sR = new Float32Array(N)
const M = [ML, MR], F = [FL, FR]
const add = (buf, t0, dur, fn, { gain = 1, pan = 0, rev = 0 } = {}) => { const [L, R] = buf; const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4); for (let i = 0; i < n; i++) { const k = s0 + i; if (k < 0 || k >= N) continue; const y = fn(i / SR, dur) * gain; L[k] += y * gl; R[k] += y * gr; if (rev) { sL[k] += y * gl * rev; sR[k] += y * gr * rev } } }
const lp = (c0) => { let y = 0; return (x, c = c0) => { const a = Math.exp((-TAU * c) / SR); return (y = a * y + (1 - a) * x) } }
const hp = (c0) => { const f = lp(c0); return (x, c) => x - f(x, c) }
const bp = (lo, hi) => { const h = hp(lo), l = lp(hi); return (x) => l(h(x)) }

// ---- Bateria y bajo RKT
const kick = (b, t0, g = 1) => add(b, t0, 0.35, (t) => Math.tanh(Math.sin(TAU * (52 * t + (160 / 30) * (1 - Math.exp(-t * 30)))) * 1.6) * Math.exp(-t * 9) + noise() * Math.exp(-t * 280) * 0.25, { gain: g })
const snare = (b, t0, g = 1) => { const f = bp(1300, 9000); add(b, t0, 0.18, (t) => (f(noise()) * 0.9 + Math.sin(TAU * 210 * t) * 0.45 * Math.exp(-t * 40)) * Math.exp(-t * 24), { gain: 0.5 * g, rev: 0.12 }) }
const rim = (b, t0, g = 1, pan = 0.3) => add(b, t0, 0.06, (t) => (Math.sin(TAU * 1700 * t) + Math.sin(TAU * 820 * t) * 0.6) * Math.exp(-t * 90), { gain: 0.16 * g, pan })
const hat = (b, t0, g = 1, pan = 0.3) => { const f = hp(8500); add(b, t0, 0.035, (t) => f(noise()) * Math.exp(-t * 110), { gain: 0.12 * g, pan }) }
// 808 con glide: la firma del RKT
const s808 = (b, t0, dur, f0, f1 = f0, g = 1) => { let ph = 0; add(b, t0, dur, (t, d) => { const f = f0 * Math.pow(f1 / f0, Math.min(1, t / 0.12)); ph += f / SR; return Math.tanh(Math.sin(TAU * ph) * 2.4) * Math.min(1, t / 0.003) * Math.min(1, (d - t) / 0.04) * (0.6 + 0.4 * Math.exp(-t * 3)) }, { gain: 0.5 * g }) }
// Acorde "stab" de sierra (Gm · Eb · Cm · D)
const stab = (b, t0, notes, g = 1) => { const f = lp(2600); add(b, t0, 0.22, (t) => { let s = 0; for (const n of notes) for (const det of [-0.4, 0.4]) s += 2 * (((n + det) * t) % 1) - 1; return f(s / (notes.length * 2), 600 + 3500 * Math.exp(-t * 18)) * Math.exp(-t * 9) }, { gain: 0.24 * g, rev: 0.35 }) }
// Sirena (subida y bajada) tipica de cachengue
const sirena = (t0, dur, g = 1) => { let ph = 0; add(F, t0, dur, (t, d) => { const f = 700 + 500 * Math.sin(TAU * 2.2 * t); ph += f / SR; return (2 * (ph % 1) - 1) * 0.5 * Math.sin(Math.PI * t / d) }, { gain: 0.09 * g, rev: 0.4, pan: -0.2 }) }

// ---- Efectos
const impact = (t0, g = 1) => { kick(F, t0, 1.5 * g); add(F, t0, 1.1, (t, d) => Math.tanh(Math.sin(TAU * (36 * t + (90 / 6) * (1 - Math.exp(-t * 6)))) * 1.8) * Math.min(1, (d - t) / 0.25), { gain: 0.7 * g }); const f = hp(2600); add(F, t0, 1.3, (t) => f(noise()) * Math.exp(-t * 3), { gain: 0.25 * g, rev: 0.45 }) }
const whoosh = (t0, dur, from, to, g = 0.5) => { const f = lp(from); add(F, t0, dur, (t, d) => { const x = t / d; return f(noise(), from * Math.pow(to / from, x)) * Math.pow(x, 2.2) }, { gain: g, rev: 0.15 }) }
const pop = (t0, f0 = 900, g = 1, pan = 0) => add(F, t0, 0.12, (t) => Math.sin(TAU * (f0 + f0 * 2.5 * t / 0.12) * t) * Math.exp(-t * 28), { gain: 0.32 * g, pan })
const ping = (t0, f0, g = 1, pan = 0) => add(F, t0, 0.4, (t) => (Math.sin(TAU * f0 * t) + 0.35 * Math.sin(TAU * f0 * 2.01 * t)) * Math.exp(-t * 10), { gain: 0.24 * g, pan, rev: 0.3 })
const key = (t0) => { const f = bp(1800, 6000); add(F, t0, 0.04, (t) => f(noise()) * Math.exp(-t * 160), { gain: 0.3, pan: (rnd() - 0.5) * 0.4 }) }
const tick = (t0, g = 1) => add(F, t0, 0.05, (t) => Math.sin(TAU * 3000 * t) * Math.exp(-t * 140) + noise() * Math.exp(-t * 420) * 0.3, { gain: 0.22 * g, rev: 0.15 })
const buzz = (t0, dur) => add(F, t0, dur, (t, d) => Math.tanh(Math.sin(TAU * 160 * t) * 3) * (Math.sin(TAU * 18 * t) > 0 ? 1 : 0.2) * Math.min(1, (d - t) / 0.03), { gain: 0.18 })
const kaching = (t0) => { [2093, 2637, 3136].forEach((f0, i) => add(F, t0 + i * 0.03, 0.9, (t) => Math.sin(TAU * f0 * t) * Math.exp(-t * 5), { gain: 0.16, rev: 0.4, pan: (i - 1) * 0.3 })); const f = bp(3000, 9000); add(F, t0, 0.15, (t) => f(noise()) * Math.exp(-t * 30), { gain: 0.3 }) }
const scratch = (t0, dur, g = 1) => add(F, t0, dur, (t, d) => { const sp = Math.sin(Math.PI * t / d * 3); return Math.sin(TAU * 420 * (1 + 0.8 * sp) * t) * 0.35 + noise() * 0.3 * Math.abs(sp) }, { gain: 0.5 * g })
// Frenada de disco: el beat se "apaga" bajando de tono
const tapeStop = (t0, dur) => { let ph = 0; add(F, t0, dur, (t, d) => { const x = t / d; ph += (55 * (1 - x) ** 2) / SR; return Math.tanh(Math.sin(TAU * ph) * 2) * (1 - x) }, { gain: 0.45 }) }

// ===== Estructura (todo atado a la voz)
const BPM = 100, B = 60 / BPM, S16 = B / 4
const HOOK_END = seg('quien').s // aca se corta todo
const DROP = seg('logo').s
const SLEEP0 = seg('duerme').s, SLEEP1 = word(15, 'tu') // "Vos dormis" en filtro, "Tu negocio vende" vuelve
const groove = (from, to, { light = false } = {}) => {
  for (let bar = 0, t0 = from; t0 < to; bar++, t0 += B * 4) {
    for (let s = 0; s < 16; s++) {
      const t = t0 + s * S16; if (t >= to) break
      if (s % 4 === 0 || (!light && s === 14)) kick(M, t, light ? 0.6 : 1)
      if ([3, 6, 11, 14].includes(s)) snare(M, t, light ? 0.6 : 1) // dembow
      if (s % 2 === 0) hat(M, t, s % 4 ? 1 : 0.7, s % 4 ? 0.35 : -0.35)
      if (!light && [7, 10, 15].includes(s)) rim(M, t, 1, s === 10 ? -0.4 : 0.4)
      const R = [49, 38.89, 32.7, 36.71][bar % 4] // G · Eb · C · D (808)
      if (!light && s === 0) s808(M, t, B * 1.4, R * 1.5, R, 1)
      if (!light && s === 10) s808(M, t, B * 0.5, R, R * 1.5, 0.8)
      const CH = [[196, 233.08, 293.66], [155.56, 196, 233.08], [130.81, 155.56, 196], [146.83, 185, 220]][bar % 4]
      if (!light && [0, 3, 6].includes(s) && bar % 2 === 1) stab(M, t, CH.map((f) => f * 2), 0.9)
    }
  }
}

// 0 – HOOK_END: gancho. Beat liviano + golpes en "Pará, pará"
scratch(0, 0.2, 0.9)
ph[0].words.forEach((w) => { kick(F, w.s, 0.9); snare(F, w.s, 0.6) })
groove(ph[1].s - 0.02, seg('Noche').s, { light: true })
seg('Visto').evf && [2, 10, 18].forEach((f, i) => pop(f / 30, 900 + i * 180, 0.9, i % 2 ? 0.3 : -0.3))
impact(word(1, 'visto'), 0.7)
// La noche: reloj, telefono que vibra
for (let t = seg('Noche').s; t < HOOK_END - 0.05; t += 0.5) tick(t, 0.8)
buzz(word(3, 'comprar'), 0.35)
ping(word(3, 'comprar'), 1318, 0.9)
// Corte en seco
tapeStop(HOOK_END - 0.05, 0.55)
whoosh(HOOK_END + 0.3, DROP - HOOK_END - 0.3, 200, 12000, 0.55)
sirena(HOOK_END + 0.2, DROP - HOOK_END - 0.2, 0.7)

// DROP: "Vase Labs"
impact(DROP, 1.2)
groove(DROP, SLEEP0)
sirena(DROP + B * 4 * 2, B * 2, 1)
// Bandeja: un ping por canal cuando se nombra
;['wa', 'ig', 'fb'].forEach((k, i) => ping(seg('Bandeja').s + seg('Bandeja').evf[k] / 30, [988, 1175, 1397][i], 1, (i - 1) * 0.4))
// Respuesta: tecleo + envio
{ const s0 = seg('Respuesta').s; for (let t = s0 + 0.15; t < s0 + seg('Respuesta').evf.precios / 30 - 0.05; t += 0.07 + rnd() * 0.04) key(t); pop(s0 + seg('Respuesta').evf.precios / 30, 700, 1.1) }
// Senales: "lista para comprar"
whoosh(word(12, 'comprar') - 0.35, 0.35, 600, 9000, 0.3); impact(word(12, 'comprar'), 0.45)
// Conocimiento: un "blip" por cada fuente que absorbe la IA
{ const g = seg('Conocimiento'); ['catalogo', 'preguntas', 'forma'].forEach((k, i) => add(F, g.s + g.evf[k] / 30, 0.28, (t) => Math.sin(TAU * (400 + 1400 * t / 0.28) * t) * Math.exp(-t * 9), { gain: 0.2, rev: 0.3, pan: (i - 1) * 0.4 })); ping(g.s + g.evf.hablar / 30 + 0.3, 1568, 0.9) }
// Bandeja: "todo en una sola bandeja"
ping(seg('Bandeja').s + seg('Bandeja').evf.bandeja / 30, 1760, 0.8)
// Pedido: ka-ching
kaching(word(13, 'pedido'))
// "Vos dormis": todo se apaga y suena una cajita; "Tu negocio vende": vuelve con golpe
;[1568, 1318, 1046].forEach((f0, i) => ping(SLEEP0 + i * 0.18, f0, 0.8, (i - 1) * 0.3))
impact(SLEEP1, 1)
kaching(SLEEP1 + 0.25)
groove(SLEEP1, END - 1.2)
sirena(seg('cta').s + 0.4, B * 2, 0.8)
impact(END - 1.25, 1.1)

// ===== Reverb + mezcla (beat filtrado en el gancho y en "Vos dormis", ducking bajo la voz)
const verb = (x) => { const d = [1601, 2203, 2903, 3511].map((n) => Math.round((n * SR) / 44100)); const y = new Float32Array(N); for (const dl of d) { const buf = new Float32Array(dl); let p = 0; for (let i = 0; i < N; i++) { const o = buf[p]; buf[p] = x[i] + o * 0.7; y[i] += o * 0.25; p = (p + 1) % dl } } return lpA(y, 5500) }
const rL = verb(sL), rR = verb(sR)
const filt = [lp(900), lp(900)]
const L = new Float32Array(N), R = new Float32Array(N)
for (let i = 0; i < N; i++) {
  const t = i / SR
  const muffled = t < HOOK_END || (t >= SLEEP0 && t < SLEEP1)
  const cut = muffled ? (t < HOOK_END ? 1100 : 500) : 18000
  const fadeOut = Math.min(1, Math.max(0, (DUR - t) / 0.9))
  const mg = (0.72 - 0.42 * duck[i]) * fadeOut
  const bl = filt[0](ML[i] + rL[i], cut), br = filt[1](MR[i] + rR[i], cut)
  L[i] = Math.tanh(bl * mg * (muffled ? 1.3 : 1) + FL[i] * 0.85 * fadeOut + v[i] * 0.95)
  R[i] = Math.tanh(br * mg * (muffled ? 1.3 : 1) + FR[i] * 0.85 * fadeOut + v[i] * 0.95)
}
let pk = 1e-6; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]))
const g = 0.95 / pk
const buf = Buffer.alloc(44 + N * 4)
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22)
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4) }
const out = new URL('../assets/audio/', import.meta.url).pathname
mkdirSync(out, { recursive: true })
writeFileSync(`${out}mezcla.wav`, buf)
console.log('mezcla lista →', `${out}mezcla.wav`, `(${DUR}s)`)
