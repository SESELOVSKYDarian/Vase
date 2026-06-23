# Vase Design System

## Brand Direction
- Moderna sin frialdad.
- Premium sin ruido visual.
- Clara para usuarios no tecnicos.
- Global y robusta, con lenguaje visual consistente entre marketing, cliente y admin.
- Clara/editorial en marketing y densa/operativa en paneles cuando corresponde, con jade como acento y glassmorphism sobrio.

## Visual Principles
- `Clarity first`: cada pantalla debe explicar que esta pasando y cual es la proxima accion.
- `Calm technology`: carbon, blanco suave y jade; la tecnologia debe sentirse facil, no intimidante.
- `Glass with discipline`: blur, brillo y profundidad solo para reforzar jerarquia, nunca como efecto vacio.
- `Operational elegance`: menos decoracion gratuita, mas estructura, ritmo y jerarquia.
- `Business readability`: metricas, tablas y estados deben sentirse ejecutivos antes que demasiado tecnicos.

## Tokens

- `carbon`: `#000202`, texto fuerte y fondos premium.
- `graphite`: `#2F3030`, superficies oscuras y bordes.
- `jade`: `#3B633D`, accion principal y marca.
- `sage`: `#739374`, acento suave y apoyo visual.
- `mist`: `#EFF3F4`, fondo claro editorial.
- `white`: `#FFFFFF`, superficies limpias.
- `slate`: `#64748B`, texto secundario.
- `success`, `warning`, `danger`, `info`, `premium`: semanticos operativos.

### Typography
- `Display`: Manrope.
- `Support`: IBM Plex Mono.
- Regla:
  - titulos con tracking negativo y peso alto
  - cuerpo con line-height amplio
  - mono solo para metadata, IDs, request IDs y estados tecnicos

### Spacing
- `compact`: 16px
- `card`: 24px
- `section`: 48px
- Mantener respiracion amplia en dashboards y formularios largos.

### Radius & Shadows
- Radius redondeado suave, nunca agresivo.
- Sombras profundas pero difusas.
- El glassmorphism debe sentirse premium, no futurista exagerado.

## Components

### Buttons
- Primario: jade solido con contraste oscuro.
- Secundario: glass surface + borde.
- Ghost: para acciones contextuales.
- Quiet: para navegacion o acciones de baja jerarquia.

### Cards
- Usar superficies transluidas con blur y borde sutil.
- Una card debe poder vivir tanto en marketing como en admin.
- El brillo superior debe ser leve; evitar efecto gamer o futurista exagerado.

### Forms
- Etiqueta siempre visible.
- Feedback cercano al campo.
- Copy orientado a negocio, no a implementacion.
- Campos con suficiente contraste y aire visual.

### Tables
- Encabezado sobrio.
- Filas con buen padding y jerarquia de contenido.
- Estados visuales mediante badges, no solo color de texto.
- El contenedor debe sentirse como una capa ejecutiva, no como grilla fria.

### Empty States
- Deben:
  - explicar ausencia
  - proponer siguiente paso
  - mantener tono tranquilo y profesional

### Dashboards
- Orden:
  - metricas clave
  - estado operativo
  - acciones
  - detalle

### Guided Flows
- Onboarding simple, una decision principal por bloque.
- Mostrar progreso, contexto y resultado esperado.
- Reducir jerga tecnica y reforzar sensacion de acompanamiento.

## Accessibility
- Contraste AA o superior.
- Foco visible consistente.
- Targets minimos comodos.
- El color nunca debe ser el unico indicador.
- Respetar `prefers-reduced-motion`.

## Light / Dark
- Marketing puede usar light editorial como direccion principal.
- Paneles pueden usar superficies oscuras si mejora jerarquia operativa.
- No invertir colores automaticamente: cada modo debe preservar contraste, jerarquia y tono premium.

## Future UI Governance
- Nuevas pantallas deben reutilizar tokens y componentes base.
- Evitar hardcodes de color salvo casos excepcionales.
- Si una pagina necesita romper el sistema, debe documentarse como excepcion.
