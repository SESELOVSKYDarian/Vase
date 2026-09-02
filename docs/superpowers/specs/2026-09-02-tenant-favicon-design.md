# Favicon independiente por tenant

## Causa confirmada

`StoreLayout` resuelve el icono con `branding.favicon_url`, `seo.favicon_url`, `branding.logo_url` y finalmente `/favicon.ico`. El tercer fallback permite que un logo horizontal se use como favicon. El editor principal expone upload y preview de logo, pero no un campo dedicado para favicon.

## Diseño aprobado

- Eliminar `branding.logo_url` de la resolución de favicon. Prioridad: `branding.favicon_url`, `seo.favicon_url`, `/favicon.ico`.
- Actualizar el `<link rel="icon">` cuando cambie cualquiera de esos valores y asignar `type` según extensión conocida.
- Agregar `branding.favicon_url` al estado inicial, carga/merge y formulario de Branding del editor.
- Agregar upload dedicado, preview cuadrado con `object-contain` y ayuda de formatos/recomendación 512 × 512, 1:1.
- Al elegir un archivo local, leer dimensiones y advertir sin bloquear si la relación se aleja de 1:1. No transformar ni recortar el archivo.

## Límites

No se cambia el logo del navbar, assets existentes, navegación, categorías ni settings de otros dominios. `seo.favicon_url` continúa soportado por compatibilidad.

## Validación

Agregar prueba de regresión para la prioridad sin `logo_url`, dependencias reactivas y MIME. Ejecutar test enfocado y build del editor.
