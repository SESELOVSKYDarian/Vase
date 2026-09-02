# Ajuste final: navbar y espaciado Piquim

## Alcance

Refinar exclusivamente la experiencia storefront del tenant Piquim en `apps/vase-editor/web`. Se preservan la identidad, funcionalidades de navegación y búsqueda, menú mobile, modo oscuro, y el comportamiento de los demás tenants.

## Diagnóstico

- El `<nav>` específico de Piquim posee superficie y radio propios, creando una segunda caja detrás de los links principales.
- El header Piquim está en `z-50`; el storefront contiene superficies con posicionamiento y potenciales contextos de apilamiento, por lo que no ofrece garantía de precedencia global.
- Login y Signup fuerzan el centrado vertical con `min-h-[80vh]` e `items-center`, produciendo una separación excesiva bajo un header sticky que ya ocupa flujo.
- Carrito tiene una separación inicial moderada en su estado con items y excesiva en el estado vacío; About delega su primer bloque en `PageBuilder`, por lo que el ajuste debe ser exclusivo de la composición Piquim y no un offset global.

## Diseño aprobado: variante Piquim localizada

### Navbar

1. Mantener el header `sticky top-0`; introducir una capa Piquim explícita y aislada, por encima de contenido, overlays de hero y cards de catálogo.
2. Convertir la composición desktop de logo, navegación y acciones a un layout que reserve espacio real para los tres grupos. El nav podrá contraerse y desplazarse mediante transición cuando el buscador se expanda; no se usarán posiciones absolutas ni z-index para evitar colisiones.
3. Quitar exclusivamente el `background` y `rounded-full` del contenedor del nav. Cada link conserva sus estados; el activo conserva su pill naranja.
4. Aplicar una pequeña corrección óptica responsive al bloque de navegación sólo en desktop ancho. La corrección se reduce o desaparece antes del breakpoint en que la navegación desktop deja de ser aplicable.

### Apilamiento

El header Piquim se mantendrá como hermano anterior de `<main>` dentro de `StoreLayout`, no dentro de la superficie del hero o catálogo. Su raíz tendrá una capa alta y un contexto controlado; los elementos del Hero y `PiquimExactCatalogCard` permanecen en la capa de contenido. No se cambiará sticky a fixed ni se añadirá compensación de altura al contenido.

### Espaciado de páginas internas

- Login y Signup: para Piquim, reemplazar el centrado vertical por `pt` y `pb` responsivos, conservando centrado horizontal y todos los flujos de autenticación.
- Cart: reducir el padding superior únicamente para Piquim, tanto con productos como vacío, sin tocar lógica de checkout o cantidades.
- About: aplicar un wrapper Piquim de primer contenido con separación normal tras el header, sin alterar las secciones de otros tenants ni el hero Home/Catálogo.

## Adaptación y casos límite

- Desktop: 1920, 1440, 1280 y 1024 px con buscador cerrado, hover y abierto/pinned.
- Tablet/mobile: 768, 430, 390, 360 y 320 px. El menú móvil no recibe corrección óptica desktop ni overflow horizontal.
- Se verifican contenido largo, foco del input, links activos, sugerencias del buscador, cards absolutas del catálogo, hero Home y los dos estados del carrito.

## Validación

1. Test enfocado de branding/layout si la infraestructura existente permite montar estos componentes.
2. `npm run lint` y `npm run build` en `apps/vase-editor/web`.
3. Detector de diseño sobre los archivos modificados.
4. Inspección de diff, imports y render responsive con búsqueda cerrada/abierta.

## Fuera de alcance

No se modifican contenidos, precios, checkout, validaciones, rutas, datos de usuario, estilos de otros tenants, ni la composición general del hero Piquim.
