# Vase Management: mejora global del tema claro

## Objetivo

Mejorar la legibilidad y la jerarquía visual del tema claro de Vase Management sin alterar la lógica funcional ni degradar el tema oscuro. La mejora debe cubrir el shell global y las pantallas de Depósito IA.

## Alcance

- Tokens globales de color, superficie, borde, texto y foco en `styles/globals.css`.
- Barra lateral: fondo claro estable, navegación legible, sección activa visible y separación del contenido.
- Encabezado superior: contraste, búsqueda, acciones y perfil claramente diferenciados.
- Fondo principal: eliminar el efecto lavado y conservar una textura sutil sin competir con el contenido.
- Paneles, tablas, badges, inputs y botones: bordes visibles, estados consistentes y sombras suaves.
- Depósito IA: productos, dispositivos, racks, canales, dashboard y formularios.
- Responsive: conservar el comportamiento móvil existente y evitar cortes de contenido.

## Dirección visual

Usar una base clara neutra con superficies blancas, texto principal oscuro, texto secundario con contraste suficiente y verde Vase únicamente como color de acción/estado. La navegación debe sentirse como una columna estable; el contenido debe quedar dentro de una superficie operativa limpia y con ancho aprovechable.

## Reglas de interacción y accesibilidad

- Mantener foco visible en teclado.
- Mantener botones táctiles de al menos 44px de alto.
- No comunicar estados solo con color: conservar texto o iconos.
- Mantener transiciones breves y respetar `prefers-reduced-motion`.
- Mantener el tema oscuro sin cambios estructurales.

## Validación

- Revisar que no queden textos claros sobre superficies claras en el shell.
- Revisar Depósito IA en escritorio y viewport móvil.
- Ejecutar `git diff --check` y las verificaciones disponibles del proyecto.
- Confirmar que las rutas y acciones existentes no cambien.
