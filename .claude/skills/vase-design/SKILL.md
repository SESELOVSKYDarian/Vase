---
name: vase-design
description: Sistema de diseño y estructura de producto de Vase (business, rest, help, app, labs, management). Usar SIEMPRE antes de crear o rediseñar una pantalla, panel, landing, componente o app de Vase; al portar una app al diseño nuevo ("que se vea como Business", "rediseño", "mismo estilo que el panel"); al elegir colores, tipografía, íconos, textos de interfaz, modo claro/oscuro o layout de celular; y al revisar si algo respeta la marca. Cubre tokens claro/oscuro, anatomía del panel (menú lateral + barra superior), sitio público, componentes con sus clases, textos en voseo y checklist de calidad.
---

# Vase · diseño y estructura

Vase es una plataforma SaaS modular para pymes argentinas: cada producto es una app separada del monorepo
(`apps/*`) con su dominio. **Todas comparten un mismo sistema visual**: el del panel nuevo de Vase Business.
Si una pantalla de Vase no se ve como ese panel, está mal.

> Frase guía: *Moderniza tu negocio sin complejidad.* Claro, calmo, premium, sin ruido.

## Fuentes canónicas (leer antes de diseñar)

| Qué | Archivo | Para qué |
| --- | --- | --- |
| Panel de Business (la referencia) | `apps/vase-editor/web/src/panel/panel.css` | Tokens y todas las clases `vp-*` |
| Armazón del panel | `apps/vase-editor/web/src/panel/components/Shell.jsx` | Menú lateral, barra superior, ayuda |
| Estructura de secciones | `apps/vase-editor/web/src/panel/sections.js` | Menú agrupado, títulos, subtítulos, ayuda |
| Celular | `apps/vase-editor/web/src/panel/mobile.css` | Cajón ≤900 px |
| Sitio público | `apps/vase-help/app/globals.css`, `app/layout.tsx` | Landing/documentación con los mismos tokens |
| Port en Next.js (App Router) | `apps/vase-rest/app/globals.css`, `app/(product)/rest-shell.tsx`, `app/(product)/navigation.ts`, `app/components/brand.tsx` | Cómo llevar el sistema a otra app (prefijo `vr-`) |
| Marca (logos) | `apps/vase-editor/web/public/brand/` | `vase-logo-green.png` (claro), `vase-logo-white.png` (oscuro), favicon, touch icon |

Detalle completo en las referencias de esta skill:
- [references/tokens.md](references/tokens.md) — colores claro/oscuro, estados, tipografía, radios, sombras, espaciado.
- [references/components.md](references/components.md) — cada componente con medidas y clases (`vp-*` / `vr-*`).
- [references/copy.md](references/copy.md) — voz, voseo, textos de estado, vacíos y errores.

## Principios (no negociables)

1. **Blanco y negro + un verde.** Claro: blanco `#fff`, texto `#111418`, acento `#006d43`. Oscuro: negro puro `#000`, texto `#f2f2f2`, acento `#47e098`. Nada de violetas, degradés de SaaS genérico ni glassmorphism decorativo.
2. **Manrope en todo**, pesos 600–800. Títulos 800 con tracking negativo. Sin monoespaciada salvo IDs/códigos.
3. **Claro y oscuro siempre**, con el mismo set de tokens. Tema por `data-theme` en `<html>` (o en `.vp` en Business), guardado en `localStorage`, sin parpadeo (script inline antes de pintar), y por defecto el del sistema.
4. **El título de la pantalla vive en la barra de arriba** (título 20/800 + subtítulo 12.5/600 gris). No repetirlo en el cuerpo.
5. **Estructura antes que decoración**: menú agrupado, una acción principal por pantalla, tarjetas planas con borde de 1 px, estados con punto de color + texto (nunca solo color).
6. **Textos para no técnicos**, en voseo rioplatense, cortos y con la próxima acción. Nada de jerga interna (Edge, WAL, tenant, canonical) en la UI de cliente.
7. **Usable en celular**: ≤900 px el menú pasa a cajón con ☰; nada de scroll horizontal; objetivos táctiles ≥36 px.
8. **Accesible**: foco visible (`outline: 2px solid var(--acc)`), `aria-current` en la sección activa, `aria-label` en botones de ícono, `prefers-reduced-motion` respetado, contraste AA.

## Anatomía del panel (apps con login)

