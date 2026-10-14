// Mezcla del reel Vase Management: voz (assets/vo/voz.wav) + beat RKT/dembow 100 BPM con 808 + efectos atados al guion.
// Variaciones propias respecto de Labs: progresion Am · F · C · G, 808 que sube (glide ascendente) y remata con octava,
// stabs de organo en contratiempo, clap en 2 y 4, arpegio pluck y timbales de relleno.
// Determinista. Uso: node scripts/musica.mjs → assets/audio/mezcla.wav
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { END, PHRASES as ph, SEGMENTS, word } from './segmentos.mjs'

const SR = 48000, DUR = END, N = Math.round(SR * DUR), TAU = Math.PI * 2
let seed = 4403; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); const noise = () => rnd() * 2 - 1
const readWav = (f) => { const b = readFileSync(f); let o = 12, d; while (o < b.length - 8) { const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4); if (id === 'data') { d = b.subarray(o + 8, o + 8 + sz); break } o += 8 + sz + (sz % 2) } const x = new Float32Array(d.length / 2); for (let i = 0; i < x.length; i++) x[i] = d.readInt16LE(i * 2) / 32768; return x }
const lpA = (x, c) => { const a = Math.exp((-TAU * c) / SR); const y = new Float32Array(x.length); let s = 0; for (let i = 0; i < x.length; i++) y[i] = s = a * s + (1 - a) * x[i]; return y }
const hpA = (x, c) => { const l = lpA(x, c); return x.map((v, i) => v - l[i]) }
const seg = (id) => SEGMENTS.find((g) => g.id === id)
const ev = (id, k) => seg(id).s + seg(id).evf[k] / 30

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
const kick = (b, t0, g = 1) => add(b, t0, 0.32, (t) => Math.tanh(Math.sin(TAU * (50 * t + (170 / 32) * (1 - Math.exp(-t * 32)))) * 1.7) * Math.exp(-t * 10) + noise() * Math.exp(-t * 300) * 0.22, { gain: g })
const snare = (b, t0, g = 1, pan = 0) => { const f = bp(1500, 8500); add(b, t0, 0.16, (t) => (f(noise()) * 0.95 + Math.sin(TAU * 230 * t) * 0.4 * Math.exp(-t * 45)) * Math.exp(-t * 26), { gain: 0.48 * g, rev: 0.1, pan }) }
const clap = (b, t0, g = 1) => { const f = bp(1000, 5000); add(b, t0, 0.2, (t) => { const k = t < 0.03 ? (Math.floor(t / 0.009) % 2 ? 0.4 : 1) : 1; return f(noise()) * k * Math.exp(-t * 18) }, { gain: 0.3 * g, rev: 0.25 }) }
const hat = (b, t0, g = 1, pan = 0.3, open = false) => { const f = hp(8000); add(b, t0, open ? 0.16 : 0.035, (t) => f(noise()) * Math.exp(-t * (open ? 22 : 110)), { gain: 0.11 * g, pan }) }
const timbal = (b, t0, f0, g = 1, pan = 0) => add(b, t0, 0.22, (t) => (Math.sin(TAU * f0 * (1 + 0.15 * Math.exp(-t * 30)) * t) * 0.8 + noise() * 0.25 * Math.exp(-t * 60)) * Math.exp(-t * 14), { gain: 0.3 * g, pan, rev: 0.2 })
// 808 con glide ascendente (otra firma que el de Labs, que bajaba)
const s808 = (b, t0, dur, f0, f1 = f0, g = 1, glide = 0.1) => { let ph = 0; add(b, t0, dur, (t, d) => { const f = f0 * Math.pow(f1 / f0, Math.min(1, t / glide)); ph += f / SR; return Math.tanh(Math.sin(TAU * ph) * 2.6) * Math.min(1, t / 0.003) * Math.min(1, (d - t) / 0.04) * (0.55 + 0.45 * Math.exp(-t * 2.5)) }, { gain: 0.5 * g }) }
// Stab de "organo" (cuadrada filtrada) en contratiempo
const stab = (b, t0, notes, g = 1) => { const f = lp(3000); add(b, t0, 0.18, (t) => { let s = 0; for (const n of notes) s += (Math.sin(TAU * n * t) > 0 ? 1 : -1) * 0.6 + Math.sin(TAU * n * 2 * t) * 0.4; return f(s / notes.length, 900 + 3000 * Math.exp(-t * 22)) * Math.exp(-t * 11) }, { gain: 0.16 * g, rev: 0.3 }) }
const pluck = (b, t0, f0, g = 1, pan = 0) => add(b, t0, 0.3, (t) => (Math.sin(TAU * f0 * t) + 0.5 * Math.sin(TAU * f0 * 2 * t) * Math.exp(-t * 20)) * Math.exp(-t * 12), { gain: 0.09 * g, pan, rev: 0.35 })

