# ESP32 del depósito

Conexión usada:

- GND del ESP32 a GND de la tira.
- 5V de una fuente externa a 5V de la tira.
- GND de la fuente externa unido al GND del ESP32.
- P2/GPIO2 del ESP32 a DIN de la tira.

Para una tira de 60 LEDs no conviene alimentar toda la tira desde el pin 5V del ESP32. Usá una fuente externa de 5V y uní las masas.

## Configuración

En `warehouse-esp32.ino` completá:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `DEVICE_KEY` copiado desde Management → Depósito IA → Dispositivos
- `LED_COUNT` según la tira

Instalá en Arduino IDE las librerías `Adafruit NeoPixel` y `ArduinoJson`. Abrí el monitor serial a `115200`.

Resultados esperados:

- `Poll HTTP: 204`: conectado y sin órdenes.
- `Poll HTTP: 200`: recibió una orden.
- `Complete HTTP: 200`: la orden fue confirmada.
