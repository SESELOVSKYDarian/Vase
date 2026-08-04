# Carga progresiva del catálogo de Piquim

## Objetivo

Evitar que `piquim.ar` parezca vacío mientras descarga el catálogo completo. El cliente debe ver una respuesta inmediata, los primeros productos tan pronto estén disponibles y una indicación clara mientras continúa la carga.

## Experiencia elegida

- Al entrar a Heladería o Panadería/Confitería, mostrar tarjetas skeleton y el texto `Cargando productos...`.
- Solicitar productos por páginas de 48 elementos.
- Publicar la primera página inmediatamente, sin esperar las páginas restantes.
- Incorporar cada página posterior a la grilla sin ocultar ni reemplazar los productos ya visibles.
- Mientras quedan páginas pendientes, mostrar `Cargando más productos...` junto al total cargado.
- Si falla una página posterior, conservar lo ya cargado y ofrecer `Reintentar`.
- Si falla la primera página, mostrar un estado de error con `Reintentar`, sin presentar el catálogo como vacío.
- Al cambiar de catálogo o filtro, cancelar la carga anterior para impedir que se mezclen resultados.

## Diseño técnico

La utilidad de paginación aceptará una función opcional que recibirá el acumulado después de cada página. `CatalogPage` actualizará `products` y `totalItems` desde ese callback. `PiquimSubcatalogPage` recibirá el estado de carga y error para renderizar skeletons, progreso o recuperación sin modificar el diseño visual actual.

La jerarquía de filtros seguirá derivándose de las categorías publicadas en Business y la clasificación continuará usando `category_ids`.

## Estados

1. `initial-loading`: no hay productos; se muestran skeletons.
2. `progressive-loading`: ya hay productos; se muestran la grilla y el indicador de carga adicional.
3. `ready`: todas las páginas llegaron.
4. `partial-error`: se conservan los productos y aparece `Reintentar`.
5. `initial-error`: no hay productos y se presenta el error recuperable.

## Validación

- Prueba de la utilidad: emite el acumulado después de cada página.
- Prueba de regresión: no espera la última página para publicar la primera.
- Prueba de fuente: el subcatálogo recibe y representa carga inicial, carga progresiva y error.
- Build de producción del frontend.
- Verificación de higiene con `git diff --check`.

## Fuera de alcance

- Cambiar el diseño de las tarjetas.
- Modificar categorías o asignaciones de productos.
- Implementar scroll infinito.
- Cambiar el endpoint público del backend.
