# ESP32 del depósito: Ethernet + Wi-Fi

El controlador usa un **W5500 por SPI**. En modo `AUTO` intenta conectarse por cable y, si no obtiene IP por DHCP, usa el Wi-Fi guardado como respaldo. Vase Management muestra el transporte y la IP informados por el firmware.

## Conexiones

### Tira WS2812B

- GND del ESP32 a GND de la tira.
- 5V de una fuente externa a 5V de la tira.
- GND de la fuente externa unido al GND del ESP32.
- GPIO2 del ESP32 a DIN de la tira.

Para 100 LEDs se debe usar una fuente externa de 5V; no se alimenta la tira desde el ESP32.

### Módulo Ethernet W5500

| W5500 | ESP32 |
|---|---|
| SCK | GPIO14 |
| MISO | GPIO12 |
| MOSI | GPIO13 |
| CS | GPIO15 |
| INT/IRQ | GPIO4 |
| RST | GPIO5 |
| GND | GND |
| VCC | 3V3, salvo que el fabricante del módulo indique otra alimentación |

La lógica del ESP32 es de 3,3 V. No se deben aplicar 5 V a sus GPIO.

## Preparación

1. Instalar Arduino ESP32 core 3.x.
2. Instalar `Adafruit NeoPixel` y `ArduinoJson`.
3. Abrir `warehouse-esp32.ino`.
4. Copiar el `deviceKey` desde Management → Depósito IA → Dispositivos y reemplazar `REPLACE_WITH_DEVICE_KEY`.
5. Si se desea respaldo Wi-Fi desde el primer arranque, completar `INITIAL_WIFI_SSID` y `INITIAL_WIFI_PASSWORD`.
6. Cargar el firmware y abrir el monitor serie a 115200.

El firmware no contiene credenciales reales en el repositorio. Luego de la primera carga, la URL, el modo de conexión, el Wi-Fi, el brillo y la cantidad de LEDs se administran desde Vase Management.

## Modos disponibles

- `AUTO`: Ethernet primero y Wi-Fi como respaldo. Recomendado.
- `ETHERNET`: solo usa el W5500 para comunicarse con el servidor.
- `WIFI`: conserva el funcionamiento anterior sin Ethernet.

Si no hay conexión, el ESP32 crea temporalmente la red `Vase-ESP32-xxxx`. Conectarse con la clave `vaseesp32` y abrir `http://192.168.4.1` para recuperar la configuración.

## Mensajes esperados

- `Ethernet OK`: el W5500 obtuvo IP por DHCP.
- `Poll HTTP: 204 (ethernet)`: conectado por cable y sin órdenes.
- `Poll HTTP: 200`: recibió una orden.
- `Complete HTTP: 200`: confirmó la orden.
- `Config HTTP: 200`: recibió la configuración de Management.

La API sigue usando los mismos endpoints y comandos LED. El cambio de transporte no modifica productos, posiciones ni asignaciones de LEDs.
