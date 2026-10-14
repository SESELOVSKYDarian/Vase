// Genera index.html (composicion HyperFrames) del reel Vase Management a partir de la voz y los segmentos.
// Montaje: clips de Remotion (E5–E9) + escenas tipograficas propias (E1–E4, E10, E11) + subtitulos palabra por palabra
// sobre los clips + destellos en los cortes + mezcla de audio. En GSAP solo se animan transform y opacity.
// Uso: node scripts/build.mjs
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { END, PHRASES as P, SEGMENTS, word } from './segmentos.mjs'

const root = new URL('../', import.meta.url).pathname
mkdirSync(`${root}assets/img`, { recursive: true })
const logoSrc = `${root}../remotion/public/vase-logo.png`
if (existsSync(logoSrc)) copyFileSync(logoSrc, `${root}assets/img/vase-logo.png`)

const seg = (id) => SEGMENTS.find((g) => g.id === id)
const f = (n) => +n.toFixed(3)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const WHATSAPP = '+54 9 223 449-6403'
const MINT = '#4fe0a8'

const html = []
const js = []
let z = 1
const scene = (id, cls, inner) => {
  const g = seg(id)
  html.push(`<div id="${id}" class="clip scene ${cls}" data-start="${g.s}" data-duration="${f(g.e - g.s)}" data-track-index="2" style="z-index:${z++}">${inner}</div>`)
  return g
}
const shakeX = (sel, at, amp = 16, n = 7, d = 0.035) => js.push(`tl.to('${sel}', { x: ${amp}, duration: ${d}, yoyo: true, repeat: ${n}, ease: 'none' }, ${f(at)}); tl.set('${sel}', { x: 0 }, ${f(at + d * (n + 1))});`)

// ---- 1. Clips de Remotion
for (const g of SEGMENTS.filter((x) => x.kind === 'clip')) {
  const id = `clip-${g.id}`
  html.push(`<video id="${id}" class="clip media" src="assets/clips/${g.id}.mp4" muted playsinline data-start="${g.s}" data-duration="${f(g.e - g.s)}" data-track-index="1" style="z-index:${z++}"></video>`)
  js.push(`tl.fromTo('#${id}', { scale: 1.1, opacity: 0.5 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'power3.out' }, ${g.s});`)
}

