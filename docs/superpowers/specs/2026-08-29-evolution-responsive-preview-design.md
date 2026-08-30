# Evolution Editor: preview responsive real

## Objetivo

Hacer funcional el selector Escritorio, Tablet y Celular del dock inferior del editor Evolution, conservando sin cambios la edición de bloques, el inspector y las acciones existentes. Ocultar Previsualizar y Publicar de la barra superior para reducir carga visual, manteniéndolos disponibles en el menú de acciones.

## Alcance

- El cambio aplica a cualquier empresa y no contiene nombres, imágenes ni estilos específicos de Piquim.
- El selector responsive se muestra junto a Páginas, Bloques y Agregar.
- Escritorio usa todo el ancho disponible del lienzo.
- Tablet usa un viewport interno de 834 px.
- Celular usa un viewport interno de 390 px.
- El contenido se renderiza en un iframe interno para que sus media queries respondan al ancho elegido y no al ancho de la ventana administrativa.
- El árbol React continúa vivo dentro del editor mediante un portal; editar, seleccionar bloques y actualizar datos conserva el flujo actual.
- Las hojas de estilo activas del editor se reflejan dentro del iframe.
- Previsualizar y Publicar dejan de ocupar espacio en la barra superior, pero permanecen en el menú de tres puntos para preservar funcionalidad.

## Comportamiento

El componente de preview crea un documento aislado y monta allí el `PageBuilder`. Cuando cambia el tamaño elegido, el iframe cambia de ancho y el storefront recalcula sus breakpoints. Mientras el documento interno se inicializa se muestra un estado breve de carga. Si el iframe no puede inicializarse, el editor conserva un fallback visible en el documento principal.

## Accesibilidad y responsive

- Cada tamaño mantiene `aria-pressed`, título y nombre accesible.
- El tamaño activo se distingue visualmente.
- En pantallas administrativas pequeñas, el dock puede desplazarse horizontalmente sin cortar acciones.
- El iframe tiene título accesible y queda centrado dentro del lienzo.

## Validación

- Prueba de regresión para comprobar que el preview usa un iframe/portal y conserva `PageBuilder`.
- Prueba de paridad para confirmar que Previsualizar y Publicar siguen conectados al menú de acciones.
- Pruebas existentes del editor.
- Build de producción de `apps/vase-editor/web`.

