# Depósito IA: Wi‑Fi portable y color de LEDs

## Objetivo

Permitir instalar el controlador ESP32 en distintos locales manteniendo el polling existente hacia Vase Management, sin recompilar para cada cambio de red. Los comandos LED deben aceptar un color RGB configurable desde la web.

## Perfiles Wi‑Fi

El firmware tendrá tres perfiles:

1. Perfil Damac: SSID `WIFI Damac N4164 ` — incluye el prefijo `WIFI`, un espacio entre `WIFI` y `Damac`, y un espacio final después de `4164`; todos forman parte del nombre de la red.
2. Perfil Barra: SSID `Barra`.
3. Perfil editable: SSID y contraseña entregados desde Management y guardados en `Preferences`.

El perfil editable se probará primero. Si no conecta, el ESP32 probará los dos perfiles integrados. Las credenciales recibidas por la API se almacenarán en memoria no volátil y no se devolverán en las respuestas públicas. El SSID se conservará literalmente, sin aplicar `trim()` ni eliminar espacios finales.

Si ningún perfil conecta durante el tiempo configurado, el ESP32 creará una red temporal `Vase-ESP32-XXXX` con una página local para cargar SSID, contraseña, URL del servidor y `deviceKey`. La configuración se guardará y el dispositivo volverá a intentar conectarse. Si una actualización remota de Wi‑Fi falla, se conservará la configuración anterior y se habilitará el modo de recuperación.

## Configuración remota

La pantalla de dispositivos permitirá editar SSID, contraseña, servidor, cantidad de LEDs, brillo y máximo de LEDs activos. La contraseña se mostrará como campo protegido y solo se enviará cuando se modifique. El endpoint de configuración responderá con los valores operativos sin exponer la contraseña.

El servidor seguirá entregando la configuración mediante el polling de configuración existente. El firmware aplicará cambios de brillo y cantidad de LEDs sin perder el `deviceKey`; los cambios de red se aplicarán con reconexión controlada.

## Color de los LEDs

El modelo de comando ya contiene `color: { r, g, b }`. La web agregará un selector de color y enviará el valor RGB en las acciones “Probar LED”, consultas de producto y comandos provenientes de canales. El firmware validará cada componente entre 0 y 255, aplicará el brillo configurado y encenderá los LEDs seleccionados con ese color.

El comportamiento de apagado seguirá usando color negro y/o duración cero, sin modificar la asignación de LEDs de los productos.

## Seguridad y compatibilidad

- El `deviceKey` continúa siendo el identificador de autenticación del ESP32.
- Se conserva el flujo ESP32 → servidor por polling.
- Se mantiene compatibilidad con comandos antiguos que solo envían `ledNumber` y `activeCount`.
- No se guardarán credenciales del cliente en el repositorio ni en la interfaz pública.
- El firmware no confiará en índices fuera del rango configurado.

## Validación

- Pruebas unitarias para normalización RGB, valores fuera de rango y comandos legacy.
- Pruebas del firmware para aplicar `ledNumbers`, color, brillo y reconexión.
- Verificación manual: red Damac, red Barra, perfil web, cambio de color y recuperación cuando una red no responde.
