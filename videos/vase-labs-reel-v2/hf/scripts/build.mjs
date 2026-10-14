// Genera index.html (composicion HyperFrames) a partir de la voz y los segmentos.
// Montaje: clips de Remotion + escenas tipograficas propias + subtitulos palabra por palabra + mezcla de audio.
// Uso: node scripts/build.mjs
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { END, PHRASES as P, SEGMENTS } from './segmentos.mjs'

const root = new URL('../', import.meta.url).pathname
mkdirSync(`${root}assets/img`, { recursive: true })
const logoSrc = `${root}../remotion/public/vase-logo.png`
if (existsSync(logoSrc)) copyFileSync(logoSrc, `${root}assets/img/vase-logo.png`)

const seg = (id) => SEGMENTS.find((g) => g.id === id)
const f = (n) => +n.toFixed(3)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const WHATSAPP = '+54 9 223 449-6403'

const html = []
const js = []
let z = 1

// ---- 1. Clips de Remotion
for (const g of SEGMENTS.filter((x) => x.kind === 'clip')) {
  const id = `clip-${g.id}`
  html.push(`<video id="${id}" class="clip media" src="assets/clips/${g.id}.mp4" muted playsinline data-start="${g.s}" data-duration="${f(g.e - g.s)}" data-track-index="1" style="z-index:${z++}"></video>`)
  js.push(`tl.fromTo('#${id}', { scale: 1.14, filter: 'brightness(1.8)' }, { scale: 1, filter: 'brightness(1)', duration: 0.38, ease: 'power3.out' }, ${g.s});`)
}

// ---- 2. Escenas propias
// "¿Quien le contesta?": silencio, negro y palabras gigantes
{
  const g = seg('quien')
  const words = P[4].words
  html.push(`<div id="quien" class="clip scene dark" data-start="${g.s}" data-duration="${f(g.e - g.s)}" data-track-index="2" style="z-index:${z++}">
    <div class="quien-stack">${words.map((w, i) => `<div class="qw" id="qw${i}">${i === 0 ? '¿' : ''}${esc(w.w.toUpperCase())}${i === words.length - 1 ? '?' : ''}</div>`).join('')}</div>
  </div>`)
  words.forEach((w, i) => js.push(`tl.fromTo('#qw${i}', { scale: 2.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: 'power4.out' }, ${f(w.s)});`))
  js.push(`tl.to('#quien .quien-stack', { x: 14, duration: 0.04, yoyo: true, repeat: 7 }, ${f(g.e - 0.4)});`)
}
// Logo: golpe del drop
{
  const g = seg('logo')
  html.push(`<div id="logo" class="clip scene dark" data-start="${g.s}" data-duration="${f(g.e - g.s)}" data-track-index="2" style="z-index:${z++}">
    <div class="ring" id="ring1"></div><div class="ring" id="ring2"></div>
    <img id="logo-img" src="assets/img/vase-logo.png" alt="Vase" />
    <div id="logo-word">VASE <span class="g">LABS</span></div>
  </div>`)
  js.push(`tl.fromTo('#logo', { backgroundColor: '#ffffff' }, { backgroundColor: '#000202', duration: 0.25 }, ${g.s});`)
  js.push(`tl.fromTo('#logo-img', { scale: 3.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'expo.out' }, ${g.s});`)
  js.push(`tl.fromTo('#ring1', { scale: 0.2, opacity: 1 }, { scale: 2.4, opacity: 0, duration: 0.6, ease: 'power2.out' }, ${g.s});`)
  js.push(`tl.fromTo('#ring2', { scale: 0.2, opacity: 1 }, { scale: 2.0, opacity: 0, duration: 0.6, ease: 'power2.out' }, ${f(g.s + 0.12)});`)
  js.push(`tl.fromTo('#logo-word', { y: 120, opacity: 0, scaleX: 1.6 }, { y: 0, opacity: 1, scaleX: 1, duration: 0.35, ease: 'power4.out' }, ${f(g.s + 0.08)});`)
}
// "Vos dormis. Tu negocio vende."
{
  const g = seg('duerme')
  const t1 = P[15].s
  html.push(`<div id="duerme" class="clip scene" data-start="${g.s}" data-duration="${f(g.e - g.s)}" data-track-index="2" style="z-index:${z++}">
    <div id="night"><div class="moon"></div><div class="zzz" id="zzz">z z z</div><div class="big" id="dormis">VOS DORMÍS.</div></div>
    <div id="day"><div class="sales-label">Ventas de esta noche</div><div class="sales" id="sales">$ 0</div><div class="big dark-text" id="vende">TU NEGOCIO <span class="j">VENDE.</span></div></div>
  </div>`)
  js.push(`tl.fromTo('#dormis', { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' }, ${f(P[14].s)});`)
  js.push(`tl.fromTo('#zzz', { y: 30, opacity: 0 }, { y: -30, opacity: 1, duration: 0.8, ease: 'sine.out' }, ${f(g.s + 0.1)});`)
  js.push(`tl.fromTo('#day', { height: '0%' }, { height: '58%', duration: 0.3, ease: 'expo.out' }, ${f(t1 - 0.05)});`)
  js.push(`tl.fromTo('#vende', { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2)' }, ${f(t1)});`)
  js.push(`{ const o = { v: 0 }; tl.to(o, { v: 1284500, duration: ${f(g.e - t1)}, ease: 'power2.out', onUpdate: () => { document.getElementById('sales').textContent = '$ ' + Math.round(o.v).toLocaleString('es-AR'); } }, ${f(t1)}); }`)
}
// CTA
{
  const g = seg('cta')
  const dale = P[18].s
  html.push(`<div id="cta" class="clip scene dark" data-start="${g.s}" data-duration="${f(g.e - g.s)}" data-track-index="2" style="z-index:${z++}">
    <img id="cta-logo" src="assets/img/vase-logo.png" alt="Vase" />
    <div id="cta-brand">Vase <span class="g">Labs</span></div>
    <div id="cta-claim" class="big">ATENCIÓN CON IA<br /><span class="g">PARA TU NEGOCIO</span></div>
    <div id="cta-l1" class="big">ESCRIBINOS</div>
    <div id="cta-l2" class="big g">Y PROBALA.</div>
    <div id="cta-pill"><small>CONSULTANOS POR WHATSAPP</small>${WHATSAPP}</div>
    <div id="cta-web">vase.ar</div>
  </div>`)
  js.push(`tl.fromTo('#cta-logo', { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(2)' }, ${g.s});`)
  js.push(`tl.fromTo('#cta-brand', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, ${f(g.s + 0.1)});`)
  { const w = P[16].words, at = (k) => f(w.find((x) => x.w.toLowerCase().startsWith(k))?.s ?? g.s + 1)
    js.push(`tl.fromTo('#cta-claim', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' }, ${at('atenci')});`)
    js.push(`tl.to('#cta-claim', { y: -60, opacity: 0, duration: 0.25, ease: 'power2.in' }, ${f(P[17].s - 0.25)});`) }
  js.push(`tl.fromTo('#cta-l1', { x: -900, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power4.out' }, ${f(P[17].words[0].s)});`)
  js.push(`tl.fromTo('#cta-l2', { x: 900, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power4.out' }, ${f(P[17].words[2]?.s ?? P[17].s + 0.4)});`)
  js.push(`tl.fromTo('#cta-pill', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.4)' }, ${f(dale)});`)
  js.push(`tl.to('#cta-pill', { scale: 1.06, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: ${Math.max(1, Math.floor((g.e - dale - 0.4) / 0.3) | 1)} }, ${f(dale + 0.4)});`)
  js.push(`tl.fromTo('#cta-web', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, ${f(dale + 0.15)});`)
}

