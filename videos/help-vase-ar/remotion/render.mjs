// Renderiza los videos de help.vase.ar y los deja donde los sirve la web:
//   apps/vase-help/public/videos/<slug>.mp4  y  <slug>.jpg (portada)
// Uso: npm run render            → todos
//      npm run render -- <slug>  → solo esa guía
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const ALL = ['cambiar-precio-o-stock', 'crear-una-oferta', 'subir-precios-de-un-rubro', 'por-que-volvio-a-cambiar-un-precio'];
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const out = path.resolve('../../../apps/vase-help/public/videos');
mkdirSync(out, { recursive: true });

const run = (args) => execFileSync('npx', ['remotion', ...args, '--log=error'], { stdio: 'inherit' });
for (const id of ids) {
  console.log(`→ ${id}`);
  run(['render', 'src/index.ts', id, path.join(out, `${id}.mp4`), '--codec=h264', '--crf=26', '--overwrite']);
  run(['still', 'src/index.ts', id, path.join(out, `${id}.jpg`), '--frame=40', '--image-format=jpeg', '--jpeg-quality=82', '--overwrite']);
}
