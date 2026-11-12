# Tokens de Vase

Fuente de verdad: `apps/vase-editor/web/src/panel/panel.css` (`.vp` y `.vp[data-theme="dark"]`).
`apps/vase-help/app/globals.css` y `apps/vase-rest/app/globals.css` usan exactamente los mismos valores.

## Colores

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--page` | `#ffffff` | `#000000` | Fondo de la página |
| `--side` | `#f8f9fa` | `#000000` | Fondo del menú lateral y de pantallas de acceso |
| `--canvas` | `#ffffff` | `#000000` | Fondo del cuerpo del panel |
| `--card` | `#ffffff` | `#0a0a0a` | Tarjetas, barra superior, inputs, menús |
| `--soft` | `#f4f5f7` | `#121212` | KPIs, tarjetas de accesos, cabecera de tabla, botón suave |
| `--hover` | `#f2f4f5` | `#161616` | Hover de ítems y filas |
| `--active` | `#eceef0` | `#1a1a1a` | Ítem activo del menú |
| `--line` | `#eaecef` | `#1e1e1e` | Bordes de 1 px |
| `--line2` | `#d5d9de` | `#2e2e2e` | Borde en hover, toggles apagados |
| `--tx` | `#111418` | `#f2f2f2` | Texto principal |
| `--mut` | `#667085` | `#9b9b9b` | Texto secundario, subtítulos, etiquetas |
| `--mut2` | `#98a2b3` | `#6e6e6e` | Rótulos de grupo, placeholders |
| `--ink` | `#111418` | `#f2f2f2` | Botón/píldora "tinta" (contraste máximo) |
| `--ink-on` | `#ffffff` | `#000000` | Texto sobre `--ink` |
| `--acc` | `#006d43` | `#47e098` | Acción principal, foco, ícono activo |
| `--acc-on` | `#ffffff` | `#00260f` | Texto sobre `--acc` |
| `--acc-tx` | `#006d43` | `#5ff0a8` | Texto verde sobre fondo neutro |
| `--accsoft` | `rgba(24,195,126,.10)` | `rgba(71,224,152,.10)` | Fondo verde suave (pastillas, seleccionado) |
| `--warn` / `--warnsoft` | `#93370d` / `#fef6e7` | `#f5c56b` / `rgba(245,197,107,.10)` | Avisos de atención |
| `--red` / `--redsoft` | `#d92d20` / `#fee4e2` | `#ff6b5e` / `rgba(240,68,56,.14)` | Errores, cerrar sesión, borrar |
| `--badge` / `--badge-tx` | `#ffd9d4` / `#b42318` | `rgba(240,68,56,.18)` / `#ff8a80` | Contadores del menú |
| `--ok` | `#079455` | `#47e098` | Variación positiva |
| `--scrim` | `rgba(17,20,24,.32)` | `rgba(0,0,0,.7)` | Fondo detrás de ventanas |
| `--sb` / `--sbh` | `#d0d5dd` / `#18c37e` | `#2a2a2a` / `#47e098` | Scrollbar / hover |

### Colores de estado (iguales en ambos temas)

Siempre como **punto de 7–8 px + texto**, nunca como único indicador.

| Estado | Color | Ejemplos |
| --- | --- | --- |
| Verde `g` | `#17b26a` | Pagado, entregado, en línea, libre, listo |
| Amarillo `y` | `#f79009` | Pendiente, ocupada, preparando, cambios sin publicar |
| Rojo `r` | `#f04438` | Cancelado, rechazado, sin conexión, error |
| Azul `b` | `#2e90fa` | En camino, reservada, confirmado |
| Violeta `p` | `#7a5af8` | Solo como estado de pedido en Business (nunca como color de marca) |
| Gris | `#98a2b3` | Sin estado, borrador, limpieza |

Fondos tintados de estado: `color-mix(in srgb, <color> 10%, var(--card))`.

### Sombras

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--sh-sm` | `0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)` | `0 0 0 1px #161616` | Botón de achicar, segmentos |
| `--sh-md` | `0 12px 30px rgba(16,24,40,.10)` | `0 18px 40px rgba(0,0,0,.6)` | Listas desplegables, tarjeta de login |
| `--sh-lg` | `0 24px 60px rgba(16,24,40,.18)` | `0 30px 90px rgba(0,0,0,.8)` | Ventanas, menús flotantes, cajón |

Las tarjetas del panel **no** llevan sombra: borde 1 px `--line`.

## Bloque para copiar