```
┌──────────────┬───────────────────────────────────────────────────────────┐
│ [V] business │ Ajustes › Pagos                         ● Todo publicado │
│  (‹ achicar) │ Pagos                              [Publicar] (🔔) (?)   │
│              │ Cómo terminan la compra tus clientes                      │  ← barra superior 76 px
│ Principal    ├───────────────────────────────────────────────────────────┤
│ ▣ Resumen    │ [aviso de estado, si hay]                                 │
│ ◫ Pedidos  3 │                                                           │
│ ☺ Clientes   │   cuerpo: padding 24/28, scroll propio                    │
│ Tu tienda    │   KPIs → estado → acciones → detalle                      │
│ ▢ Catálogo   │                                                ┌────────┤
│ …            │                                                │ panel  │ ← barra lateral
│ Cuenta       │                                                │ derecho│   derecha 400 px
│ ⚙ Ajustes ⌄  │                                                │ 400 px │   (detalle/edición)
│   │ Precios  │                                                └────────┤
│   │ Pagos ●  │                                                           │
│ ? Ayuda      │                                                           │
│ ┌──────────┐ │                                                           │
│ │[A] Tienda│ │ ← botón de cuenta: tema, volver a Vase, cerrar sesión     │
│ └──────────┘ │                                                           │
└──────────────┴───────────────────────────────────────────────────────────┘
 menú 236–244 px (achicado 76 px) · fondo --side · borde derecho --line
```

- **Menú lateral**: logo (26 px) + nombre del producto en minúscula ("business", "rest"); grupos con rótulo gris
  11.5/600 (`Principal`, el grupo propio del producto, `Cuenta`); ítems 39 px de alto, radio 12, ícono 18 px; activo =
  fondo `--active`, texto 800 e ícono en `--acc`; contadores en pastilla roja suave (`--badge`); subsecciones con
  línea vertical a la izquierda y el activo en `--accsoft` + `--acc-tx`. Botón redondo de 28 px montado sobre el
  borde para achicar (se recuerda en `localStorage`). Abajo, el botón de cuenta con inicial/logo, nombre y rol, que
  abre un menú hacia arriba: modo claro/oscuro, ayuda, volver a Vase (`https://app.vase.ar`), cerrar sesión en rojo.
- **Barra superior**: (☰ en celular) · migas si es subpágina (`Ajustes › Pagos`) · título · subtítulo · espacio ·
  pastilla de estado con punto (verde/naranja/rojo) · acción principal (verde) · campanita con contador · `?` que
  abre la ayuda de la sección.
- **Cuerpo**: `padding: 24px 28px`, scroll independiente del menú. Pantallas complejas pueden ocupar todo el
  ancho y abrir un **panel derecho** de 400 px que empuja el contenido (no lo tapa).
- **Ventanas**: modal centrado 560 px (ancho 720) o pegado a la derecha 400 px, radio 22, fondo con `--scrim`.

### Estructura de datos de la navegación

El menú, los títulos y la ayuda salen de **un solo archivo de datos** por app (no se escriben a mano en cada
pantalla). Business: `sections.js` (`MENU`, `SECTIONS`, `SETTINGS_PAGES`, `HELP`). Rest: `navigation.ts`, donde cada
ítem tiene `key, label, href, roles, group, icon, subtitle, children?` y `activeNavigation()` resuelve la sección y
subsección activas por el href más largo. Al agregar una pantalla: sumarla ahí con su subtítulo y su grupo.

Orden de grupos: **Principal** (inicio/resumen, analítica) → **grupo del producto** (Tu tienda / Servicio …) →
**Gestión** (catálogo, inventario, equipo) → **Cuenta** (ajustes con subpáginas, ayuda y soporte).

## Anatomía del sitio público (landing, help, documentación)

- Barra superior pegajosa 64–68 px, fondo `color-mix(in srgb, var(--page) 88%, transparent)` + `backdrop-filter: blur(10px)`, borde inferior. Logo + producto, links grises, botón de tema, botón secundario de línea y **un** botón verde ("Ingresar").
- Contenedor `max-width: 1040–1160px`, `padding-inline: 24px` (16 px en celular).
- Hero: pastilla `kick` (punto + texto verde sobre `--accsoft`), h1 `clamp(40px, 6vw, 68px)`/800/`-.045em`/`line-height 1.02` con la segunda frase en `--acc-tx`, bajada 18/600 gris, dos botones grandes (46 px), señales de confianza con ícono verde.
- Visual del hero: **una vista previa del panel real** hecha con HTML y los mismos tokens (menú angosto, barra, KPIs, contenido). Nada de ilustraciones genéricas ni fotos de stock.
- Secciones con rótulo `kick` + h2 `clamp(26px, 3.4vw, 36px)` + bajada; tarjetas `--soft` sin borde, radio 18; banda destacada con borde y sombra suave; CTA final sobre `--accsoft`; pie gris con links.

