# Depósito IA: rediseño operativo claro/oscuro

Fecha: 2026-08-17

Estado: aprobado para planificación

## Objetivo

Convertir el módulo Depósito IA de Vase Management en una superficie operativa consistente, legible y funcional en tema claro y oscuro. La entrega cubre Dashboard, Productos, IA, Mapa/Racks, Dispositivos y Canales, reutilizando las APIs y la autenticación actuales.

La dirección visual aprobada es **Control operativo**: información crítica primero, densidad media-alta, acciones frecuentes visibles y una estética profesional alineada con el verde de Vase.

## Situación actual

El módulo ya dispone de rutas y endpoints para resumen, productos, sectores/racks, dispositivos, canales, comandos IA y acciones LED. Sin embargo, las vistas mezclan estilos aislados y clases de color fijas como `bg-white`, `text-gray-*` y `border-gray-*`, por lo que el modo oscuro es incompleto.

También faltan estados operativos consistentes: carga, error, vacío, confirmación, ejecución y resultado. Algunas acciones usan `alert`, ciertas consultas no se cargan inicialmente y varias operaciones no comunican claramente si fueron aceptadas o fallaron.

## Principios de diseño

1. **Estado antes que decoración.** Cada vista debe mostrar qué está conectado, qué está pendiente y qué requiere atención.
2. **Una acción principal por contexto.** Las acciones secundarias quedan agrupadas y las destructivas requieren confirmación.
3. **Paridad claro/oscuro.** Ninguna vista o estado puede depender de un color fijo pensado para un solo tema.
4. **Densidad operativa legible.** Tablas y mapas deben aprovechar escritorio sin perder usabilidad móvil.
5. **Feedback inmediato.** Toda operación asíncrona informa carga, éxito o error y permite reintentar cuando corresponde.
6. **Accesibilidad práctica.** Contraste AA, foco visible, controles de al menos 44 px y soporte para `prefers-reduced-motion`.

## Sistema visual

Se extenderán los tokens semánticos existentes de Vase Management en vez de crear una paleta paralela. Los componentes consumirán superficies, texto, bordes, estados y anillos de foco semánticos.

- Marca y acción principal: verde Vase.
- Estados: éxito, advertencia, error e información con fondo, borde y texto válidos en ambos temas.
- Superficies: fondo de aplicación, panel, panel elevado y superficie interactiva.
- Tipografía: jerarquía actual de Management; títulos editoriales únicamente donde ya formen parte del producto y tipografía de interfaz para datos y controles.
- Elevación: bordes sutiles y sombras contenidas; sin glassmorphism pesado ni brillos decorativos.
- Movimiento: transiciones de 150–250 ms para hover, expansión y feedback; sin animaciones continuas.

## Estructura compartida

Las seis vistas usarán una cabecera de módulo común con:

- título y descripción;
- indicador resumido del estado del depósito;
- acción principal contextual;
- acciones secundarias agrupadas;
- navegación existente en el sidebar, sin duplicarla dentro del contenido.

Se crearán primitivas reutilizables para:

- tarjetas métricas;
- badges de estado;
- paneles y encabezados de sección;
- skeletons, estados vacíos y errores recuperables;
- tablas responsivas;
- diálogos de confirmación;
- feedback de acciones y notificaciones;
- selector de sector/rack/fila;
- estado de dispositivos y comandos LED.

La lógica de datos permanecerá en hooks o servicios de cada dominio. Los componentes visuales no duplicarán llamadas ni reglas de negocio.

## Pantallas

### 1. Dashboard

El dashboard será el centro de control y mostrará:

- productos totales;
- productos sin LED asignado;
- dispositivos totales y online;
- alertas operativas;
- últimas búsquedas o actividad disponible;
- últimos comandos LED;
- accesos rápidos a producto nuevo, consulta IA, mapa y dispositivos.

Durante la carga se mostrarán skeletons con la misma geometría. Si el resumen falla, el resto de la pantalla seguirá utilizable y el panel afectado ofrecerá reintento.

### 2. Productos

La vista tendrá búsqueda inmediata con debounce, filtros por sector y rack, contador de resultados y tabla responsiva con código, nombre, ubicación y LED.

Acciones:

- crear producto;
- editar producto;
- asignar o modificar LED;
- probar LED;
- apagar LEDs;
- activar o desactivar cuando el contrato actual lo permita.

Crear y editar compartirán formulario y validación. En móvil, la tabla se convertirá en tarjetas operativas sin ocultar código, ubicación ni LED. Las acciones LED informarán dispositivo objetivo, duración y resultado.

### 3. Mapa/Racks