// ---- 2. Escenas propias
// E1 Gancho: la frase ya se lee desde el cuadro 0 y cada palabra se enciende al decirla; "Otra vez" = sello rojo + sacudon
{
  const g = scene('gancho', 'dark', `
    <div class="hook-text" id="hook-text">${P[0].words.map((w, i) => `<span class="hw" id="hw${i}">${esc(w.w)}${i === P[0].words.length - 1 ? '.' : ''}</span>`).join(' ')}</div>
    <div id="stamp-wrap"><div id="stamp">OTRA VEZ.</div></div>`)
  P[0].words.forEach((w, i) => js.push(i === 0 ? `tl.fromTo('#hw0', { opacity: 1, y: 0 }, { opacity: 1, y: -6, duration: 0.14, ease: 'power2.out' }, ${f(w.s)});` : `tl.fromTo('#hw${i}', { opacity: 0.55, y: 0 }, { opacity: 1, y: -6, duration: 0.14, ease: 'power2.out' }, ${f(w.s)});`))
  js.push(`tl.to('#hook-text', { y: -40, duration: 0.3, ease: 'power2.out' }, ${f(word(1, 'otra') - 0.12)});`)
  js.push(`tl.fromTo('#stamp', { scale: 3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: 'power4.in' }, ${f(word(1, 'otra') - 0.06)});`)
  shakeX('#gancho', word(1, 'otra') + 0.14, 22, 7)
  js.push(`tl.to('#stamp', { scale: 1.08, duration: 0.09, yoyo: true, repeat: 1 }, ${f(word(1, 'vez'))});`)
}
// E2 Planilla vs. estante: el 5 hace zoom en "cinco"; en "ni una" se tacha, cae a 0 y el estante tiembla
{
  const g = scene('planilla', 'dark', `
    <div class="kicker" id="k1">El Excel decía…</div>
    <div class="sheet" id="sheet">
      <div class="srow head"><div class="c n"></div><div class="c a">A</div><div class="c b">B</div></div>
      <div class="srow th"><div class="c n">1</div><div class="c a">Producto</div><div class="c b">Stock</div></div>
      <div class="srow"><div class="c n">2</div><div class="c a">Aceite de girasol 1,5 L</div><div class="c b sel"><span id="five">5</span><span id="five-x"></span><span id="zero">0</span></div></div>
      <div class="srow"><div class="c n">3</div><div class="c a"></div><div class="c b"></div></div>
    </div>
    <div class="kicker" id="k2">…y en el estante</div>
    <div id="shelf">
      <div class="post l"></div><div class="post r"></div>
      <div class="plank p1"></div><div class="plank p2"></div>
      <div class="tag" id="tag">Aceite 1,5 L</div>
      <div class="dust">vacío</div>
    </div>
    <div id="niuna">ni una.</div>`)
  js.push(`tl.fromTo('#k1', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25 }, ${f(g.s)});`)
  js.push(`tl.fromTo('#sheet', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, ${f(g.s + 0.05)});`)
  js.push(`tl.fromTo('#five', { scale: 1 }, { scale: 1.7, duration: 0.18, ease: 'back.out(3)' }, ${f(word(2, 'cinco'))}); tl.to('#five', { scale: 1.25, duration: 0.25 }, ${f(word(2, 'cinco') + 0.2)});`)
  js.push(`tl.fromTo('#k2', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25 }, ${f(P[3].s)});`)
  js.push(`tl.fromTo('#shelf', { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, ${f(P[3].s)});`)
  const ni = word(3, 'ni')
  js.push(`tl.fromTo('#five-x', { scaleX: 0, rotation: -24 }, { scaleX: 1, rotation: -24, duration: 0.12, ease: 'power2.out' }, ${f(ni)});`)
  js.push(`tl.to('#five', { opacity: 0.35, duration: 0.15 }, ${f(ni + 0.08)});`)
  js.push(`tl.fromTo('#zero', { y: -120, opacity: 0, scale: 1.6 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'bounce.out' }, ${f(ni + 0.06)});`)
  js.push(`tl.fromTo('#niuna', { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: 'power4.out' }, ${f(ni)});`)
  shakeX('#shelf', ni + 0.05, 18, 9)
  js.push(`tl.fromTo('#tag', { rotation: 0 }, { rotation: 14, duration: 0.12, yoyo: true, repeat: 5, ease: 'sine.inOut' }, ${f(ni + 0.05)});`)
}
// E3 Drama: silencio. Burbuja de chat generica + "escribiendo…" + pregunta palabra por palabra
{
  const g = scene('drama', 'darker', `
    <div id="chat">
      <div class="chat-head"><div class="av">AG</div><div><div class="cn">Almacén Güemes</div><div class="cs" id="typing">escribiendo…</div></div></div>
      <div class="bubble" id="bubble">¿Mañana me llegan las 6 de aceite?<span class="hr">08:12</span></div>
    </div>
    <div class="ask">${P[4].words.map((w, i) => `<span class="aw" id="aw${i}">${i === 0 ? '¿' : ''}${esc(w.w)}${i === P[4].words.length - 1 ? '?' : ''}</span>`).join(' ')}</div>`)
  js.push(`tl.fromTo('#chat', { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, ${f(g.s)});`)
  js.push(`tl.fromTo('#typing', { opacity: 1 }, { opacity: 0.25, duration: 0.3, yoyo: true, repeat: ${Math.floor((g.e - g.s) / 0.3) - 1}, ease: 'sine.inOut' }, ${f(g.s + 0.2)});`)
  P[4].words.forEach((w, i) => js.push(`tl.fromTo('#aw${i}', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power3.out' }, ${f(w.s)});`))
  shakeX('#bubble', word(4, 'avisa'), 14, 9)
}
// E4 DROP: flash blanco, logo y "VASE MANAGEMENT"
{
  const g = scene('drop', 'dark', `
    <div class="ring" id="ring1"></div><div class="ring" id="ring2"></div>
    <img id="drop-logo" src="assets/img/vase-logo.png" alt="Vase" />
    <div id="drop-w1">VASE</div>
    <div id="drop-w2">MANAGEMENT</div>
    <div id="drop-white"></div>`)
  const mg = word(5, 'management')
  js.push(`tl.fromTo('#drop-white', { opacity: 1 }, { opacity: 0, duration: 0.3, ease: 'power2.out' }, ${g.s});`)
  js.push(`tl.fromTo('#drop-logo', { scale: 3.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'expo.out' }, ${g.s});`)
  js.push(`tl.fromTo('#ring1', { scale: 0.2, opacity: 1 }, { scale: 2.4, opacity: 0, duration: 0.6, ease: 'power2.out' }, ${g.s});`)
  js.push(`tl.fromTo('#ring2', { scale: 0.2, opacity: 1 }, { scale: 2.0, opacity: 0, duration: 0.6, ease: 'power2.out' }, ${f(mg)});`)
  js.push(`tl.fromTo('#drop-w1', { y: 120, opacity: 0, scaleX: 1.6 }, { y: 0, opacity: 1, scaleX: 1, duration: 0.3, ease: 'power4.out' }, ${f(g.s + 0.05)});`)
  js.push(`tl.fromTo('#drop-w2', { y: 120, opacity: 0, scaleX: 1.6 }, { y: 0, opacity: 1, scaleX: 1, duration: 0.3, ease: 'power4.out' }, ${f(mg)});`)
  js.push(`tl.to('#drop-logo', { scale: 1.12, duration: 0.1, yoyo: true, repeat: 1 }, ${f(Math.max(mg, g.s + 0.32))});`)
}
// E10 Remate: "Cargás una vez." chico; las cifras encajan en columna; "Y todo cierra." grande con tilde
{
  const vez = word(15, 'vez'), una = word(15, 'una'), cierra = word(16, 'cierra')
  const NUMS = [['Stock aceite', '18 u'], ['Venta', '$ 28.677'], ['Pedido web', '1043'], ['Por cobrar', '$ 1.284.500']]
  const g = scene('remate', 'light', `
    <div id="carg">Cargás <span id="una">una vez.</span></div>
    <div id="one">1</div>
    <div id="ledger">
      ${NUMS.map(([k, v], i) => `<div class="lrow" id="lr${i}"><span class="lk">${k}</span><span class="lv">${v}</span><span class="lok" id="lok${i}">✓</span></div>`).join('')}
      <div id="ledger-ok"></div>
    </div>
    <div id="cierra"><span id="ytodo">Y todo</span><br /><span id="cie">cierra.</span></div>
    <div id="bigcheck">✓</div>`)
  js.push(`tl.fromTo('#carg', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, ${f(g.s + 0.05)});`)
  js.push(`tl.fromTo('#one', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(3)' }, ${f(una)});`)
  js.push(`tl.to('#one', { scale: 0.6, opacity: 0, duration: 0.25 }, ${f(vez + 0.45)});`)
  js.push(`tl.fromTo('#ledger', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, ${f(vez + 0.2)});`)
  NUMS.forEach((_, i) => js.push(`tl.fromTo('#lr${i}', { x: ${i % 2 ? 700 : -700}, opacity: 0 }, { x: 0, opacity: 1, duration: 0.28, ease: 'power3.out' }, ${f(vez + 0.35 + i * 0.16)});`))
  NUMS.forEach((_, i) => js.push(`tl.fromTo('#lok${i}', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(3)' }, ${f(cierra + i * 0.05)});`))
  js.push(`tl.fromTo('#ledger-ok', { opacity: 0 }, { opacity: 1, duration: 0.2 }, ${f(cierra)});`)
  js.push(`tl.fromTo('#ytodo', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power3.out' }, ${f(P[16].s)});`)
  js.push(`tl.fromTo('#cie', { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: 'power4.out' }, ${f(cierra)});`)
  js.push(`tl.fromTo('#bigcheck', { scale: 0, opacity: 0, rotation: -30 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.35, ease: 'back.out(2.5)' }, ${f(cierra + 0.08)});`)
  shakeX('#remate', cierra, 12, 5)
}
// E11 CTA: logo + claim; WhatsApp y numero; vase.ar; rebote final en "¡Dale!" (todo queda hasta el final)
{
  const g = scene('cta', 'dark', `
    <img id="cta-logo" src="assets/img/vase-logo.png" alt="Vase" />
    <div id="cta-brand">Vase <span class="m">Management</span></div>
    <div id="cta-claim">Tu negocio,<br />en un solo lugar.</div>
    <div id="cta-l1"><svg class="wa" viewBox="0 0 32 32" width="64" height="64"><circle cx="16" cy="16" r="16" fill="#25d366"/><path d="M16 7.5a8.5 8.5 0 0 0-7.3 12.8L7.5 24.5l4.3-1.1A8.5 8.5 0 1 0 16 7.5z" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M12.6 12.2c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.5.9 1.4 1.8 2.4 2.3.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.4.2.4.4 0 .5-.2 1.2-.8 1.5-.6.3-1.4.4-3-.3-1.9-.8-3.3-2.6-3.8-3.5-.5-.9-.6-1.9-.1-2.7z" fill="#fff"/></svg>Escribinos por WhatsApp</div>
    <div id="cta-pill">${WHATSAPP}</div>
    <div id="cta-web">vase.ar</div>`)
  const dale = word(19, 'dale')
  js.push(`tl.fromTo('#cta-logo', { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(2)' }, ${g.s});`)
  js.push(`tl.fromTo('#cta-brand', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, ${f(word(17, 'management'))});`)
  js.push(`tl.fromTo('#cta-claim', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }, ${f(word(17, 'tu'))});`)
  js.push(`tl.fromTo('#cta-l1', { x: -900, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power4.out' }, ${f(P[18].s)});`)
  js.push(`tl.fromTo('#cta-pill', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.4)' }, ${f(word(18, 'whatsapp'))});`)
  js.push(`tl.fromTo('#cta-web', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, ${f(word(18, 'tu'))});`)
  js.push(`tl.to('#cta-pill', { scale: 1.12, duration: 0.12, yoyo: true, repeat: 3, ease: 'sine.inOut' }, ${f(dale)});`)
  js.push(`tl.to('#cta-logo', { y: -24, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' }, ${f(dale)});`)
}

