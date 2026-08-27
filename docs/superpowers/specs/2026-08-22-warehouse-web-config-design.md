# Configuración web del ESP32 del depósito

## Objetivo

Permitir que Management sea la fuente de configuración del ESP32 y del catálogo. El firmware base se carga una vez; luego el controlador consulta configuración y comandos por HTTPS.

## Diseño aprobado

- Management guarda URL del servidor, Wi-Fi, cantidad de LEDs, brillo y máximo activo.
- `GET /api/warehouse/devices/:deviceKey/config` entrega configuración al dispositivo autenticado por `deviceKey`.
- `PATCH /api/warehouse/devices/:deviceId` permite editarla desde la pantalla de Dispositivos.
- El ESP32 guarda la última configuración en `Preferences`, aplica cambios de brillo/cantidad y reconecta Wi-Fi cuando cambian las credenciales.
- Productos, ubicaciones y LED asignado quedan en PostgreSQL; el ESP32 solo recibe comandos efímeros por polling.

## Límite operativo

La primera conexión necesita valores iniciales en el firmware porque un ESP32 sin Wi-Fi no puede recibir credenciales desde la nube. Después de conectarse una vez, la red puede cambiarse desde Management.

## Seguridad

El endpoint de configuración exige un `deviceKey` válido y no se expone en la UI el password guardado. El firmware usa HTTPS; la validación TLS con certificado debe reemplazar `setInsecure()` antes de producción.
