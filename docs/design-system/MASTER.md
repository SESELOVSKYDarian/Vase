# Vase Design System

## Brand Direction
- Moderna sin frialdad.
- Premium sin ruido visual.
- Clara para usuarios no tecnicos.
- Global y robusta, con lenguaje visual consistente entre marketing, cliente y admin.
- Oscura por defecto, con jade como acento operativo y glassmorphism sobrio.

## Visual Principles
- `Clarity first`: cada pantalla debe explicar que esta pasando y cual es la proxima accion.
- `Calm technology`: carbon, blanco suave y jade; la tecnologia debe sentirse facil, no intimidante.
- `Glass with discipline`: blur, brillo y profundidad solo para reforzar jerarquia, nunca como efecto vacio.
- `Operational elegance`: menos decoracion gratuita, mas estructura, ritmo y jerarquia.
- `Business readability`: metricas, tablas y estados deben sentirse ejecutivos antes que demasiado tecnicos.

## Tokens

### Color
- `background`: `#0D1117`, carbon oscuro.
- `background-elevated`: capa base secundaria para profundidad.
- `surface`: capas transluidas sobre carbon.
- `surface-strong`: vidrio mas definido para foco y formularios.
- `foreground`: `#F8FAFC`, alto contraste limpio.
- `muted`: `#94A3B8`, texto secundario.
- `accent`: `#18C37E`, accion y progreso.
- `accent-strong`: `#0E9F6E`, estados activos y detalles de precision.
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

## Dark Mode
- Es el modo base del producto.
- El light mode existe como variante complementaria, no como identidad principal.
- Mantener la misma jerarquia, no invertir simplemente colores.

## Future UI Governance
- Nuevas pantallas deben reutilizar tokens y componentes base.
- Evitar hardcodes de color salvo casos excepcionales.
- Si una pagina necesita romper el sistema, debe documentarse como excepcion.
