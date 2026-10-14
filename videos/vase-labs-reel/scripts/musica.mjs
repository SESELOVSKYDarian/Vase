// Musica original del reel Vase Labs: electronica 120 BPM (Dm · Bb · F · C) + efectos sincronizados con la imagen.
// Determinista (semilla fija). Uso: node scripts/musica.mjs → public/musica.wav
// Tiempos en segundos = cuadro / 30, tomados de src/theme.ts (CUTS) y src/scenes.tsx.
import { writeFileSync } from 'node:fs'

const OUT = 'public/musica.wav'
const SR = 48000, DUR = 33, N = SR * DUR, TAU = Math.PI * 2
const B = 0.5 // negra a 120 BPM
const DROP = 4, CTA = 28
const CUTS = [8, 12, 16, 20, 24]

let seed = 11; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); const noise = () => rnd() * 2 - 1
const lpA = (x, c) => { const a = Math.exp((-TAU * c) / SR); const y = new Float32Array(x.length); let s = 0; for (let i = 0; i < x.length; i++) y[i] = s = a * s + (1 - a) * x[i]; return y }

const ML = new Float32Array(N), MR = new Float32Array(N), FL = new Float32Array(N), FR = new Float32Array(N), sL = new Float32Array(N), sR = new Float32Array(N)
const M = [ML, MR], F = [FL, FR]
const add = (buf, t0, dur, fn, { gain = 1, pan = 0, rev = 0 } = {}) => { const [L, R] = buf; const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4); for (let i = 0; i < n; i++) { const k = s0 + i; if (k < 0 || k >= N) continue; const y = fn(i / SR, dur) * gain; L[k] += y * gl; R[k] += y * gr; if (rev) { sL[k] += y * gl * rev; sR[k] += y * gr * rev } } }
const lp = (c0) => { let y = 0; return (x, c = c0) => { const a = Math.exp((-TAU * c) / SR); return (y = a * y + (1 - a) * x) } }
const hp = (c0) => { const fl = lp(c0); return (x, c) => x - fl(x, c) }
const bp = (lo, hi) => { const h = hp(lo), l = lp(hi); return (x) => l(h(x)) }
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12)

// ---- Instrumentos
const kick = (b, t0, g = 1) => add(b, t0, 0.42, (t) => Math.sin(TAU * (46 * t + (140 / 26) * (1 - Math.exp(-t * 26)))) * Math.exp(-t * 7) + noise() * Math.exp(-t * 300) * 0.15, { gain: 0.95 * g })
const clap = (b, t0, g = 1) => { const fl = bp(1000, 7000); add(b, t0, 0.25, (t) => fl(noise()) * (Math.exp(-t * 22) + 0.6 * Math.exp(-Math.abs(t - 0.011) * 420) + 0.5 * Math.exp(-Math.abs(t - 0.022) * 420)), { gain: 0.38 * g, rev: 0.3 }) }
const hat = (b, t0, g = 1, open = false) => { const fl = hp(8000); add(b, t0, open ? 0.22 : 0.05, (t) => fl(noise()) * Math.exp(-t * (open ? 13 : 70)), { gain: 0.12 * g, pan: 0.3 }) }
const shaker = (b, t0, g = 1) => { const fl = bp(5000, 11000); add(b, t0, 0.07, (t) => fl(noise()) * Math.sin(Math.PI * t / 0.07), { gain: 0.07 * g, pan: -0.35 }) }
const bass = (b, t0, dur, f0, g = 1) => { const fl = lp(380); add(b, t0, dur, (t, d) => fl(Math.tanh((Math.sin(TAU * f0 * t) + 0.45 * Math.sin(TAU * 2 * f0 * t) + 0.3 * (2 * ((f0 * t) % 1) - 1)) * 1.7)) * Math.min(1, t / 0.004) * Math.min(1, (d - t) / 0.03), { gain: 0.36 * g }) }
// Campana FM: el sonido "IA" del tema.
const bell = (b, t0, f0, g = 1, pan = 0, len = 0.6) => add(b, t0, len, (t) => Math.sin(TAU * f0 * t + 1.6 * Math.exp(-t * 9) * Math.sin(TAU * f0 * 3.5 * t)) * Math.exp(-t * 6) * Math.min(1, t / 0.002), { gain: 0.14 * g, pan, rev: 0.45 })
const pad = (b, t0, dur, freqs, g = 1) => add(b, t0, dur, (t, d) => { let s = 0; freqs.forEach((fq, k) => { for (const det of [-0.7, 0.7]) s += 2 * (((fq + det) * t + k * 0.21) % 1) - 1 }); return (s / (freqs.length * 2)) * Math.min(1, t / 0.3) * Math.min(1, (d - t) / 0.4) }, { gain: 0.06 * g, rev: 0.6 })

