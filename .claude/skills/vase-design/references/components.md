# Componentes de Vase

Clases de Business (`vp-*`, en `apps/vase-editor/web/src/panel/panel.css` y `screens/screens.css`) y su
equivalente en Rest (`vr-*` o clase existente, en `apps/vase-rest/app/globals.css`). Al crear algo nuevo, copiar
estas medidas; no inventar variantes.

## Armazón

| Pieza | Business | Rest | Notas |
| --- | --- | --- | --- |
| Contenedor | `.vp` (fixed, flex) | `.vr-app` (flex, `100dvh`) | Tema en `.vp[data-theme]` / `html[data-theme]` |
| Menú lateral | `.vp-side` (`.mini`, `.phone`, `.m-open`) | `.vr-side` | 236 / 244 px, `--side`, borde derecho |
| Botón achicar | `.vp-coll` | `.vr-coll` | Círculo 28 px en `right:-14px; top:19px` |
| Logo | `.vp-logo` | `.vr-logo` (`BrandLogo`) | Imagen 26 px + palabra 18/800 |
| Rótulo de grupo | `.vp-grp` | `.vr-grp` | 11.5/600 `--mut2` |
| Ítem | `.vp-nb` (`.on`) | `.vr-nb` (`.on`) | 39 px, radio 12, ícono verde si activo |
| Contador | `.vp-badge` | — | Pastilla `--badge` |
| Chevron | `.vp-chev` (`.open`) | `.vr-chev` (`.open`) | Rotado -90° cerrado |
| Submenú | `.vp-subnav` + `.vp-sn` | `.vr-subnav` + `.vr-sn` | Línea izquierda 1.5 px; activo `--accsoft` |
| Cuenta | `.vp-acc`, `.vp-accbtn`, `.vp-accmenu`, `.vp-am` (`.out`) | `.vr-acc…` | Menú abre hacia arriba, cierra con Esc / clic afuera |
| Sucursal (Rest) | — | `.vr-branch`, `.vr-branch-sel` | Tarjeta con "Sucursal activa" + select |
| Zona principal | `.vp-main` | `.vr-main` | |
| Barra superior | `.vp-top` | `.vr-top` | 76 px, `--card`, borde inferior |
| Título / subtítulo / migas | `.vp-ttl`, `.vp-sub`, `.vp-crumb` | `.vr-ttl`, `.vr-sub`, `.vr-crumb` | |
| Estado | `.vp-status` + `i.ok` | `.vr-status` + `i.ok/.warn/.bad` | Pastilla 40 px con punto; en celular solo el punto |
| Botón de ícono | `.vp-ibtn` (+ `.n` contador) | `.vr-ibtn` | Círculo 40 px |
| Cuerpo | `.vp-page` > `.vp-body` | `.vr-body` > `.product-content` | Scroll propio |
| Panel derecho | `.vp-rbar` (`.vp-rh`, `.vp-rb`, `.vp-rf`) | — | 400 px, empuja el contenido |
| Cajón celular | `.vp-mscrim`, `.vp-mclose`, `.vp-menu` | `.vr-mscrim`, `.vr-mclose` | ≤900 px |

## Acciones

| Pieza | Clase | Spec |
| --- | --- | --- |
| Botón principal | `.vp-btn.acc` / `.vr-btn.acc` / `.button-primary` | 38 px, radio 11, 13/800, `--acc` + `--acc-on` |
| Tinta | `.vp-btn.ink` / `.vr-btn.ink` | Máximo contraste, para "Abrir en el panel anterior" |
| Suave | `.vp-btn.soft` / `.vr-btn.soft` | `--soft` |
| Línea | `.vp-btn.line` / `.vr-btn.line` / `.button` | Borde `--line`, fondo `--card` |
| Peligro | `.vp-btn.red` / `.vr-btn.red` | `--redsoft` + `--red` |
| Tamaños | `.sm` (32 px) · `.lg` (46 px, solo sitio público y login) | |
| Toggle | `.vp-tog` (`.off`) | 38×22, perilla 16 |
| Segmentos | `.vp-seg` > `button.on` | Fondo `--soft`, activo `--card` + `--sh-sm` |
| Pastillas de filtro | `.vp-fp` (`.on` = tinta) + `em` contador | 34 px, radio 999 |
| Barra de selección masiva | `.vp-bulk` | Tinta, sticky abajo, centrada |

## Datos

