# Reel Vase Management (voz + beat RKT)

~45 s · 1080x1920 · 30 fps. HyperFrames hace el montaje (cortes, subtítulos palabra por palabra, escenas tipográficas, audio);
Remotion renderiza las pantallas de la app (E5–E9) como clips. Todo se sincroniza con los tiempos reales de la voz.
Guion, escenas y respaldo de funciones en `guion/`.

Identidad: la de `apps/vase-management` (tinta azulada `#0d1118`, esmeralda `#006b43`, menta `#4fe0a8`, pizarra `#f6f8fb`;
Manrope + Newsreader + IBM Plex Mono). Labs usa carbón/jade/salvia con Space Grotesk.

## Orden para regenerar

1. **Voz** (Daniela, Piper; `say` = cómo se pronuncia, `t` = lo que se ve). Guion en `hf/assets/vo/guion.json`.
   Hay que correrlo con cwd = `voz-tts`:
   ```
   cd ~/Documents/SPOT-videos/voz-tts && LEN=1.05 PYTHONPATH=. ./venv/bin/python <ruta>/hf/scripts/voz.py <ruta>/hf ~/Documents/SPOT-videos/tools/bin/ffmpeg
   rm -f f.wav g.wav
   ```
   Genera `hf/assets/vo/voz.wav` y `timing.json`. Si cambia la voz, hay que rehacer todo lo que sigue.
2. **Línea de tiempo**: `hf/scripts/segmentos.mjs` (escenas E1–E11 y palabras que disparan cada animación). No se corre solo; lo importan los demás.
3. **Clips de Remotion** (desde `hf/`): `node scripts/clips.mjs` (o `node scripts/clips.mjs Venta` para uno solo).
   Necesita `remotion/node_modules` (`npm i` en `remotion/`). Si no hay red para bajar Chrome Headless, se puede copiar
   `node_modules/.remotion/chrome-headless-shell` de otro proyecto Remotion 4.0.534.
4. **Música + mezcla**: `node scripts/musica.mjs` → `hf/assets/audio/mezcla.wav`
5. **Composición**: `node scripts/build.mjs` → `hf/index.html`
6. **Lint y render** (desde `hf/`):
   ```
   export PATH="$HOME/Documents/SPOT-videos/tools/bin:$PATH" HYPERFRAMES_SKIP_SKILLS=1
   npx -y hyperframes@0.8.143 lint .
   npx -y hyperframes@0.8.143 render -o renders/vase-management-reel.mp4 --fps 30
   cp renders/vase-management-reel.mp4 ../vase-management-reel.mp4
   ```
7. **Portada** (desde `remotion/`): `npx remotion still src/index.ts Portada ../portada-vase-management.png --timeout=120000`

En una Mac lenta, los renders de Remotion necesitan `--timeout=120000` (ya lo pasa `clips.mjs`).