// ---- Efectos
const whoosh = (t0, dur, from, to, g = 0.5, rise = true) => { const fl = lp(from); add(F, t0, dur, (t, d) => { const x = t / d; return fl(noise(), from * Math.pow(to / from, x)) * (rise ? Math.pow(x, 2.2) : Math.sin(Math.PI * x)) }, { gain: g, rev: 0.2 }) }
const impact = (t0, g = 1) => { kick(F, t0, 1.3 * g); add(F, t0, 1.0, (t, d) => Math.tanh(Math.sin(TAU * (36 * t + (90 / 6) * (1 - Math.exp(-t * 6)))) * 1.8) * Math.min(1, (d - t) / 0.3), { gain: 0.42 * g }); const fl = hp(3000); add(F, t0, 1.6, (t) => fl(noise()) * Math.exp(-t * 2.6), { gain: 0.14 * g, rev: 0.5 }) }
const ping = (t0, f0, g = 1, pan = 0) => add(F, t0, 0.35, (t) => (Math.sin(TAU * f0 * t) + 0.4 * Math.sin(TAU * f0 * 2 * t)) * Math.exp(-t * 11) * Math.min(1, t / 0.001), { gain: 0.22 * g, pan, rev: 0.25 })
const tick = (t0, g = 1) => add(F, t0, 0.03, (t) => noise() * Math.exp(-t * 350) * 0.5 + Math.sin(TAU * 2600 * t) * Math.exp(-t * 200), { gain: 0.3 * g })
const key = (t0, g = 1) => { const fl = bp(1800, 6000); add(F, t0, 0.04, (t) => fl(noise()) * Math.exp(-t * 160), { gain: 0.32 * g, pan: (rnd() - 0.5) * 0.4 }) }
const send = (t0) => add(F, t0, 0.18, (t) => Math.sin(TAU * (500 * t + 1500 * t * t)) * Math.exp(-t * 18), { gain: 0.3, rev: 0.2 })
const chime = (t0, g = 1) => [0, 4, 7, 12].forEach((iv, i) => bell(F, t0 + i * 0.06, midi(74 + iv), 1.4 * g, (i - 1.5) * 0.25, 1.2))

// ---- 0–4 s: gancho. Drone grave + notificaciones que se acumulan (una por tarjeta: cuadro 4 + 9i).
pad(M, 0, DROP + 0.3, [73.42, 110, 146.83], 1.3)
for (let i = 0; i < 6; i++) ping((4 + i * 9) / 30, [988, 1175, 880, 1319, 1047, 1397][i], 0.9, i % 2 ? 0.4 : -0.4)
for (let t = 0.1, step = 0.32; t < 2.4 && step > 0.05; t += step, step *= 0.86) tick(t, 0.6) // contador que se acelera
for (let k = 0; k < 8; k++) kick(M, 2 + k * 0.25, 0.25 + k * 0.06) // redoble de bombo hacia el drop
whoosh(DROP - 1.6, 1.6, 250, 11000, 0.45)
impact(DROP, 1.1)