| Pieza | Clase | Spec |
| --- | --- | --- |
| KPI | `.vp-kpi` / `.vr-kpi` (+ `.vp-kic` / `.vr-kic`) | Fondo `--soft`, radio 16, ícono en círculo 42 px `--card`, etiqueta 12.5/600, valor 22/800, nota `.vp-up`/`.vp-dn`. Es un botón/link a su sección |
| Tarjeta | `.vp-card` / `.ui-card` | `--card`, borde 1 px, radio 18, padding 20 |
| Cabecera de tarjeta | `.vp-ch` / `.vr-ch` | h2 16/800 + `small` 12/600 + acción a la derecha |
| Tabla | `.vp-tbl` / `.product-content table` dentro de `.table-wrap` | `th` 12/600 sobre `--soft` con extremos redondeados 10; `td` padding 11/10, borde inferior `--line`; fila clickeable con hover |
| Paginador | `.vp-pager`, `.vp-pg` (`.on` tinta) | 32 px |
| Tag de estado | `.vp-tag.g/.y/.r/.b/.p` / `.vr-tag` | 24 px, radio 8, punto 7 px |
| Barras de ventas | `.vp-bars` | Ver `screens.css` |
| Medidor | `.vp-meter` | 10 px, `--acc` |
| Línea de tiempo | `.vp-tl`, `.vp-tli` | Punto con borde `--acc` |

## Formularios

| Pieza | Clase | Spec |
| --- | --- | --- |
| Campo | `.vp-fld` > `label` + `.vp-inp` | Etiqueta 11.5/700 `--mut` arriba; input 40 px radio 11 |
| Foco | | Borde `--acc` + `box-shadow: 0 0 0 3px var(--accsoft)` |
| Select propio | `Select.jsx` → `.vp-sel` (`.inp`, `.slot`, `.fp`) + `.vp-selpop` | Lista flotante radio 14, opción seleccionada en verde con ✓, buscador si hay muchas |
| Búsqueda | `.vp-search` | 38 px, ícono lupa, 260 px |
| Formulario en grilla (Rest) | `.inline-form`, `.settings-form` | Tarjeta con `grid auto-fit minmax(190px,1fr)`, botón alineado abajo |
| Elección grande | `.vp-choice` (`.on`) | Tarjeta seleccionable con borde `--acc` + `--accsoft` |
| Barra de guardar | `.vp-savebar` | Sticky abajo con degradé al canvas |
| Error | `.vr-alert` / `[role="alert"]` | `--redsoft` + `--red`, 12.5/700, radio 11 |

## Listas y navegación interna

| Pieza | Clase | Uso |
| --- | --- | --- |
| Lista de ajustes | `.vp-alist` + `.vp-agrp` + `.vp-arow` / `.vr-alist` + `.vr-grp-title` + `.vr-arow` | Índice de subpáginas: título 800 + descripción gris + chevron; hover borde verde |
| Accesos (Rest) | `.vr-shortcuts` + `.vr-shortcut` | Inicio por rol: ícono en círculo + nombre + subtítulo |
| Filas de estado (Rest) | `.branch-list article` | Nombre · tag · detalle gris · error en rojo |

## Ventanas y avisos

| Pieza | Clase | Spec |
| --- | --- | --- |
| Modal | `Overlays.jsx` `Modal` → `.vp-scrim` > `.vp-modal` (`.w`, `.dr`) | Header `h3` 18/800 + descripción; cierra con Esc y devuelve el foco |
| Lista de ayuda | `.vp-hl` | Número en cuadradito verde + texto + duración |
| Campanita | `.vp-nlist`, `.vp-nitem`, `.vp-nic.pay/.user` | Avisos con acciones |
| Banner de conectividad (Rest) | `.connectivity-banner` (`.pending`) | Rojo suave o ámbar, debajo de la barra |
| Pantalla en proceso | `ComingSoon` → `.vp-soon` | Ícono herramienta, explica y ofrece "Abrir en el panel anterior" |
| Vacío | `.vp-empty` / `.vr-empty` | Explica la ausencia y propone el próximo paso con un botón |
| Carga | `.vr-loading` + `.vr-spinner` | Spinner 28 px con borde superior `--acc` |

## Sitio público

| Pieza | Clase (help / rest) |
| --- | --- |
| Barra | `.top` / `.vr-site-top` (+ `.vr-site-links`) |
| Contenedor | `.wrap` / `.vr-wrap` |
| Pastilla de sección | `.kick` / `.vr-kick` |
| Hero | `.hero` / `.vr-hero`, `.vr-hero-lede`, `.vr-hero-actions`, `.vr-trust` |
| Vista previa del panel | `.vr-preview` (`.vr-pv-*`) |
| Tarjetas | `.card` / `.vr-feature` (`--soft`, radio 18) |
| Banda destacada | `.vr-band` + `.vr-steps` (pasos numerados `.vr-stepn`) |
| Chips | `.vr-role` (el último en tinta) |
| CTA | `.vr-cta` (`--accsoft`, radio 24) |
| Pie | `.foot` / `.vr-foot` |
| Botón de tema | `.theme-btn` / `ThemeButton` |