// ---- 3. Subtitulos palabra por palabra (solo sobre los clips de Remotion)
const CAPTIONED = [6, 7, 8, 9, 10, 11, 12, 13, 14]
let cap = 0
for (const i of CAPTIONED) {
  const ws = P[i].words
  // si el texto tiene coma/puntos suspensivos despues de una palabra, el bloque se corta ahi
  const toks = P[i].text.split(/\s+/)
  const brk = ws.map((_, k) => toks.length === ws.length && /[,…:;]$/.test(toks[k]))
  // bloques cortos: hasta 3 palabras y 16 letras
  const chunks = []
  ws.forEach((w, k) => {
    const cur = chunks[chunks.length - 1]
    const len = cur ? cur.reduce((a, x) => a + x.w.length + 1, 0) : 0
    if (!cur || cur.length >= 3 || len + w.w.length > 16 || (k > 0 && brk[k - 1])) chunks.push([w])
    else cur.push(w)
  })
  const nextStart = (P[i + 1]?.s ?? END) - 0.02
  chunks.forEach((ch, ci) => {
    const s = ch[0].s
    const e = ci + 1 < chunks.length ? chunks[ci + 1][0].s : Math.min(P[i].e + 0.3, nextStart)
    const id = `cap${cap++}`
    html.push(`<div id="${id}" class="clip caption" data-start="${f(s)}" data-duration="${f(Math.max(0.1, e - s))}" data-track-index="3" style="z-index:500">${ch.map((w, k) => `<span id="${id}w${k}" class="w">${esc(w.w)}</span>`).join(' ')}</div>`)
    js.push(`tl.fromTo('#${id}', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.14, ease: 'power3.out' }, ${f(s)});`)
    ch.forEach((w, k) => js.push(`tl.set('#${id}w${k}', { color: '${MINT}' }, ${f(w.s)}); tl.set('#${id}w${k}', { color: '#ffffff' }, ${f(Math.min(w.e, e - 0.01))});`))
  })
}

