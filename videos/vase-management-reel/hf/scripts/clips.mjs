// Renderiza los clips de interfaz de Remotion con la duracion exacta de cada tramo de voz.
// Uso: node scripts/clips.mjs   (desde hf/)
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { SEGMENTS, FPS } from './segmentos.mjs'

const RM = new URL('../../remotion/', import.meta.url).pathname
const OUT = new URL('../assets/clips/', import.meta.url).pathname
const only = process.argv.slice(2)
const bundle = `${RM}build`
execFileSync('npx', ['remotion', 'bundle', '--out-dir=build', '--log=error'], { cwd: RM, stdio: 'inherit' })
for (const g of SEGMENTS.filter((x) => x.kind === 'clip' && (!only.length || only.includes(x.id)))) {
  const dur = Math.round((g.e - g.s) * FPS)
  const props = JSON.stringify({ dur, ev: g.evf })
  console.log(`${g.id}: ${dur} cuadros`, g.evf)
  execFileSync('npx', ['remotion', 'render', 'build', g.id, `${OUT}${g.id}.mp4`, `--props=${props}`, '--codec=h264', '--crf=16', '--concurrency=2', '--timeout=120000', '--log=error'], { cwd: RM, stdio: 'inherit' })
}
