# Vase Labs: versionado de documentos desde el Entrenador

## Objetivo

Permitir que un entrenador autorizado solicite por texto o audio cambios sobre conocimiento existente dentro de archivos, sin convertirlos en FAQs paralelas ni sobrescribir el archivo original. Cada cambio debe ser identificable, confirmable, auditable y reversible desde Conocimiento.

## Decisiones

- El objeto original almacenado en S3-compatible permanece inmutable.
- Una edición confirmada crea una nueva versión efectiva vinculada al `KnowledgeItem` original.
- La restauración no borra revisiones: crea una nueva revisión cuyo contenido coincide con la versión elegida.
- La IA comercial consume únicamente la versión activa más reciente.
- Ninguna instrucción del Entrenador modifica conocimiento sin confirmación explícita.
- Si no existe una coincidencia inequívoca con un archivo, el Entrenador solicita aclaración y no crea una FAQ como sustituto.

## Identificación del documento

El worker de audio carga fuentes `READY`, incluyendo `content`, `extractedText` y la versión activa. Un selector local normaliza la instrucción, puntúa títulos y fragmentos por términos relevantes y entrega a OpenAI los documentos con mejor coincidencia.

Los extractos se construyen alrededor de las coincidencias, en vez de enviar solamente los primeros caracteres. La IA devuelve el `targetKnowledgeId`, el fragmento vigente afectado y el reemplazo propuesto. Para instrucciones sobre un dato ya localizado en un archivo, el tipo debe ser `DOCUMENT_CORRECTION`.

Si dos documentos obtienen una relevancia similar o no aparece el dato vigente, la propuesta se rechaza como ambigua y la respuesta de WhatsApp pide el nombre del archivo o más contexto.

## Modelo de versiones

`KnowledgeItem` continúa representando el archivo original y conserva `objectKey`, checksum y texto extraído. `KnowledgeRevision` registra cada cambio confirmado con antes/después, actor, propuesta y número de revisión. `KnowledgeCorrection` representa el contenido efectivo derivado del archivo.

La corrección debe almacenar el contenido completo efectivo de la versión, no solamente una frase aislada. Al crear una versión:

1. Se toma el texto efectivo actual.
2. Se aplica el reemplazo estructurado confirmado.
3. Se crea una revisión con el contenido anterior y el nuevo.
4. Se desactiva la corrección activa anterior.
5. Se crea la nueva corrección activa dentro de la misma transacción.

## Confirmación y conflictos

La propuesta conserva la revisión base consultada. Al recibir `CONFIRMAR`, el sistema compara esa revisión con la actual. Si cambió, vuelve a calcular la edición sobre el texto vigente y solicita una nueva confirmación.

Una confirmación enviada como audio se transcribe y se dirige primero al flujo de propuestas pendientes; no se interpreta como una instrucción nueva.

## Interfaz de Conocimiento

Cada tarjeta o fila de archivo muestra un botón con icono de historial. Al abrirlo se presenta un panel con:

- versión activa;
- fecha y número de revisión;
- entrenador que originó el cambio;
- instrucción o transcripción original;
- resumen del antes y después;
- acción `Restaurar esta versión`.

La restauración exige confirmación en Labs. El archivo original aparece como versión inicial y siempre puede restaurarse. La nueva revisión de restauración queda visible en el mismo historial.

## Consumo por la IA

Al construir contexto, el sistema usa el texto extraído original cuando no hay correcciones. Si existe una corrección activa, usa su contenido completo. Nunca reemplaza un documento entero por una frase suelta.

El Entrenador utiliza el mismo resolvedor de versión efectiva, evitando que analice una versión distinta de la que responde a clientes.

## Errores y observabilidad

- La Inbox del Entrenador muestra por separado transcripción y código de error.
- Los errores técnicos permanecen reintentables con límite.
- Las instrucciones ambiguas generan aclaración y no consumen reintentos técnicos repetidos.
- Se registran documento candidato, revisión base y resultado de aplicación sin exponer claves o contenido sensible en logs.

## Pruebas de aceptación

- Una instrucción sobre el horario de una sucursal localizado dentro de un archivo genera `DOCUMENT_CORRECTION` con el ID correcto.
- Un término ubicado lejos del inicio del archivo puede encontrarse mediante extractos relevantes.
- Dos archivos igualmente plausibles fuerzan aclaración.
- Confirmar crea una nueva versión y mantiene intacto el objeto original.
- La IA consume el documento completo corregido.
- El icono de historial abre las revisiones del archivo.
- Restaurar una versión crea otra revisión y cambia la versión activa.
- Revertir al original funciona sin eliminar el historial posterior.
- Un conflicto de revisión exige reconfirmación.

## Fuera de alcance

- Reescribir o volver a subir automáticamente archivos PDF, DOCX u otros binarios.
- Editar permisos, canales o configuración mediante el Entrenador.
- Elegir automáticamente entre documentos cuando la coincidencia sea ambigua.
