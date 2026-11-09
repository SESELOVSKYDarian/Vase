# Videos de help.vase.ar

Videos cortos (1920×1080, 30 fps) de cada guía de ayuda de Vase Business. Están hechos en Remotion
con una réplica del panel nuevo en tema oscuro (`src/kit.tsx`), así que se pueden rehacer cuando
cambie el panel, sin grabar pantalla.

- Ver y ajustar: `npm run studio`
- Renderizar todos: `npm run render` → `apps/vase-help/public/videos/<slug>.mp4` (oscuro) y `<slug>-claro.mp4` (claro), cada uno con su `.jpg` de portada
- Solo un tema: `npm run render -- --theme=light`
- Renderizar uno: `npm run render -- crear-una-oferta`

El id de cada composición es el slug de la guía en `apps/vase-help/lib/guides.ts`.
`node_modules` es un enlace a `../../vase-business-reel/remotion/node_modules`; si no existe,
corré `npm install` acá.

Para sumar una guía: copiá una de `src/` (por ejemplo `CrearOferta.tsx`), registrala en `src/Root.tsx`
y en `ALL` de `render.mjs`, renderizala y poné `status: "listo"` y `video` en la guía.
