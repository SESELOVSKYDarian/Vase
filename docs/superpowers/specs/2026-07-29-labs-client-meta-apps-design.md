# Labs: aplicaciones Meta administradas por cada cliente

## Objetivo

Permitir que cada cliente conecte Facebook Messenger, Instagram o WhatsApp con su propia aplicación Meta desde Vase Labs, sin acceso a variables de infraestructura y sin compartir credenciales entre canales.

## Requisitos de Meta

Para Messenger, el cliente debe proporcionar una aplicación Meta con el caso de uso de Messenger, una página autorizada, un token válido y los permisos `pages_messaging` y `pages_manage_metadata`. Labs debe verificar la identidad del token, obtener o validar el Page Access Token y suscribir la página a `messages`, `messaging_postbacks`, `message_deliveries` y `message_reads`.

## Arquitectura

Cada canal `META_OFFICIAL` mantiene:

- `metaAppId` dentro de `Channel.config`, porque es un identificador público necesario para validar el token.
- `META_APP_SECRET` cifrado dentro de `ChannelSecret`.
- `META_ACCESS_TOKEN` cifrado dentro de `ChannelSecret`.
- `providerAccountId` con el ID de la página, cuenta profesional o número.
- `subscribedFields` únicamente después de que Meta confirme la suscripción.

Las variables `META_APP_ID` y `META_APP_SECRET` permanecen como compatibilidad para instalaciones antiguas, pero no son necesarias cuando el cliente cargó sus credenciales en el canal.

## Flujo de conexión de Messenger

1. El cliente abre Facebook en Labs.
2. Carga Meta App ID, Meta App Secret, Facebook Page ID y Access Token.
3. Labs cifra los secretos antes de persistirlos.
4. Labs valida el token con `/debug_token` usando el App ID y App Secret cargados.
5. Labs obtiene la identidad mediante `/me`; si recibe un User Access Token, obtiene el Page Access Token desde `/me/accounts`.
6. Labs comprueba los permisos requeridos.
7. Labs suscribe la página mediante `/{PAGE_ID}/subscribed_apps`.
8. Labs guarda los campos suscriptos y marca el canal conectado solo cuando webhook, credenciales, activo y suscripción están completos.
9. Los eventos entrantes usan el App Secret guardado en ese canal para validar `X-Hub-Signature-256`.
10. El mensaje continúa por el servicio compartido de Inbox, agente IA, intervención humana, actividad y pedidos.

## Interfaz

La configuración avanzada incorpora `Meta App ID`. El botón de comprobación guarda y valida todos los valores modificados. Los campos secretos nunca regresan en texto plano, salvo mediante el flujo de reautenticación existente para revelar el token.

Los estados de salud no pueden considerar un activo validado solo porque exista `providerAccountId`; una validación pendiente o con error debe mostrarse como pendiente.

## Compatibilidad

Los canales existentes continúan usando sus secretos guardados. Si no tienen `metaAppId`, pueden usar temporalmente `META_APP_ID` de infraestructura o pedir al cliente que complete el nuevo campo. Instagram Login con tokens `IGAA` conserva su flujo actual.

## Criterios de aceptación

- Dos canales del mismo tenant pueden pertenecer a aplicaciones Meta diferentes.
- Facebook puede conectarse sin configurar `META_APP_ID` ni `META_APP_SECRET` en EasyPanel.
- Un token perteneciente a otra aplicación se rechaza con un error específico.
- Una suscripción fallida no aparece como activa.
- Un mensaje de Messenger llega al Inbox y usa el mismo agente IA que WhatsApp e Instagram.
- Las credenciales no aparecen en respuestas, logs ni errores.