// ---- Efectos
const impact = (t0, g = 1) => { kick(F, t0, 1.5 * g); add(F, t0, 1.1, (t, d) => Math.tanh(Math.sin(TAU * (34 * t + (95 / 6) * (1 - Math.exp(-t * 6)))) * 1.8) * Math.min(1, (d - t) / 0.25), { gain: 0.7 * g }); const f = hp(2400); add(F, t0, 1.3, (t) => f(noise()) * Math.exp(-t * 3), { gain: 0.24 * g, rev: 0.45 }) }
const whoosh = (t0, dur, from, to, g = 0.5) => { const f = lp(from); add(F, t0, dur, (t, d) => { const x = t / d; return f(noise(), from * Math.pow(to / from, x)) * Math.pow(x, 2.2) }, { gain: g, rev: 0.15 }) }
const swish = (t0, dur, g = 0.4) => { const f = bp(500, 7000); add(F, t0, dur, (t, d) => f(noise()) * Math.sin(Math.PI * t / d) ** 2, { gain: g, rev: 0.2 }) }
const pop = (t0, f0 = 900, g = 1, pan = 0) => add(F, t0, 0.12, (t) => Math.sin(TAU * (f0 + f0 * 2.5 * t / 0.12) * t) * Math.exp(-t * 28), { gain: 0.32 * g, pan })
const ping = (t0, f0, g = 1, pan = 0) => add(F, t0, 0.45, (t) => (Math.sin(TAU * f0 * t) + 0.35 * Math.sin(TAU * f0 * 2.01 * t)) * Math.exp(-t * 9), { gain: 0.22 * g, pan, rev: 0.3 })
const key = (t0) => { const f = bp(1800, 6000); add(F, t0, 0.04, (t) => f(noise()) * Math.exp(-t * 160), { gain: 0.28, pan: (rnd() - 0.5) * 0.4 }) }
const tick = (t0, g = 1, f0 = 3000) => add(F, t0, 0.05, (t) => Math.sin(TAU * f0 * t) * Math.exp(-t * 140) + noise() * Math.exp(-t * 420) * 0.3, { gain: 0.2 * g, rev: 0.15 })
const buzz = (t0, dur, g = 1) => add(F, t0, dur, (t, d) => Math.tanh(Math.sin(TAU * 150 * t) * 3) * (Math.sin(TAU * 16 * t) > 0 ? 1 : 0.15) * Math.min(1, (d - t) / 0.03), { gain: 0.16 * g })
const kaching = (t0) => { [2093, 2637, 3136].forEach((f0, i) => add(F, t0 + i * 0.03, 0.9, (t) => Math.sin(TAU * f0 * t) * Math.exp(-t * 5), { gain: 0.15, rev: 0.4, pan: (i - 1) * 0.3 })); const f = bp(3000, 9000); add(F, t0, 0.15, (t) => f(noise()) * Math.exp(-t * 30), { gain: 0.3 }) }
// Caja vacia: golpe hueco de carton + traqueteo
const emptyBox = (t0) => { [0, 0.09, 0.15].forEach((d, i) => { const f = bp(250, 1400); add(F, t0 + d, 0.22, (t) => (f(noise()) * 0.8 + Math.sin(TAU * (150 - i * 20) * t) * 0.9) * Math.exp(-t * (22 + i * 8)), { gain: 0.5 * (1 - i * 0.3), rev: 0.25, pan: (i - 1) * 0.3 }) }) }
// "Error": dos tonos graves que bajan (estilo "nope")
const errTone = (t0, g = 1) => [[311, 0], [233, 0.17]].forEach(([f0, d]) => { let p = 0; add(F, t0 + d, 0.2, (t, du) => { p += (f0 * (1 - 0.08 * t / du)) / SR; return Math.tanh(Math.sin(TAU * p) * 2.2 + Math.sin(TAU * p * 0.5) * 0.8) * Math.min(1, (du - t) / 0.03) * Math.min(1, t / 0.004) }, { gain: 0.2 * g }) })
// Alarma corta (dos bips) para "limite"
const alarm = (t0) => [0, 0.16].forEach((d) => add(F, t0 + d, 0.11, (t, du) => (Math.sin(TAU * 1480 * t) > 0 ? 1 : -1) * 0.5 * Math.min(1, (du - t) / 0.02), { gain: 0.1, rev: 0.2 }))
// Campanita de notificacion
const bellDing = (t0) => { ping(t0, 1760, 0.9, 0.2); ping(t0 + 0.12, 2349, 0.8, -0.2) }
// Moneda (caja)
const coin = (t0) => { add(F, t0, 0.5, (t) => (Math.sin(TAU * 1975 * t) * (t < 0.07 ? 1 : 0) + Math.sin(TAU * 2637 * t) * (t >= 0.07 ? 1 : 0)) * Math.exp(-t * 8), { gain: 0.14, rev: 0.3 }) }
// Frenada de disco: el beat se "apaga" bajando de tono
const tapeStop = (t0, dur) => { let ph = 0; add(F, t0, dur, (t, d) => { const x = t / d; ph += (60 * (1 - x) ** 2) / SR; return Math.tanh(Math.sin(TAU * ph) * 2) * (1 - x) }, { gain: 0.5 }); const f = lp(3000); add(F, t0, dur, (t, d) => f(noise(), 3000 * (1 - t / d) + 80) * (1 - t / d) * 0.6, { gain: 0.35 }) }