// ---- 4–33 s: groove
const ROOT = [38, 34, 41, 36] // D · Bb · F · C (MIDI, octava grave)
const CH = [[62, 65, 69], [58, 62, 65], [60, 65, 69], [60, 64, 67]]
const ARP = [0, 1, 2, 1, 0, 2, 1, 2]
for (let bar = 0, t0 = DROP; t0 < DUR - 0.1; bar++, t0 += 4 * B) {
  const c = bar % 4
  const outro = t0 >= CTA + 2 * 4 * B // ultimos compases: se afloja
  for (let q = 0; q < 4; q++) {
    const t = t0 + q * B
    if (t >= DUR - 0.6) break
    if (!outro) kick(M, t, 0.95)
    if (q === 1 || q === 3) clap(M, t, outro ? 0.5 : 0.85)
    hat(M, t + B / 2, outro ? 0.5 : 1, q === 3)
    shaker(M, t + B / 4, 1); shaker(M, t + (3 * B) / 4, 0.8)
    if (!outro) { bass(M, t, B * 0.45, midi(ROOT[c]), 1); bass(M, t + B / 2, B * 0.35, midi(ROOT[c] + (q % 2 ? 12 : 0)), 0.75) }
  }
  for (let e = 0; e < 8; e++) { const t = t0 + e * (B / 2); if (t < DUR - 0.5) bell(M, t, midi(CH[c][ARP[e]] + (e === 7 ? 12 : 0)), outro ? 0.6 : 0.85, e % 2 ? 0.4 : -0.4) }
  pad(M, t0, 4 * B, CH[c].map((n) => midi(n - 12)), outro ? 1.6 : 1)
}

// ---- Cortes de escena: whoosh + tick sobre el compas
for (const c of CUTS) { whoosh(c - 0.4, 0.42, 500, 8000, 0.25); tick(c, 0.9) }

// Bandeja: un "listo" por cada conversacion que responde la IA (cuadro 62 + 9i desde 8 s)
for (let i = 0; i < 5; i++) ping(8 + (62 + i * 9) / 30, midi(81 + [0, 2, 4, 7, 9][i]), 0.55, (i - 2) * 0.2)
// IA responde: tecleo (cuadros 30–62 desde 12 s) + envio del mensaje
for (let t = 12 + 30 / 30; t < 12 + 60 / 30; t += 0.075 + rnd() * 0.05) key(t, 0.8)
send(12 + 62 / 30)
ping(12 + 88 / 30, 1568, 0.7) // "Respondio en 3 s"
// Conocimiento: cada fuente absorbida (cuadro 40 + 12i desde 16 s) y 100 %
for (let i = 0; i < 4; i++) add(F, 16 + (40 + i * 12) / 30, 0.25, (t) => Math.sin(TAU * (300 + 900 * t / 0.25) * t) * Math.exp(-t * 10), { gain: 0.16, rev: 0.3 })
chime(16 + 100 / 30, 0.9)
// Senales: el cartel "listo para cerrar" (cuadro 84 desde 20 s)
whoosh(20 + 76 / 30, 0.3, 800, 9000, 0.2); ping(20 + 84 / 30, 1175, 0.8)
// Pedido sincronizado (cuadro 86 desde 24 s)
chime(24 + 86 / 30, 1.1)
// Cierre
whoosh(CTA - 1.2, 1.2, 300, 12000, 0.4)
impact(CTA, 1)
chime(DUR - 2.6, 0.8)

// ---- Reverb + mezcla
const verb = (x) => { const d = [1601, 2203, 2903, 3511].map((n) => Math.round((n * SR) / 44100)); const y = new Float32Array(N); for (const dl of d) { const buf = new Float32Array(dl); let p = 0; for (let i = 0; i < N; i++) { const o = buf[p]; buf[p] = x[i] + o * 0.74; y[i] += o * 0.25; p = (p + 1) % dl } } return lpA(y, 5500) }
const rL = verb(sL), rR = verb(sR)
const L = new Float32Array(N), R = new Float32Array(N)
for (let i = 0; i < N; i++) {
  const t = i / SR
  const fadeOut = Math.min(1, Math.max(0, (DUR - t) / 1.6))
  // "sidechain": el colchon respira con cada bombo despues del drop
  const ph = ((t - DROP) % B) / B
  const pump = t >= DROP ? 0.55 + 0.45 * Math.min(1, ph * 3) : 1
  L[i] = Math.tanh(((ML[i] + rL[i]) * 0.62 * pump + FL[i] * 0.9) * fadeOut)
  R[i] = Math.tanh(((MR[i] + rR[i]) * 0.62 * pump + FR[i] * 0.9) * fadeOut)
}
let pk = 1e-6; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]))
const g = 0.93 / pk
const buf = Buffer.alloc(44 + N * 4)
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22)
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4) }
writeFileSync(OUT, buf)
console.log('musica lista →', OUT, `(${DUR}s)`)
