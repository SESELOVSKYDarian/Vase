// Renderiza los videos de help.vase.ar y los deja donde los sirve la web:
//   apps/vase-help/public/videos/<slug>.mp4 / .jpg              (tema oscuro)
//   apps/vase-help/public/videos/<slug>-claro.mp4 / -claro.jpg  (tema claro)
// Uso: npm run render                         → todos, los dos temas
//      npm run render -- <slug>               → esa guía, los dos temas
//      npm run render -- --theme=light <slug> → solo un tema
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const ALL = ['cambiar-precio-o-stock', 'crear-una-oferta', 'subir-precios-de-un-rubro', 'por-que-volvio-a-cambiar-un-precio'];
const args = process.argv.slice(2);
const themeArg = args.find((arg) => arg.startsWith('--theme='));
const themes = themeArg ? [themeArg.split('=')[1]] : ['dark', 'light'];
const picked = args.filter((arg) => !arg.startsWith('--'));
const ids = picked.length ? picked : ALL;
const out = path.resolve('../../../apps/vase-help/public/videos');
mkdirSync(out, { recursive: true });

const run = (list) => execFileSync('npx', ['remotion', ...list, '--log=error'], { stdio: 'inherit' });
for (const theme of themes) {
  const suffix = theme === 'light' ? '-claro' : '';
  const props = `--props=${JSON.stringify({ theme })}`;
  for (const id of ids) {
    console.log(`→ ${id}${suffix}`);
    run(['render', 'src/index.ts', id, path.join(out, `${id}${suffix}.mp4`), '--codec=h264', '--crf=26', '--overwrite', props]);
    run(['still', 'src/index.ts', id, path.join(out, `${id}${suffix}.jpg`), '--frame=40', '--image-format=jpeg', '--jpeg-quality=82', '--overwrite', props]);
  }
}