// ===== Estructura (todo atado a la voz)
const BPM = 100, B = 60 / BPM, S16 = B / 4
const HOOK_END = seg('drama').s // aca se corta todo
const DROP = seg('drop').s
const REM0 = seg('remate').s, CIERRA = word(16, 'cierra')
const DALE = word(19, 'dale')
const ROOTS = [55, 43.65, 65.41, 49] // A · F · C · G
const CHORDS = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 261.63, 329.63], [196, 246.94, 293.66]]
const groove = (from, to, { light = false, barOffset = 0 } = {}) => {
  for (let bar = barOffset, t0 = from; t0 < to; bar++, t0 += B * 4) {
    const c = bar % 4
    for (let s = 0; s < 16; s++) {
      const t = t0 + s * S16; if (t >= to) break
      if (s % 4 === 0) kick(M, t, light ? 0.55 : 1)
      if (!light && s === 10 && bar % 2) kick(M, t, 0.55)
      if ([3, 7, 11, 14].includes(s)) snare(M, t, light ? 0.55 : (s === 7 ? 0.7 : 1), s === 7 ? 0.25 : 0) // dembow con variacion en 7
      if (!light && (s === 4 || s === 12)) clap(M, t, 0.9)
      if (s % 2 === 0) hat(M, t, s % 4 ? 1 : 0.6, s % 4 ? -0.35 : 0.35, !light && s === 14 && bar % 2 === 0)
      const R = ROOTS[c]
      if (!light && s === 0) s808(M, t, B * 1.3, R * 0.75, R, 1, 0.09)
      if (!light && s === 6) s808(M, t, B * 0.45, R, R, 0.75)
      if (!light && s === 11) s808(M, t, B * 0.35, R * 1.335, R * 1.335, 0.7)
      if (!light && s === 14) s808(M, t, B * 0.5, R * 2, R, 0.75, 0.12)
      if ([2, 6, 10, 13].includes(s) && (!light || s === 6)) stab(M, t, CHORDS[c], light ? 0.6 : 0.9)
      if (!light && bar % 2 === 1 && [0, 3, 6, 9, 12].includes(s)) pluck(M, t, CHORDS[c][[0, 1, 2, 1, 2][[0, 3, 6, 9, 12].indexOf(s)]] * 2, 1, ((s / 12) - 0.5) * 0.6)
      if (!light && bar % 4 === 3 && s >= 12 && s % 1 === 0) timbal(M, t, [330, 280, 240, 200][s - 12], 0.9, (s - 13.5) * 0.25)
    }
  }
}

