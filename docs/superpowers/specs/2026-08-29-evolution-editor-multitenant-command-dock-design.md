# Evolution Editor: Full Canvas Command Dock

## Objetivo

Rediseñar visualmente `apps/vase-editor` para que el editor Evolution sea más intuitivo y menos cargado, usando como objetivo visual la opción 3 seleccionada por el usuario.

El cambio es exclusivamente de jerarquía, disposición y presentación. Debe conservar sin excepciones todas las funcionalidades existentes del editor, incluidos permisos, acciones, estados, validaciones, callbacks, rutas, persistencia, APIs y flujos de publicación.

## Alcance multiempresa

El editor debe ser reutilizable por cualquier empresa y tenant. Ningún componente de la interfaz administrativa puede depender de nombres, colores, logos o bloques exclusivos de Piquim.

- El selector de empresa muestra dinámicamente logo y nombre.
- Los colores del editor provienen de los tokens neutrales del panel administrativo.
- La identidad de la empresa se limita a su contenido, vista previa y controles configurables de marca.
- La lista de páginas y bloques se construye desde los datos existentes del tenant.
- Textos como `PIQUIM HERO` deben mostrarse mediante el título normalizado del tipo de bloque o su etiqueta configurada, sin alterar el identificador persistido.

## Principio de conservación funcional

La refactorización no cambia contratos ni comportamiento de negocio.

- `useEvolutionStore` continúa siendo la fuente de verdad de selección, módulo activo, inspector y estado de paneles.
- Los handlers de guardar, previsualizar, publicar, dominios, undo, redo, selección, ordenamiento, visibilidad, duplicado y eliminación se reutilizan.
- Los editores existentes de catálogo, categorías, apariencia, ofertas, checkout, envíos, notificaciones, integraciones, usuarios y SEO permanecen accesibles.
- `CommandPalette`, modales, notificaciones, inspector y estados de carga/error siguen funcionando.
- El responsive actual se conserva y se adapta al nuevo shell.
- No se cambian modelos de datos, endpoints ni payloads como parte de este trabajo.

## Estructura seleccionada

### Barra superior

Una barra neutral y compacta contiene:

- Selector de empresa y breadcrumb de página a la izquierda.
- Estado de guardado en una posición secundaria.
- `Previsualizar`, `Publicar` y menú de acciones infrecuentes a la derecha.
- El menú conserva `Guardar`, `Dominios`, acceso al cliente y cualquier acción existente que no permanezca visible.

`Publicar` es la acción primaria. Las demás mantienen su disponibilidad y estados disabled/loading actuales.

### Rail lateral

La navegación principal se convierte en un rail angosto con los módulos existentes. Debe soportar tooltip, estado activo, navegación por teclado y expansión cuando el ancho o el contexto lo requieran.

No se elimina ningún módulo. Los grupos actuales (`Sitio`, `Comercio`, `Operación`) pueden representarse mediante separadores y tooltips para reducir ruido visual.

### Canvas

La vista previa ocupa el área dominante. Conserva el iframe/render actual, sus estados y sus controles de tamaño.

Al seleccionar un bloque:

- aparece un borde de selección discreto;
- se muestra una barra contextual con acciones existentes;
- se abre el inspector correspondiente sin modificar la selección almacenada.

### Dock inferior

El dock flotante contiene:

- `Páginas`;
- `Bloques`;
- `Agregar`;
- tamaños de viewport;
- undo y redo.

Cada botón abre un popover enfocado. Los popovers no sustituyen la lógica actual: llaman a los mismos handlers y usan los mismos datos.

### Popover de bloques

El popover de bloques presenta una lista compacta con:

- drag handle y ordenamiento;
- selección;
- visibilidad;
- duplicado cuando esté disponible;
- eliminación con la confirmación existente;
- `Añadir bloque`.

La lista debe admitir scroll, nombres largos, estados ocultos y cantidades grandes sin desbordar el viewport.

### Inspector contextual

El inspector derecho se muestra únicamente cuando el módulo o la selección lo requiere. Mantiene todos los editores y campos existentes.

- Puede cerrarse y fijarse.
- Las propiedades frecuentes aparecen primero.
- Las secciones avanzadas se agrupan visualmente, sin ocultar ni eliminar controles.
- Catálogo y usuarios conservan sus anchos especiales y paneles especializados.
- El footer de guardado mantiene las reglas existentes por módulo.

## Responsive

- Desktop amplio: rail, canvas, dock e inspector contextual.
- Laptop: el inspector funciona como overlay para proteger el ancho del canvas.
- Tablet: rail compacto, dock desplazable y paneles como sheets.
- Móvil: navegación, bloques e inspector se presentan como sheets de pantalla completa; todas las acciones siguen disponibles.

## Accesibilidad

- Mantener labels, títulos y estados ARIA existentes.
- Todos los iconos importantes deben acompañarse con label visible o tooltip.
- Foco visible y navegación por teclado en rail, dock, popovers e inspector.
- Contraste mínimo WCAG AA para texto y controles.
- Targets táctiles mínimos de 40 px en superficies compactas y 44 px en móvil.

## Implementación prevista

La implementación reorganiza los componentes existentes sin reescribir la lógica de dominio:

- `EvolutionLayout.jsx`: nuevo shell y coordinación de overlays.
- `EvolutionSidebar.jsx`: rail multiempresa reutilizable.
- `EvolutionCanvas.jsx`: top bar simplificada, canvas dominante y dock.
- `PageSectionsEditor.jsx`: lista reutilizable dentro del popover de bloques.
- `EvolutionInspector.jsx`: comportamiento contextual, pin y responsive.
- `useEvolutionStore`: solo se agregan estados puramente visuales si son necesarios; no se reemplazan estados funcionales.
- Nuevos componentes pequeños pueden encapsular `EvolutionCommandDock`, `EvolutionBlocksPopover`, `EvolutionTenantSwitcher` y `EvolutionActionsMenu`.

## Validación

Antes de completar se verificará:

1. Inventario de acciones antes y después para demostrar paridad funcional.
2. Tests de apertura/cierre y selección de rail, dock, popovers e inspector.
3. Guardar, previsualizar, publicar y dominios.
4. Agregar, ordenar, ocultar, duplicar y eliminar bloques.
5. Todos los módulos administrativos existentes.
6. Cambio de tenant sin estilos o contenido filtrados entre empresas.
7. Desktop, laptop, tablet y móvil.
8. Build de producción y comprobación visual contra la opción 3.

## Fuera de alcance

- Cambiar APIs, Prisma, modelos o persistencia.
- Eliminar o fusionar módulos funcionales.
- Personalizar el editor exclusivamente para Piquim.
- Alterar el storefront público.
- Incorporar analíticas o funciones nuevas no presentes en el editor actual.
