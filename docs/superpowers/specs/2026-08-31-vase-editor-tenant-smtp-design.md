# Vase Editor: Correo SMTP por tenant — diseño

## Objetivo

Separar la configuración técnica de correo de Checkout y añadir una sección Correo nativa de Evolution. Cada tenant podrá usar SMTP genérico sin perder compatibilidad con Gmail existente ni con el fallback SMTP global.

## Arquitectura

- La UI agrega `Correo` al grupo Operación de `EvolutionSidebar` y lo renderiza desde `EvolutionAdmin`, reutilizando patrones de cards, inputs, feedback y breakpoints de Evolution. Checkout conserva solamente controles comerciales.
- Todos los campos permanecen en `tenant_settings.commerce`; no se añaden tablas. La contraseña SMTP se acepta únicamente al guardar y se omite de todas las respuestas de settings. Un input vacío al editar conserva el secreto anterior.
- `mailer.js` concentra la resolución, transporte, verificación, envío y clasificación de errores. Prioridad: SMTP explícito, SMTP tenant, Gmail legacy y variables globales.

## Datos y compatibilidad

`commerce` añade `smtp_host`, `smtp_port`, `smtp_secure`, `smtp_user`, `smtp_password`, `smtp_from` y `smtp_from_name`. `email` permanece como email visible y `order_notification_email` como destinatario administrativo.

Las claves heredadas `gmail_sender_email` y `gmail_app_password` no se eliminan. Cuando faltan credenciales genéricas se emplean como fallback, con host Gmail por defecto salvo un SMTP explícito configurado por tenant.

## UX y seguridad

Correo contiene tres cards: identidad, servidor SMTP y diagnóstico. Ofrece SSL/TLS y STARTTLS, muestra estados seguros, valida junto a los campos y se apila a una columna en móvil. La contraseña nunca se vuelve a mostrar: una configuración existente aparece como `Contraseña configurada` y sólo una contraseña nueva la reemplaza.

Un router protegido bajo `/api/admin/settings/email` obtiene y guarda el modelo saneado, ejecuta `transporter.verify()` y envía pruebas. Se validan host, puerto, usuario, remitente, contraseña inicial y destinatario tanto en frontend como backend. Las respuestas y logs no contienen secretos; los errores se clasifican como configuración, conexión, autenticación, TLS, timeout o envío.

## Límites y validación

No se cambia DNS, MX, SPF, DKIM, DMARC ni proveedor. No se instala software: se reutiliza Nodemailer. Pruebas unitarias cubren la prioridad SMTP, fallback Gmail/global, validación, sanitización y clasificación. Se ejecutan tests, lint, build web, parseo del servidor y revisión responsive.
