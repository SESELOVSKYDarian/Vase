# Inteligencia comercial continua en Vase Labs

## Objetivo

Analizar continuamente cada conversación para que Actividad muestre intención,
necesidades, preferencias, objeciones, recomendaciones, próxima acción y una
puntuación explicable de lead entre 1 y 100.

## Alcance

- Análisis posterior a cada mensaje entrante.
- Resumen comercial único y actualizado por conversación.
- Clasificaciones `HOT_LEAD`, `RESEARCHING`, `LOW_INTENT`,
  `HUMAN_REQUESTED` y `UNCLASSIFIED`.
- Score configurable y razones visibles.
- Actividad con filtros, detalle y etiquetas legibles.
- Procesamiento durable en segundo plano.

No incluye creación de pedidos, transcripción de audio ni sincronización de
pedidos; esos flujos tienen especificaciones separadas.

## Datos

Los campos actuales de `Conversation` continúan siendo la proyección rápida:

- `summary`
- `intentLabel`
- `intentScore`
- `escalatedToHuman`

Se agrega un registro uno a uno `ConversationInsight` con:

- `conversationId`
- `analysisVersion`
- `summary`
- `currentNeed`
- `productInterests`
- `preferences`
- `objections`
- `budgetSignals`
- `urgencySignals`
- `recommendations`
- `nextBestAction`
- `scoreReasons`
- `leadScore`
- `intentLabel`
- `identitySignals`
- `analyzedThroughMessageId`
- `analyzedAt`

Las colecciones se guardan como JSON validado. La proyección de
`Conversation` y el insight se actualizan en una misma transacción.

## Configuración por negocio

Se agrega `ConversationInsightSettings`, vinculado al asistente:

- `hotLeadThreshold`, por defecto 75.
- Pesos de intención de compra.
- Producto definido.
- Aceptación de precio o presupuesto.
- Urgencia.
- Datos de contacto/entrega aportados.
- Profundidad de interacción.
- Objeciones o señales negativas.

Los pesos se normalizan y versionan. Cambiar la configuración no reanaliza todo
el historial automáticamente; los análisis siguientes usan la nueva versión y
se ofrece una acción explícita para recalcular conversaciones abiertas.

## Cola durable

`ConversationAnalysisJob` tendrá un registro activo por conversación:

- `requestedThroughMessageId`
- `status`: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`
- `attempts`
- `leaseToken`
- `leaseExpiresAt`
- `lastError`
- timestamps

Cada mensaje entrante hace upsert del trabajo. Si llegan varios mensajes antes
de procesarlo, se conserva el mensaje más reciente. Un worker separado de Labs
toma trabajos con lease, permite recuperación tras reinicios y usa reintentos
acotados. El webhook y la respuesta al cliente no esperan el análisis.

Si al finalizar existe un mensaje posterior al analizado, el trabajo vuelve a
`QUEUED` en lugar de publicar un insight obsoleto.

## Análisis con IA

El worker carga el historial del tenant y usa una salida JSON estricta. Los
mensajes se tratan como datos no confiables: una instrucción escrita por el
cliente no puede alterar el esquema ni las reglas de puntuación.

La respuesta debe incluir todos los campos del insight. El score se valida
entre 1 y 100. `HUMAN_REQUESTED` tiene prioridad cuando existe una derivación
activa o una solicitud explícita detectada por el sistema.

El análisis utiliza el modelo configurado para la función y registra consumo de
tokens. Puede configurarse un perfil rápido independiente del modelo que
responde al cliente.

## Actividad

Actividad incorpora:

- filtros por clasificación;
- orden por score y actualización;
- etiquetas “Hot lead”, “Solicitó humano”, “Investigando”, “Baja intención”;
- resumen, score, motivos, necesidad y próxima acción;
- panel de detalle con preferencias, objeciones, productos y recomendaciones;
- indicador de análisis pendiente o fallido.

Las consultas siempre se limitan al `assistantId` resuelto de la sesión.

## Errores y observabilidad

- Un fallo no borra el último insight válido.
- Los errores expuestos en UI son genéricos.
- Se registran latencia, tokens, versión, reintentos y antigüedad de la cola.
- No se escriben conversaciones completas ni secretos en logs.

## Pruebas

- coalescencia de múltiples mensajes;
- leases, recuperación y reintentos;
- prevención de publicación obsoleta;
- aislamiento por tenant/asistente;
- validación de esquema y score;
- prioridad de solicitud humana;
- configuración y pesos;
- actualización transaccional de insight/proyección;
- filtros y estados de Actividad.