```css
:root {
  --page: #ffffff; --side: #f8f9fa; --canvas: #ffffff; --card: #ffffff; --soft: #f4f5f7; --hover: #f2f4f5; --active: #eceef0;
  --line: #eaecef; --line2: #d5d9de; --tx: #111418; --mut: #667085; --mut2: #98a2b3; --ink: #111418; --ink-on: #ffffff;
  --acc: #006d43; --acc-on: #ffffff; --acc-tx: #006d43; --accsoft: rgba(24, 195, 126, .10);
  --warn: #93370d; --warnsoft: #fef6e7; --badge: #ffd9d4; --badge-tx: #b42318; --red: #d92d20; --redsoft: #fee4e2;
  --ok: #079455; --sb: #d0d5dd; --sbh: #18c37e; --scrim: rgba(17, 20, 24, .32);
  --sh-sm: 0 1px 2px rgba(16, 24, 40, .05), 0 1px 3px rgba(16, 24, 40, .06); --sh-md: 0 12px 30px rgba(16, 24, 40, .10); --sh-lg: 0 24px 60px rgba(16, 24, 40, .18);
  --logo-light: block; --logo-dark: none;
  color-scheme: light;
}
:root[data-theme="dark"] {
  --page: #000000; --side: #000000; --canvas: #000000; --card: #0a0a0a; --soft: #121212; --hover: #161616; --active: #1a1a1a;
  --line: #1e1e1e; --line2: #2e2e2e; --tx: #f2f2f2; --mut: #9b9b9b; --mut2: #6e6e6e; --ink: #f2f2f2; --ink-on: #000000;
  --acc: #47e098; --acc-on: #00260f; --acc-tx: #5ff0a8; --accsoft: rgba(71, 224, 152, .10);
  --warn: #f5c56b; --warnsoft: rgba(245, 197, 107, .10); --badge: rgba(240, 68, 56, .18); --badge-tx: #ff8a80;
  --red: #ff6b5e; --redsoft: rgba(240, 68, 56, .14); --ok: #47e098; --sb: #2a2a2a; --sbh: #47e098; --scrim: rgba(0, 0, 0, .7);
  --sh-sm: 0 0 0 1px #161616; --sh-md: 0 18px 40px rgba(0, 0, 0, .6); --sh-lg: 0 30px 90px rgba(0, 0, 0, .8);
  --logo-light: none; --logo-dark: block;
  color-scheme: dark;
}
/* Sin JS sigue al sistema: repetir el bloque oscuro dentro de
   @media (prefers-color-scheme: dark) { :root:not([data-theme]) { … } } */
```

## Tipografía

Manrope (Google Fonts), pesos 400–800. `-webkit-font-smoothing: antialiased`. Números con `font-variant-numeric: tabular-nums` en KPIs y tablas.

| Rol | Tamaño / peso | Extra |
| --- | --- | --- |
| Base del panel | 13.5 px / 600 | `line-height 1.5` |
| Título de barra superior | 20 px / 800 | `letter-spacing -.02em` (17 px en celular) |
| Subtítulo de barra | 12.5 px / 600 | `--mut` |
| Título de página con encabezado propio (inicios) | 24 px / 800 | `-.025em` |
| Título de tarjeta (h2) | 15–16 px / 800 | |
| Valor de KPI | 22 px / 800 | tabular |
| Etiqueta de campo / rótulo | 11.5 px / 700 | `--mut` |
| Rótulo de grupo del menú | 11.5 px / 600 | `--mut2` |
| Nota | 11.5–12 px / 600 | `--mut`, `line-height 1.5` |
| Logo (palabra del producto) | 18 px / 800 | `-.03em`, minúscula |
| Hero del sitio | `clamp(40px, 6vw, 68px)` / 800 | `-.045em`, `line-height 1.02` |
| h2 del sitio | `clamp(26px, 3.4vw, 36px)` / 800 | `-.035em` |
| Cuerpo del sitio | 15 px / 600 | `line-height 1.6` |

Nunca: mayúsculas con tracking amplio, monoespaciada para rótulos, pesos < 500 en interfaz.

## Radios

| Elemento | Radio |
| --- | --- |
| Pastillas de filtro, contadores, kick | 999 px |
| Tag de estado | 8 px |
| Botón chico / paginador / ítem de submenú | 9 px |
| Botón e input | 11 px |
| Ítem del menú, botón de cuenta, menú flotante | 12–14 px |
| KPI, fila de ajustes, tarjeta de acceso | 16 px |
| Tarjeta | 18 px |
| Ventana, tarjeta de login, panel del hero | 22 px |
| Banda/CTA del sitio | 24 px |
| Botón de ícono | 50 % (40 px; 36 en celular) |

## Espaciado y medidas

- Cuerpo del panel: `24px 28px` (celular `14px 12px 24px`). Separación entre bloques: 14–18 px.
- Barra superior: `min-height 76px`, `padding 16px 28px` (60 px y `10px 12px` en celular).
- Menú lateral: 236–244 px, achicado 76 px, cajón celular `min(300px, 86vw)`.
- Panel derecho: 400 px. Modal: 560 px (ancho 720).
- Alturas: botón 38 (chico 32, grande 46), input 40 (login 48), ítem de menú 39, submenú 32, pastilla de filtro 34, tag 24.
- Grillas: KPIs 4 columnas (Business) o 3 (Rest) → 2 a 1100 px → 1 a 620 px. Tarjetas `repeat(auto-fill, minmax(260px, 1fr))`.

## Movimiento

- Menús y selects: entrar 120–160 ms `ease-out` (opacidad + `translateY(4px)`).
- Panel derecho: 180 ms `translateX(16px)` → 0. Cajón celular: 220 ms `transform`.
- Chevrons: rotación 180 ms.
- Todo apagado con `@media (prefers-reduced-motion: reduce)`.
