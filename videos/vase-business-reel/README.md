# Reel Vase Business

Reel vertical 1080x1920, 30 fps, ~34 s. Remotion arma las escenas; HyperFrames hace el cierre (CTA).

- Previsualizar: `cd remotion && npm run studio`
- Renderizar: `cd remotion && npm run render` → `remotion/out/vase-business-reel.mp4`
- Cierre HyperFrames: `cd hyperframes && npm run render` → genera `remotion/public/cta-hyperframes.mp4`
  (si ese archivo no existe, el reel usa el cierre hecho en Remotion).
- Música: dejá `remotion/public/music.mp3` y volvé a renderizar.