// ---- 3. Subtitulos palabra por palabra (solo sobre los clips; las escenas propias ya son tipografia)
const CAPTIONED = [0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13]
let cap = 0
for (const i of CAPTIONED) {
  const ws = P[i].words
  // bloques cortos: hasta 3 palabras y ~16 letras, para que entren en una o dos lineas
  const chunks = []
  for (const w of ws) {
    const cur = chunks[chunks.length - 1]
    const len = cur ? cur.reduce((a, x) => a + x.w.length + 1, 0) : 0
    if (!cur || cur.length >= 3 || len + w.w.length > 16) chunks.push([w])
    else cur.push(w)
  }
  const nextStart = (P[i + 1]?.s ?? END) - 0.02
  chunks.forEach((ch, ci) => {
    const s = ch[0].s
    const e = ci + 1 < chunks.length ? chunks[ci + 1][0].s : Math.min(P[i].e + 0.25, nextStart)
    const id = `cap${cap++}`
    html.push(`<div id="${id}" class="clip caption" data-start="${f(s)}" data-duration="${f(Math.max(0.1, e - s))}" data-track-index="3" style="z-index:500">${ch.map((w, k) => `<span id="${id}w${k}" class="w">${esc(w.w)}</span>`).join(' ')}</div>`)
    js.push(`tl.fromTo('#${id}', { scale: 0.7, y: 30 }, { scale: 1, y: 0, duration: 0.16, ease: 'back.out(3)' }, ${f(s)});`)
    ch.forEach((w, k) => js.push(`tl.set('#${id}w${k}', { color: '#a8e6a9' }, ${f(w.s)}); tl.set('#${id}w${k}', { color: '#ffffff' }, ${f(Math.min(w.e, e - 0.01))});`))
  })
}

