# ESP32 del depósito

Conexión usada:

- GND del ESP32 a GND de la tira.
- 5V de una fuente externa a 5V de la tira.
- GND de la fuente externa unido al GND del ESP32.
- P2/GPIO2 del ESP32 a DIN de la tira.

Para una tira de 60 LEDs no conviene alimentar toda la tira desde el pin 5V del ESP32. Usá una fuente externa de 5V y uní las masas.

## Configuración

La única carga necesaria en Arduino IDE es el firmware base. Después de esa carga, la configuración se administra desde Management.

En `warehouse-esp32.ino` completá solamente la primera conexión:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `DEVICE_KEY` copiado desde Management → Depósito IA → Dispositivos

Desde Management → Dispositivos → Editar desde web podés cambiar:

- Wi-Fi y contraseña
- URL del servidor
- cantidad de LEDs
- brillo
- máximo de LEDs activos

El ESP32 consulta `/config` cada 10 segundos, guarda los cambios en memoria y reconecta el Wi-Fi si cambian las credenciales. Los productos, ubicaciones y números de LED se administran en la web y se entregan como comandos; no se cargan al firmware.

Instalá en Arduino IDE las librerías `Adafruit NeoPixel` y `ArduinoJson`. Abrí el monitor serial a `115200`.

Resultados esperados:

- `Poll HTTP: 204`: conectado y sin órdenes.
- `Poll HTTP: 200`: recibió una orden.
- `Complete HTTP: 200`: la orden fue confirmada.
- `Config HTTP: 200`: recibió configuración actualizada.