La navegación seguirá la jerarquía sector → rack → fila. La cuadrícula mostrará:

- posición e índice LED;
- producto asignado;
- estados libre, ocupado, seleccionado, activo y conflicto;
- leyenda persistente;
- búsqueda de producto o LED.

La reasignación se resolverá mediante una selección explícita y confirmación resumida. No se implementará drag-and-drop como mecanismo exclusivo, para conservar precisión táctil y accesibilidad por teclado.

### 4. IA de depósito

El chat será una herramienta operativa, no una pantalla decorativa. Incluirá:

- sugerencias de comandos iniciales;
- envío con Enter y salto de línea con Shift+Enter;
- estado de procesamiento;
- mensajes de usuario, respuesta y error diferenciados;
- tarjetas estructuradas para productos y ubicaciones;
- propuestas de cambio antes de ejecutar operaciones importantes;
- botones confirmar, cancelar y editar cuando el contrato lo permita;
- preparación visual para adjuntar imagen o audio, activada solo cuando exista soporte real en el endpoint.

Una propuesta confirmada quedará deshabilitada para evitar ejecuciones duplicadas y mostrará el resultado final.

### 5. Dispositivos

Cada ESP32 mostrará estado online/offline, último ping, clave enmascarada, cantidad de LEDs, brillo y máximo activo cuando esos datos estén disponibles.

Acciones:

- probar conexión;
- probar LED;
- apagar todos;
- editar configuración soportada.

Los estados online se calcularán con la regla existente del backend; la UI no inventará una segunda interpretación. Las operaciones masivas o de apagado requerirán confirmación cuando afecten más de un dispositivo.

### 6. Canales

Telegram y WhatsApp mostrarán estado configurado, pendiente, conectado o con error, junto con el siguiente paso accionable. Las credenciales sensibles nunca se mostrarán completas.

La vista distinguirá claramente entre configuración guardada y canal realmente operativo. Los errores del proveedor o del webhook se presentarán como diagnóstico recuperable, no como un estado genérico.

## Flujo de datos y acciones

1. La vista solicita datos al endpoint actual.
2. La UI muestra skeleton o estado de procesamiento.
3. La respuesta se normaliza en el hook/servicio de la pantalla.
4. El componente presenta datos, vacío o error recuperable.
5. Las mutaciones bloquean únicamente el control involucrado.
6. Al completar, se actualizan los datos afectados y se muestra feedback persistente o toast según importancia.
7. Las acciones críticas incluyen confirmación y protección contra doble envío.

No se modificarán la autenticación centralizada, la selección de base de datos ni los contratos públicos sin evidencia de que una interacción requerida carece de soporte.

## Manejo de errores

- Error de lectura: panel de error local con reintento.
- Error de mutación: mensaje junto a la acción y toast resumido.
- Sin conexión: conservar datos previos si existen y marcar que pueden estar desactualizados.
- Respuesta inválida: mensaje operativo y registro en consola solo en desarrollo.
- Permiso insuficiente: ocultar o deshabilitar acciones según el contexto de autorización actual.
- Dispositivo offline: impedir pruebas LED y explicar el motivo.

## Responsive y accesibilidad

- 375 px: una columna, tablas en tarjetas y acciones prioritarias visibles.
- 768 px: paneles en dos columnas cuando el contenido lo permita.
- 1024–1440 px: dashboard y tablas densas, con anchos máximos legibles.
- Navegación completa por teclado.
- Etiquetas accesibles para botones con icono.
- Foco visible y contraste mínimo 4.5:1 para texto normal.
- No usar color como único indicador de estado.
- Respetar reducción de movimiento.

## Verificación

La implementación se considerará lista cuando:

- las seis rutas rendericen correctamente en claro y oscuro;
- no queden colores de superficie hardcodeados que rompan el tema;
- Dashboard, Productos e IA cubran carga, vacío, error y éxito;
- crear/editar/buscar productos y las acciones LED soportadas funcionen contra sus endpoints reales;
- las propuestas IA no puedan confirmarse dos veces;
- mapa, dispositivos y canales comuniquen estados reales;
- la vista sea usable en 375, 768, 1024 y 1440 px;
- TypeScript, lint y build del alcance modificado pasen, salvo bloqueos externos documentados.

## Fuera de alcance

- Cambiar la arquitectura de autenticación o las bases de datos.
- Reescribir servicios centrales de warehouse que ya funcionen.
- Simular soporte de audio o imagen si el endpoint productivo aún no lo ofrece.
- Cambiar firmware ESP32 o el protocolo de polling.
- Introducir una librería visual nueva si los componentes existentes son suficientes.

