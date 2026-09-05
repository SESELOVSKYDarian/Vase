# Corrección de título mobile del catálogo Piquim

## Causa confirmada

El landing público de catálogo renderiza `PiquimExactCatalogCard` en `CatalogPage.jsx`, no `PiquimCatalog3Panel.jsx`. Su bloque de contenido combina `inset-x-10`, `inline-flex` y `overflow-hidden`; en 320 px deja aproximadamente 240 px para un título de 56 px y recorta el exceso. El cambio previo sólo ajustó el panel de Home.

## Diseño aprobado

- Mantener `overflow-hidden` en el `<article>` para la imagen y overlay.
- Cambiar el bloque textual interno a un contenedor de ancho real (`w-full`, `min-w-0`, padding/insets responsive) sin recorte de contenido.
- Dar al encabezado ancho máximo, wrapping normal y escala tipográfica mobile progresiva sin reducir el desktop.
- Renderizar de forma genérica los títulos con `/`: antes del breakpoint el segundo tramo será bloque; desde `sm` permanecerá inline. Los títulos sin `/` se renderizan sin cambios y `card.title` sigue siendo la fuente.
- Aplicar el mismo comportamiento al título del panel de Home, sin modificar imágenes, slugs, filtros ni navegación.

## Validación

Un test de regresión inspeccionará ambos componentes para asegurar que el landing no mantiene el contenedor recortante y que el renderer conserva `card.title`. Se ejecutarán pruebas enfocadas, build y revisión del diff.
