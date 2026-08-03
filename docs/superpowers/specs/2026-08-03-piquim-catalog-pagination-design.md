# Paginacion del catalogo Piquim

## Objetivo

Mostrar un maximo de 20 productos por pagina en los subcatalogos de Piquim, con navegacion numerada, sin perder las categorias publicadas, los filtros actuales ni la respuesta visual durante la carga.

## Alcance

- Aplica solamente a las vistas especiales de catalogo de Piquim.
- La paginacion se calcula sobre el resultado completo despues de aplicar busqueda, tipo de producto, presentacion, sabor y disponibilidad.
- Cada cambio de filtro o de catalogo vuelve a la pagina 1.
- No modifica la paginacion generica utilizada por otros comercios.

## Comportamiento

- Cada pagina muestra como maximo 20 productos.
- El pie del listado incluye `Anterior`, paginas numeradas y `Siguiente`.
- Cuando existen muchas paginas se muestran la primera, la ultima y las cercanas a la pagina activa, con puntos suspensivos entre los rangos.
- Los botones de anterior y siguiente se deshabilitan en los extremos.
- Al seleccionar otra pagina, la vista vuelve suavemente al encabezado del listado.
- Los productos visibles conservan su agrupacion y sus titulos de categoria. No se renderizan secciones vacias.

## Carga de datos

- Se mantiene la carga progresiva existente para no demorar la primera visualizacion.
- Los primeros productos disponibles se muestran inmediatamente, limitados a 20.
- Las paginas restantes del catalogo continúan cargandose en segundo plano.
- Mientras la carga continua se conserva un aviso de estado sin ocultar los productos ya visibles.
- El numero de paginas se recalcula con los productos cargados que cumplen los filtros. Al finalizar la carga queda estable con el conjunto completo.
- Si una carga parcial falla, se conservan los productos recibidos y se ofrece `Reintentar`.

## Estado y flujo

`PiquimSubcatalogPage` mantiene la pagina activa. Primero normaliza los productos, despues aplica los filtros, luego obtiene el segmento de 20 elementos y finalmente construye las secciones visibles con ese segmento.

La pagina activa vuelve a 1 cuando cambia cualquiera de estos valores:

- catalogo seleccionado;
- texto de busqueda;
- tipos seleccionados;
- presentaciones seleccionadas;
- sabores seleccionados;
- filtro de stock.

Si una actualizacion reduce la cantidad de paginas, la pagina activa se ajusta al ultimo valor valido.

## Componentes

- Una utilidad pura divide una lista en paginas y devuelve elementos visibles, pagina actual normalizada y total de paginas.
- Un componente de paginacion renderiza los controles accesibles y el estado activo.
- La construccion de secciones recibe solamente los productos de la pagina visible.

## Accesibilidad

- La navegacion usa `nav` con una etiqueta descriptiva.
- La pagina activa expone `aria-current="page"`.
- Cada boton numerado tiene una etiqueta con su numero de pagina.
- Los controles deshabilitados usan el atributo `disabled`.

## Pruebas

- Exactamente 20 productos en una pagina cuando hay mas resultados.
- Calculo correcto del numero de paginas y del ultimo segmento incompleto.
- Normalizacion de una pagina fuera de rango.
- Reinicio a pagina 1 al cambiar filtros.
- Presencia de controles numerados, anterior y siguiente en la vista Piquim.
- Regresion de categorias publicadas y carga progresiva existente.

## Fuera de alcance

- Paginacion independiente dentro de cada categoria.
- Cambios en la API publica.
- Cambios visuales generales en las tarjetas o en el sidebar.
- Despliegue a produccion.
