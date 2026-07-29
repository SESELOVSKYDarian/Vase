# Vase Rest Edge

## Propósito

Vase Rest Edge es el servicio local de cada sucursal. Mantiene SQLite en modo WAL, autentica al personal, coordina las terminales por LAN, conserva el outbox offline y envía trabajos ESC/POS. PostgreSQL continúa siendo la fuente canónica cloud.

## Instalación

1. Instalar el MSI firmado como administrador en Windows 11 o Windows Server 2022.
2. Confirmar que el servicio `VaseRestEdge` está iniciado y que el firewall habilitó TCP 3443 únicamente para la subred privada.
3. Configurar certificado y clave TLS, URL cloud y clave pública de firma en el directorio protegido de datos.
4. Generar un código de enrolamiento desde Vase Rest, ingresarlo localmente y comprobar `/health`.
5. Emparejar cada navegador comprobando el `installationId` y la huella del certificado.

El directorio de datos se conserva al desinstalar para impedir una pérdida accidental. Su eliminación requiere una decisión explícita del operador después de verificar backup.

## Diagnóstico

- `/health`: estado de servicio, enrolamiento, WAL y migraciones.
- `/identity`: identidad, huella, última sincronización y cantidad pendiente.
- La cola de impresión expone estado, intentos y último error sólo a roles autorizados.
- Los logs del servicio nunca deben incluir PIN, tokens, certificados, claves o payloads de pago.

## Backup y recuperación

Detener `VaseRestEdge`, copiar el archivo SQLite junto con sus archivos `-wal` y `-shm`, el certificado y la clave pública cloud. La clave privada TLS se restaura únicamente desde el almacén secreto autorizado. Iniciar el servicio y validar salud, identidad, último watermark y backlog antes de habilitar terminales.

## Actualizaciones

El canal estable acepta sólo manifiestos Ed25519 del mismo canal y artefactos HTTPS cuyo SHA-256 coincida. El artefacto se descarga con extensión `.partial`, se valida y recién entonces se promueve. El instalador anterior y el directorio de datos se conservan hasta superar migraciones y el plazo de salud. Si falla, se reinstala la versión anterior; nunca se revierte el archivo SQLite destructivamente.

## Impresión

Las impresoras de red usan TCP 9100 configurable. Las USB/compartidas usan el spooler RAW de Windows. Una comanda KDS no depende del éxito de impresión: el trabajo queda `PENDING`, `PRINTED` o `FAILED`, deduplicado por ticket, revisión e impresora.

## Retiro

Revocar primero la instalación desde Vase Rest, detener el servicio, exportar diagnóstico y backup, desinstalar el MSI y quitar la regla de firewall. Conservar datos hasta cumplir la política contractual; luego eliminarlos mediante el procedimiento aprobado y registrado.
