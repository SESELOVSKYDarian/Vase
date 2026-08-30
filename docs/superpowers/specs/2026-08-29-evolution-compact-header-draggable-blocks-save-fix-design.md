# Evolution: barra compacta, bloques móviles y guardado confiable

## Objetivo

Reducir la barra superior del editor Evolution a búsqueda, menú Más y perfil; permitir mover el panel de bloques en escritorio; y reparar el guardado que actualmente termina en `Error desconocido`.

## Barra superior

- La barra visible conserva únicamente el buscador, un botón con flecha para abrir Más y el perfil.
- El menú Más concentra: guardar, deshacer, rehacer, abrir inspector, notificaciones, ver cliente, previsualizar, publicar y dominios.
- Las acciones mantienen sus callbacks actuales; el cambio es de presentación, no de permisos ni navegación.
- El dock inferior conserva Páginas, Bloques, Agregar y los tamaños Escritorio, Tablet y Celular.

## Panel de bloques arrastrable

- El panel `Página actual / Bloques` se puede arrastrar desde su encabezado usando Pointer Events.
- Su posición queda limitada al viewport para impedir que se pierda fuera de pantalla.
- Al abrirlo comienza en una posición útil junto al dock y conserva su posición durante la sesión.
- En pantallas pequeñas se mantiene centrado y no se arrastra, evitando conflictos con el desplazamiento táctil.
- Agregar, seleccionar, ordenar, ocultar, eliminar y guardar bloques conservan su comportamiento.

## Reparación del guardado

### Causa confirmada

El endpoint `PUT /tenant/settings` usa `seo` en los parámetros SQL sin definir esa variable. Esto produce un error del servidor. A la vez, `handleSaveAll` sólo devuelve banderas booleanas para respuestas HTTP fallidas, por lo que la interfaz no recibe el mensaje del endpoint y muestra `Error desconocido`.

### Corrección

- Normalizar `req.body.seo` en el backend antes de insertarlo o actualizarlo.
- Extraer de forma segura `error`, `code`, `details` o `message` de cada respuesta fallida.
- Identificar en el resultado si falló configuración, página Inicio, página Nosotros o publicación.
- Mantener el guardado conjunto y la publicación actual.
- No eliminar ni sobrescribir datos SEO, branding, tema o comercio.

## Pruebas

- Regresión backend que exige declarar `seo` antes de usarlo.
- Regresión frontend para la propagación del detalle real del endpoint.
- Regresión visual estructural para el header compacto y el panel arrastrable.
- Suite existente y builds de frontend y servidor.