// --- E1 Gancho: arranca liviano y filtrado; golpe en "Otra vez"
whoosh(0, 0.18, 400, 6000, 0.25)
stab(F, ph[0].s, CHORDS[0], 0.7)
groove(ph[0].s, word(1, 'otra'), { light: true })
impact(word(1, 'otra'), 0.85)
kick(F, word(1, 'vez'), 1.1); snare(F, word(1, 'vez'), 0.9)
groove(word(1, 'otra') + B * 0.5, HOOK_END - 0.05, { light: true, barOffset: 1 })
// --- E2 Planilla: "cinco" sube; "ni una": caja vacia + error
pop(word(2, 'cinco'), 700, 1.1)
ping(word(2, 'cinco') + 0.05, 1318, 0.6)
emptyBox(word(3, 'ni'))
errTone(word(3, 'ni') + 0.12, 0.9)
// --- E3 Drama: frenada de disco y silencio; la burbuja vibra en "avisa"
tapeStop(HOOK_END - 0.06, 0.6)
buzz(word(4, 'avisa'), 0.28, 0.8)
// --- E4 DROP
impact(DROP, 1.25)
swish(DROP - 0.02, 0.35, 0.3)
groove(DROP, REM0)
// --- E5 Venta: pop en la venta, cuenta regresiva del stock, error grave en stock insuficiente
pop(ev('Venta', 'vendes'), 820, 1.2); ping(ev('Venta', 'vendes') + 0.04, 1568, 0.7)
for (let k = 0; k < 6; k++) tick(ev('Venta', 'descuenta') + k * 0.075, 0.8, 2600 - k * 120)
{ const y0 = seg('Venta').s + (Math.max(seg('Venta').evf.descuenta + 16, seg('Venta').evf.notenes - 22)) / 30; for (let k = 0; k < 5; k++) key(y0 + k * 0.065) }
key(ev('Venta', 'notenes') - 0.02)
errTone(ev('Venta', 'venderlo'), 1.2)
add(F, ev('Venta', 'venderlo'), 0.4, (t) => Math.tanh(Math.sin(TAU * 55 * t) * 3) * Math.exp(-t * 7), { gain: 0.35 })
// --- E6 Reponer: campanita, swish al resaltar la columna, ping positivo en "ya tenes"
bellDing(ev('Reponer', 'avisa'))
swish(ev('Reponer', 'reponer') - 0.05, 0.3, 0.25)
ping(ev('Reponer', 'yatenes'), 1046, 0.8); ping(ev('Reponer', 'yatenes') + 0.09, 1568, 0.8)
// --- E7 Pedidos web: notificacion, ka-ching al entrar, rayon en "dos veces"
ping(ev('Pedidos', 'pedidos'), 1318, 1, -0.3); ping(ev('Pedidos', 'pedidos') + 0.1, 1760, 0.8, 0.3)
whoosh(ev('Pedidos', 'entran') - 0.25, 0.25, 500, 8000, 0.3)
kaching(ev('Pedidos', 'entran'))
swish(ev('Pedidos', 'dos'), 0.25, 0.35); tick(ev('Pedidos', 'dos') + 0.2, 1.2, 1200)
// --- E8 Riesgo: contador que sube, ping en "cuanto", alarma en "limite"
for (let k = 0; k < 12; k++) tick(ev('Riesgo', 'debe') + k * 0.055, 0.55, 1800 + k * 90)
ping(ev('Riesgo', 'cuanto'), 988, 0.8)
alarm(ev('Riesgo', 'limite'))
// --- E9 Tablero: subida en "ventas", moneda en "caja", swish de zoom en "vistazo"
whoosh(ev('Tablero', 'ventas') - 0.1, 0.6, 300, 9000, 0.25)
coin(ev('Tablero', 'caja'))
swish(ev('Tablero', 'vistazo'), 0.4, 0.35)
// --- E10 Remate: el beat se apaga; un clic en "una vez"; cifras que encajan; golpe en "cierra"
tapeStop(REM0 - 0.05, 0.45)
tick(word(15, 'una'), 1.6, 2200); pop(word(15, 'una') + 0.02, 600, 0.8)
for (let k = 0; k < 4; k++) tick(word(15, 'vez') + 0.35 + k * 0.16, 0.9, 1500 + k * 250)
// redoble que acelera hacia "cierra" (paso geometrico con corte asegurado)
{ let t = CIERRA - 0.9, step = 0.16; while (t < CIERRA - 0.02 && step > 0.02) { snare(F, t, 0.25 + 0.6 * (1 - (CIERRA - t) / 0.9)); t += step; step *= 0.82 } }
impact(CIERRA, 1.15)
ping(CIERRA + 0.05, 1568, 0.7); ping(CIERRA + 0.12, 2093, 0.6)
groove(CIERRA, DALE)
// --- E11 CTA: ping en "WhatsApp", golpe final en "¡Dale!" y fin del beat
ping(word(18, 'whatsapp'), 1175, 0.8)
whoosh(DALE - 0.5, 0.5, 400, 10000, 0.35)
impact(DALE, 1.2)
s808(F, DALE, 1.6, ROOTS[0] * 2, ROOTS[0], 0.9, 0.5)
stab(F, DALE, CHORDS[0], 1.2)

// ===== Reverb + mezcla (beat filtrado en el gancho y en el remate, ducking bajo la voz)
const verb = (x) => { const d = [1601, 2203, 2903, 3511].map((n) => Math.round((n * SR) / 44100)); const y = new Float32Array(N); for (const dl of d) { const buf = new Float32Array(dl); let p = 0; for (let i = 0; i < N; i++) { const o = buf[p]; buf[p] = x[i] + o * 0.7; y[i] += o * 0.25; p = (p + 1) % dl } } return lpA(y, 5500) }
const rL = verb(sL), rR = verb(sR)
const filt = [lp(900), lp(900)]
const L = new Float32Array(N), R = new Float32Array(N)
for (let i = 0; i < N; i++) {
  const t = i / SR
  const muffled = t < HOOK_END || (t >= REM0 && t < CIERRA)
  const silent = t >= HOOK_END + 0.1 && t < DROP // silencio total del beat antes del drop
  const cut = muffled ? (t < HOOK_END ? 1200 : 500) : 18000
  const fadeOut = Math.min(1, Math.max(0, (DUR - t) / 1.2))
  const mg = (0.72 - 0.42 * duck[i]) * fadeOut * (silent ? 0 : 1)
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
