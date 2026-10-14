# Reel Vase Labs v2 (voz + beat RKT)

46 s · 1080x1920 · 30 fps. HyperFrames hace el montaje (cortes, subtítulos palabra por palabra, escenas tipográficas, audio);
Remotion renderiza las pantallas de la app como clips. Todo se sincroniza con los tiempos reales de la voz.

Orden para regenerar (desde `hf/`):
1. Voz (Daniela, Piper): `cd ~/Documents/SPOT-videos/voz-tts && PYTHONPATH=. ./venv/bin/python <ruta>/hf/scripts/voz.py <ruta>/hf ~/Documents/SPOT-videos/tools/bin/ffmpeg`
   Guion en `hf/assets/vo/guion.json` (`say` = cómo se pronuncia, `t` = lo que se ve).
2. Clips de Remotion: `node scripts/clips.mjs`
3. Música + mezcla: `node scripts/musica.mjs`
4. Composición: `node scripts/build.mjs`
5. Render: `PATH="$HOME/Documents/SPOT-videos/tools/bin:$PATH" npx hyperframes@0.8.143 render -o renders/vase-labs-reel-v2.mp4`