## Cómo implementarlo en una app nueva o al portar una

1. **Marca**: copiar `vase-logo-green.png` / `vase-logo-white.png` a `public/brand/`, `vase-favicon.png` como `app/icon.png` y `vase-touch-icon.png` como `app/apple-icon.png`. Mostrar los dos logos y alternarlos con variables CSS (`--logo-light` / `--logo-dark`).
2. **Tema sin parpadeo** (Next.js): en `app/layout.tsx`, `<html suppressHydrationWarning>` y en `<head>` un `<script>` inline:
   `try{var t=localStorage.getItem("vase-<app>-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}`.
   El botón de tema usa `useSyncExternalStore` + `MutationObserver` sobre `data-theme` (ver `apps/vase-rest/app/components/brand.tsx`). Envolver todo acceso a `localStorage` en `try/catch`.
3. **Tokens**: copiar el bloque de [tokens.md](references/tokens.md) a `globals.css` (`:root`, `:root[data-theme="dark"]` y el fallback `@media (prefers-color-scheme: dark) { :root:not([data-theme]) … }`).
4. **Fuente**: `next/font/google` Manrope 400–800 con `variable: "--font-manrope"` (o el `<link>` de Google Fonts en apps Vite).
5. **Prefijo de clases** propio por app (`vp-` Business, `vr-` Rest) para no chocar con estilos viejos; las clases que ya usan las pantallas existentes se re-estilan con los mismos tokens en vez de reescribir cada pantalla.
6. **Navegación como datos** + armazón único (`*-shell.tsx`) que lee la ruta y pinta título/subtítulo/migas.
7. **Íconos**: `lucide-react` (trazo 2, 18 px en menú, 15–16 en menús chicos, 19–20 en KPIs) o el `Icon.jsx` propio de Business con el mismo trazo. Un ícono por sección, siempre el mismo en menú y accesos.
8. **Verificar** con capturas en claro, oscuro y 390 px de ancho (Playwright está en el repo) antes de dar por terminado.

## Checklist antes de entregar una pantalla

- [ ] Título y subtítulo en la barra de arriba, sin repetirse en el cuerpo.
- [ ] Solo tokens (`var(--…)`), ningún color suelto salvo los de estado documentados.
- [ ] Se ve bien en claro **y** oscuro (logo correcto, sin textos negros sobre negro).
- [ ] A 390 px: menú en cajón, sin scroll horizontal, botones táctiles.
- [ ] Una sola acción principal verde visible por zona.
- [ ] Estados con punto + texto; vacíos que explican y proponen el próximo paso.
- [ ] Textos en voseo, sin jerga técnica (ver [copy.md](references/copy.md)).
- [ ] Foco visible, `aria-current`, `aria-label` en botones de ícono, `role="status"`/`"alert"` en avisos.
- [ ] Animaciones cortas (120–220 ms, `ease-out`) y apagadas con `prefers-reduced-motion`.
- [ ] Tests existentes pasan (en Rest: `tests/v3-rest-design-shell.test.ts`, `tests/v3-rest-role-navigation.test.ts`, `tests/v3-rest-home-entry.test.ts`).

## Errores típicos (no hacer)

- Fondos oscuros verdosos con grilla y "orbits" estilo consola técnica: era el diseño viejo de Rest, se reemplazó.
- IBM Plex Mono en etiquetas, rótulos en MAYÚSCULAS con tracking amplio, pastillas "CANONICAL".
- Glassmorphism, sombras de colores, degradés violetas/azules, emojis como íconos.
- Tarjetas con sombra fuerte en el panel (usar borde 1 px `--line`; sombra solo en ventanas y menús flotantes).
- `<select>` del navegador en pantallas nuevas de Business (usar el `Select` propio, `components/Select.jsx`).
- Dos títulos h1 visibles, títulos en el cuerpo que repiten la barra.
- Copiar el diseño de otro SaaS: la referencia es siempre el panel de Business.