// ---- 4. Destello en cada corte
SEGMENTS.slice(1).forEach((g, i) => {
  html.push(`<div id="flash${i}" class="clip flash" data-start="${f(g.s - 0.04)}" data-duration="0.22" data-track-index="4" style="z-index:900"></div>`)
  js.push(`tl.fromTo('#flash${i}', { opacity: 0.5 }, { opacity: 0, duration: 0.2, ease: 'power2.out' }, ${f(g.s - 0.04)});`)
})

const page = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,600;1,6..72,500;1,6..72,600&family=IBM+Plex+Mono:wght@500;600&display=block');
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: #0d1118; }
#root { position: relative; width: 1080px; height: 1920px; overflow: hidden; font-family: 'Manrope', system-ui, sans-serif; color: #fff; }
.clip { position: absolute; inset: 0; }
.media { width: 1080px; height: 1920px; object-fit: cover; }
.scene { overflow: hidden; }
.dark { background: radial-gradient(900px 800px at 30% 15%, rgba(79,224,168,0.16), transparent 70%), radial-gradient(800px 700px at 90% 90%, rgba(0,107,67,0.30), transparent 70%), #0d1118; }
.darker { background: radial-gradient(800px 700px at 50% 40%, rgba(255,77,79,0.08), transparent 70%), #07090d; }
.light { background: linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px) 0 0 / 56px 56px, linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px) 0 0 / 56px 56px, radial-gradient(900px 700px at 20% 0%, rgba(0,107,67,0.12), transparent 70%), #f6f8fb; color: #0f172a; }
.m { color: ${MINT}; }
.serif { font-family: 'Newsreader', Georgia, serif; }
/* E1 */
.hook-text { position: absolute; top: 420px; left: 70px; right: 70px; text-align: center; font-weight: 800; font-size: 132px; line-height: 1.02; letter-spacing: -4px; }
.hw { display: inline-block; margin: 0 6px; }
#hw4 { font-family: 'Newsreader', Georgia, serif; font-style: italic; font-weight: 600; letter-spacing: -2px; color: ${MINT}; }
#stamp-wrap { position: absolute; top: 1020px; left: 0; right: 0; text-align: center; transform: rotate(-8deg); }
#stamp { display: inline-block; padding: 14px 54px; border: 14px solid #ff4d4f; border-radius: 34px; color: #ff4d4f; font-size: 168px; font-weight: 800; letter-spacing: 4px; line-height: 1.05; background: rgba(13,17,24,0.6); box-shadow: 0 0 80px rgba(255,77,79,0.35); }
/* E2 */
.kicker { position: absolute; left: 70px; right: 70px; font-family: 'Newsreader', Georgia, serif; font-style: italic; font-size: 70px; font-weight: 500; color: #cfe9dc; }
#k1 { top: 200px; } #k2 { top: 860px; }
.sheet { position: absolute; top: 320px; left: 60px; right: 60px; background: #fff; border-radius: 22px; overflow: hidden; color: #0f172a; box-shadow: 0 40px 100px rgba(0,0,0,0.55); }
.srow { display: flex; height: 100px; border-top: 2px solid #d4dde6; font-size: 40px; font-weight: 700; }
.srow.head { height: 56px; background: #eef2f6; font-size: 28px; color: #64748b; border-top: 0; }
.srow.th { background: #e2f1e8; color: #1e5a3c; }
.c { display: flex; align-items: center; padding: 0 22px; border-right: 2px solid #d4dde6; }
.c.n { width: 70px; justify-content: center; background: #eef2f6; color: #64748b; font-size: 28px; padding: 0; }
.c.a { flex: 1; }
.c.b { width: 250px; position: relative; justify-content: center; border-right: 0; }
.c.b.sel { box-shadow: inset 0 0 0 5px #16a34a; font-size: 66px; font-weight: 800; }
#five { display: inline-block; }
#five-x { position: absolute; left: 70px; right: 120px; top: 47px; height: 9px; border-radius: 5px; background: #ff4d4f; transform-origin: left center; }
#zero { display: inline-block; margin-left: 46px; color: #ff4d4f; opacity: 0; }
#shelf { position: absolute; top: 980px; left: 150px; width: 780px; height: 400px; }
.post { position: absolute; top: 0; bottom: 0; width: 26px; border-radius: 8px; background: #3a4452; }
.post.l { left: 0; } .post.r { right: 0; }
.plank { position: absolute; left: -20px; right: -20px; height: 34px; border-radius: 8px; background: linear-gradient(#b98a5a, #8c6239); box-shadow: 0 14px 30px rgba(0,0,0,0.5); }
.p1 { top: 150px; } .p2 { top: 350px; }
.tag { position: absolute; top: 184px; left: 280px; padding: 10px 24px; border-radius: 10px; background: #fef08a; color: #0f172a; font-size: 32px; font-weight: 800; transform-origin: 50% 0; }
.dust { position: absolute; top: 60px; left: 0; right: 0; text-align: center; font-family: 'Newsreader', Georgia, serif; font-style: italic; font-size: 54px; color: rgba(255,255,255,0.25); }
#niuna { position: absolute; top: 1420px; left: 0; right: 0; text-align: center; font-size: 150px; font-weight: 800; letter-spacing: -5px; color: #ff4d4f; }
/* E3 */
#chat { position: absolute; top: 330px; left: 90px; right: 90px; padding: 34px; border-radius: 40px; background: #161c25; border: 2px solid #252c36; box-shadow: 0 40px 100px rgba(0,0,0,0.6); }
.chat-head { display: flex; align-items: center; gap: 24px; padding-bottom: 26px; border-bottom: 2px solid #252c36; margin-bottom: 30px; }
.av { width: 90px; height: 90px; border-radius: 45px; background: #f59e0b; color: #0d1118; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 36px; }
.cn { font-size: 42px; font-weight: 800; }
.cs { font-size: 32px; font-weight: 600; color: ${MINT}; }
.bubble { display: inline-block; max-width: 92%; padding: 28px 34px; border-radius: 34px; border-bottom-left-radius: 10px; background: #fff; color: #0f172a; font-size: 46px; font-weight: 700; line-height: 1.25; }
.bubble .hr { display: block; text-align: right; font-size: 26px; color: #64748b; margin-top: 6px; }
.ask { position: absolute; top: 900px; left: 60px; right: 60px; text-align: center; font-size: 128px; font-weight: 800; line-height: 1.02; letter-spacing: -4px; }
.aw { display: inline-block; margin: 0 8px; }
#aw4 { color: #ff4d4f; }
/* E4 */
.ring { position: absolute; left: 240px; top: 420px; width: 600px; height: 600px; border-radius: 50%; border: 10px solid ${MINT}; }
#drop-logo { position: absolute; left: 380px; top: 560px; width: 320px; filter: invert(1) brightness(2); }
#drop-w1 { position: absolute; top: 1090px; left: 0; right: 0; text-align: center; font-size: 190px; font-weight: 800; letter-spacing: 6px; line-height: 1; }
#drop-w2 { position: absolute; top: 1290px; left: 0; right: 0; text-align: center; font-size: 118px; font-weight: 800; letter-spacing: 2px; line-height: 1; color: ${MINT}; }
#drop-white { position: absolute; inset: 0; background: #ffffff; }
/* E10 */
#carg { position: absolute; top: 200px; left: 0; right: 0; text-align: center; font-family: 'Newsreader', Georgia, serif; font-size: 96px; font-weight: 600; color: #334155; }
#una { font-style: italic; color: #006b43; }
#one { position: absolute; top: 330px; left: 470px; width: 140px; height: 140px; border-radius: 70px; background: #006b43; color: #fff; font-size: 92px; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 16px rgba(79,224,168,0.35); }
#ledger { position: absolute; top: 500px; left: 110px; right: 110px; padding: 20px 40px; border-radius: 34px; overflow: hidden; background: #fff; box-shadow: 0 40px 90px -30px rgba(15,23,42,0.45), 0 0 0 2px rgba(15,23,42,0.06); }
.lrow { display: flex; align-items: center; height: 108px; border-bottom: 2px dashed #d4dde6; }
.lrow:last-of-type { border-bottom: 0; }
.lk { flex: 1; font-size: 36px; font-weight: 700; color: #64748b; }
.lv { font-family: 'IBM Plex Mono', monospace; font-size: 54px; font-weight: 600; color: #0f172a; }
.lok { margin-left: 24px; width: 54px; height: 54px; border-radius: 27px; background: #16a34a; color: #fff; font-size: 34px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
#ledger-ok { position: absolute; inset: 0; border-radius: 34px; border: 6px solid #16a34a; box-shadow: 0 0 60px rgba(22,163,74,0.35); }
#cierra { position: absolute; top: 1050px; left: 0; right: 0; text-align: center; font-size: 160px; font-weight: 800; letter-spacing: -6px; line-height: 0.98; color: #0f172a; }
#cie { display: inline-block; color: #006b43; }
#bigcheck { position: absolute; top: 1430px; left: 465px; width: 150px; height: 150px; border-radius: 75px; background: #16a34a; color: #fff; font-size: 100px; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 20px 60px rgba(22,163,74,0.5); }
/* E11 */
#cta-logo { position: absolute; left: 460px; top: 260px; width: 160px; filter: invert(1) brightness(2); }
#cta-brand { position: absolute; top: 460px; left: 0; right: 0; text-align: center; font-size: 92px; font-weight: 800; letter-spacing: -3px; }
#cta-claim { position: absolute; top: 600px; left: 90px; right: 90px; text-align: center; font-family: 'Newsreader', Georgia, serif; font-style: italic; font-size: 84px; font-weight: 500; line-height: 1.1; color: #e6efe9; }
#cta-l1 { position: absolute; top: 900px; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 22px; font-size: 62px; font-weight: 800; }
#cta-pill { position: absolute; left: 100px; width: 880px; top: 1030px; padding: 40px 0; border-radius: 999px; background: ${MINT}; color: #0d1118; text-align: center; font-size: 72px; font-weight: 800; letter-spacing: -1px; box-shadow: 0 0 90px rgba(79,224,168,0.45); }
#cta-web { position: absolute; top: 1250px; left: 0; right: 0; text-align: center; font-size: 76px; font-weight: 800; color: #fff; }
/* subtitulos */
.caption { inset: auto 60px auto 60px; top: 1330px; text-align: center; font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 86px; line-height: 1.08; letter-spacing: -1px; color: #fff; text-shadow: 0 6px 0 #0d1118, 0 0 30px rgba(0,0,0,0.85); }
.caption .w { display: inline-block; margin: 0 0.16em; }
.flash { background: #ffffff; opacity: 0; pointer-events: none; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${END}" data-width="1080" data-height="1920">
<audio id="mix" src="assets/audio/mezcla.wav" data-start="0" data-duration="${END}" data-track-index="0" data-has-audio="true"></audio>
${html.join('\n')}
</div>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
${js.join('\n')}
tl.set({}, {}, ${END});
window.__timelines['main'] = tl;
tl.seek(0);
</script>
</body>
</html>
`
writeFileSync(`${root}index.html`, page)
writeFileSync(`${root}meta.json`, JSON.stringify({ id: 'vase-management-reel', name: 'Vase Management Reel' }, null, 2))
console.log('index.html listo ·', SEGMENTS.length, 'segmentos ·', cap, 'subtitulos ·', END, 's')
