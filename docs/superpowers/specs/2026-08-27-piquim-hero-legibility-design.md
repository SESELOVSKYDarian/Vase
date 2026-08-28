# Legibilidad del héroe de Piquim

## Objetivo

Mejorar la lectura del texto del héroe de Piquim cuando se muestra sobre una fotografía clara o con mucho detalle, manteniendo la identidad visual, la composición y la imagen de fondo.

## Diseño aprobado

- Aplicar un overlay degradado oscuro y transparente concentrado en la zona del copy.
- Agregar sombra suave al título, subtítulo, estadísticas y acciones para separar el texto del fondo.
- Mantener el naranja de marca como acento y conservar la fotografía visible.
- Aplicar el tratamiento tanto al bloque `PiquimHero` del editor como al `HeroSlider` del storefront público.
- En mobile, reforzar levemente el overlay y reducir el tamaño del copy para evitar solapamientos.

## Restricciones

- No cambiar textos, imágenes, enlaces ni datos guardados del negocio.
- No introducir un panel opaco permanente detrás del texto.
- Mantener controles accesibles, foco visible y targets táctiles adecuados.
- Respetar `prefers-reduced-motion`; el cambio no depende de animaciones.

## Validación

- Revisar editor y storefront en desktop y mobile.
- Confirmar que títulos blancos y naranjas superen el contraste visual sobre la fotografía.
- Ejecutar chequeos de formato y build/lint disponible en los paquetes afectados.