// ---- 4. Destello en cada corte
SEGMENTS.slice(1).forEach((g, i) => {
  html.push(`<div id="flash${i}" class="clip flash" data-start="${f(g.s - 0.04)}" data-duration="0.22" data-track-index="4" style="z-index:900"></div>`)
  js.push(`tl.fromTo('#flash${i}', { opacity: 0.55 }, { opacity: 0, duration: 0.2, ease: 'power2.out' }, ${f(g.s - 0.04)});`)
})

const page = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@500;700&display=block');
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: #000202; }
#root { position: relative; width: 1080px; height: 1920px; overflow: hidden; font-family: 'Space Grotesk', system-ui, sans-serif; color: #fff; }
.clip { position: absolute; inset: 0; }
.media { width: 1080px; height: 1920px; object-fit: cover; }
.scene { background: #000202; }
.g { color: #a8e6a9; } .j { color: #3b633d; }
.big { font-family: 'Archivo Black', sans-serif; font-size: 118px; line-height: 0.95; letter-spacing: -3px; text-align: center; }
.quien-stack { position: absolute; inset: auto 0 auto 0; top: 600px; text-align: center; }
.qw { font-family: 'Archivo Black', sans-serif; font-size: 150px; line-height: 0.95; letter-spacing: -6px; }
.qw:last-child { color: #a8e6a9; }
.ring { position: absolute; inset: auto; left: 240px; top: 460px; width: 600px; height: 600px; border-radius: 50%; border: 10px solid #a8e6a9; }
#logo-img { position: absolute; inset: auto; left: 370px; top: 600px; width: 340px; filter: invert(1) brightness(2); }
#logo-word { position: absolute; inset: auto 0 auto 0; top: 1130px; text-align: center; font-family: 'Archivo Black', sans-serif; font-size: 150px; letter-spacing: -4px; }
#night { position: absolute; inset: 0; background: linear-gradient(#050a1c, #0b1430); }
#night .moon { position: absolute; top: 170px; right: 160px; width: 160px; height: 160px; border-radius: 50%; box-shadow: inset -40px -12px 0 0 #f4f1d0; transform: rotate(-20deg); }
#zzz { position: absolute; top: 380px; left: 0; right: 0; text-align: center; font-size: 70px; color: #8ea0c8; font-weight: 700; letter-spacing: 20px; }
#dormis { position: absolute; top: 520px; left: 0; right: 0; }
#day { position: absolute; left: 0; right: 0; bottom: 0; height: 0%; overflow: hidden; background: #a8e6a9; color: #000202; }
#day .sales-label { position: absolute; top: 90px; left: 0; right: 0; text-align: center; font-size: 40px; font-weight: 700; color: #3b633d; }
#sales { position: absolute; top: 150px; left: 0; right: 0; text-align: center; font-family: 'Archivo Black', sans-serif; font-size: 140px; letter-spacing: -4px; }
#vende { position: absolute; top: 400px; left: 0; right: 0; }
.dark-text { color: #000202; }
#cta-logo { position: absolute; inset: auto; left: 450px; top: 200px; width: 180px; filter: invert(1) brightness(2); }
#cta-brand { position: absolute; inset: auto 0 auto 0; top: 420px; text-align: center; font-size: 84px; font-weight: 700; letter-spacing: -2px; }
#cta-claim { position: absolute; inset: auto 0 auto 0; top: 690px; font-size: 100px; }
#cta-l1 { position: absolute; inset: auto 0 auto 0; top: 690px; }
#cta-l2 { position: absolute; inset: auto 0 auto 0; top: 810px; }
#cta-pill { position: absolute; inset: auto; left: 110px; width: 860px; top: 1030px; padding: 36px 0; border-radius: 999px; background: #a8e6a9; color: #000202; text-align: center; font-size: 62px; font-weight: 700; box-shadow: 0 0 80px rgba(168,230,169,0.45); }
#cta-pill small { display: block; font-size: 28px; letter-spacing: 5px; margin-bottom: 4px; }
#cta-web { position: absolute; inset: auto 0 auto 0; top: 1250px; text-align: center; font-size: 56px; font-weight: 700; }
.caption { inset: auto 60px auto 60px; top: 1330px; text-align: center; font-family: 'Archivo Black', sans-serif; font-size: 84px; line-height: 1.05; letter-spacing: -1px; color: #fff; text-shadow: 0 6px 0 #000202, 0 0 30px rgba(0,0,0,0.85); }
.caption .w { display: inline-block; margin: 0 0.14em; }
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
writeFileSync(`${root}meta.json`, JSON.stringify({ id: 'vase-labs-reel-v2', name: 'Vase Labs Reel v2' }, null, 2))
console.log('index.html listo ·', SEGMENTS.length, 'segmentos ·', cap, 'subtitulos ·', END, 's')
