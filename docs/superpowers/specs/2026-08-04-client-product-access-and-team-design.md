# Diseño: acceso por producto y equipo de clientes

Fecha: 2026-08-04

## Objetivo

Simplificar la creación y edición de clientes en `admin.vase.ar`, hacer que la asignación de Vase Rest sea funcional de extremo a extremo y permitir que cada Owner administre Managers y Members desde `app.vase.ar` sin acceder a contratos ni límites comerciales.

El resultado debe eliminar del flujo comercial los conceptos técnicos de tenant y representar cada producto con su propio modelo de plan, submódulos, características y límites.

## Problema actual

- La selección de `vase_rest` se persiste, pero el menú Proyectos solo construye accesos para Business y Labs.
- Vase Rest necesita además un contrato activo; seleccionar únicamente el módulo deja el acceso incompleto.
- El modal mezcla identidad comercial, implementación multitenant, membresías, planes globales, submódulos y límites en una misma pantalla.
- Labs se presenta como si pudiera elegir varios submódulos y configurar una cantidad de chatbots, aunque su producto se vende como un único nivel de canales.
- No existe un flujo de autoservicio para que el Owner invite y administre a su equipo.
- No queda registrada de manera explícita la persona que invitó a cada integrante del tenant.

## Principios del diseño

1. El Super Admin configura productos y contratos; el Owner distribuye accesos ya contratados.
2. Los estados internos del tenant no se exponen en el modal comercial.
3. Cada producto mantiene su propio estado comercial, plan y límites.
4. Una asignación se guarda de manera atómica: no puede existir un enlace sin entitlement ni un contrato sin los accesos correspondientes.
5. Los catálogos globales se administran una vez; las cuentas cliente solo seleccionan configuraciones permitidas.
6. Las invitaciones usan enlaces de un solo uso; ningún administrador comparte contraseñas.

## Modelo funcional

### Cuenta cliente

Al crear un usuario con rol de interfaz `cliente`, el sistema crea o reutiliza su tenant y aplica automáticamente:

- rol de membresía `OWNER`;
- membresía `ACTIVE`;
- tenant `ACTIVE`;
- nombre interno derivado del nombre del cliente;
- slug único generado por el sistema;
- email de facturación igual al email del Owner;
- industria interna predeterminada cuando sea necesaria por compatibilidad.

El modal no muestra ni permite editar nombre del tenant, slug, nombre comercial, industria, estado del tenant, rol de membresía o estado de membresía. La identidad visible del cliente continúa siendo nombre y email del usuario Owner.

### Estado comercial

`Trial` y `Activo` se guardan por producto o submódulo, no en un plan global de la cuenta. La interfaz puede mostrar `Pro` como nombre de un nivel comercial, pero el estado operativo se representa de forma independiente para evitar confundir nivel y vigencia.

### Vase Business

Business contiene dos submódulos comerciales independientes:

- Plantilla;
- Personalizado.

Cada submódulo puede estar desactivado, en Trial o activo con su configuración comercial. Ambos pueden coexistir y tener estados diferentes.

Las capacidades como tienda, reservas o facturación son características, no submódulos. Cada submódulo seleccionado permite abrir `Configurar características`, donde el Super Admin puede habilitar capacidades y ajustar límites para ese cliente.

El catálogo global de características se administra en `admin.vase.ar/modules`: nombre, descripción, orden, disponibilidad, valores predeterminados por nivel y tipo de límite. El editor del cliente solo consume ese catálogo.

### Vase Labs

Labs permite elegir exactamente un nivel:

- Starter: un canal de WhatsApp;
- Pro: un canal de WhatsApp y un canal de Instagram;
- Growth: un canal de WhatsApp, un canal de Instagram y un canal de Facebook Messenger.

El nivel se combina con un estado comercial Trial o Activo. No se muestra ni persiste un límite manual de chatbots en el editor del cliente. Los límites de canales se derivan del nivel seleccionado y se sincronizan con el workspace real de Labs.

### Vase Rest

Al habilitar Rest, el Super Admin debe seleccionar una versión de plan publicada y un estado comercial Trial o Activo. El formulario no ofrece submódulos ni límites de páginas/chatbots.

El guardado sincroniza dentro de una única transacción:

1. contrato Rest del tenant con la versión publicada elegida;
2. estado y límites derivados de esa versión;
3. `TenantModule` activo para `vase_rest`;
4. `UserModuleAccess` activo para el Owner;
5. datos necesarios para el contexto firmado de Rest.

Si Rest se desactiva, se desactiva el acceso del módulo y el contrato deja de autorizar nuevas sesiones sin eliminar datos operativos del restaurante.

El shell de cliente incluirá Rest al construir Proyectos. El enlace será `https://rest.vase.ar` y usará la sesión compartida existente. Solo se mostrará cuando tenant, contrato y acceso del usuario sean válidos.

## Interfaz de Super Admin

### Modal Editar usuario

Se conserva el flujo general del modal, pero el paso Cliente se reemplaza por tarjetas desplegables por producto.

La cabecera muestra únicamente el nombre, email y la leyenda `Owner de la cuenta · configuración automática`.

Cada tarjeta resume su estado sin abrirla:

- Business: cantidad de submódulos activos y estado de cada uno;
- Labs: nivel, estado y canales incluidos;
- Rest: plan publicado, estado y confirmación de acceso en Proyectos.

Al desplegar una tarjeta aparecen solo controles pertinentes a ese producto. Los cambios se guardan mediante un único botón `Guardar accesos`. La interfaz bloquea el doble envío y mantiene los valores ingresados si el servidor rechaza la operación.

### Fila del Owner y equipo

La fila de cada Owner incorpora `Ver equipo (N)`. La vista lista todas las membresías Manager y Member del mismo tenant con:

- nombre y email;
- rol;
- módulos asignados;
- estado activo, invitación pendiente o suspendido;
- acciones Editar, Suspender/Reactivar y Reenviar invitación cuando corresponda.

El Super Admin puede editar rol, subconjunto de módulos y estado de estos integrantes. No puede convertir a otro integrante en Owner ni quitar al Owner principal desde esta vista.

## Autoservicio del Owner

`app.vase.ar` incorpora una sección `Equipo`, visible solo para Owners.

El Owner puede:

- invitar una persona por nombre y email;
- elegir rol Manager o Member;
- elegir un subconjunto de los módulos activos del tenant;
- revisar invitaciones pendientes;
- reenviar o revocar invitaciones;
- modificar accesos futuros;
- suspender o reactivar integrantes.

El Owner no puede habilitar productos no contratados, elegir planes, cambiar Trial/Activo, modificar límites ni editar catálogos globales.

Cada invitación registra tenant, email normalizado, rol, módulos, creador, token hasheado, vencimiento, aceptación y revocación. El correo contiene un enlace de un solo uso para definir contraseña y activar la membresía. Si el email ya pertenece a un usuario Vase, el enlace vincula ese usuario al tenant sin crear un duplicado.

Managers y Members ven únicamente los productos que están activos para el tenant y además fueron asignados explícitamente a su usuario.

## Límites y características globales

La administración de módulos se amplía con un catálogo de características asociado a módulo y, cuando corresponda, a submódulo. Una característica define:

- clave estable;
- nombre y descripción;
- orden de presentación;
- estado global;
- tipo de valor: booleano, cantidad o texto controlado;
- valor predeterminado por nivel comercial;
- restricciones mínimas y máximas para cantidades.

La asignación por cliente guarda únicamente las excepciones y valores efectivos necesarios. El servicio de entitlements resuelve el valor final combinando catálogo, nivel y personalización del tenant.

## Integridad y autorización

- Todas las mutaciones de Super Admin exigen el permiso administrativo de usuarios o módulos correspondiente.
- Las mutaciones de equipo exigen una membresía Owner activa en el mismo tenant.
- El servidor vuelve a validar que cada módulo asignado al equipo esté activo en el tenant.
- Los identificadores de plan Rest deben apuntar a una versión publicada.
- Labs rechaza cero o más de un nivel cuando el módulo está activo.
- Business rechaza características que no pertenezcan al submódulo indicado.
- Los límites numéricos respetan el tipo y rango del catálogo.
- Los cambios comerciales, invitaciones y accesos generan eventos de auditoría.

## Manejo de errores

- Si falla cualquier parte del guardado comercial, se revierte toda la transacción y se muestra un mensaje específico por producto.
- Si un plan Rest fue archivado o reemplazado mientras el modal estaba abierto, el servidor rechaza el guardado y solicita elegir una versión publicada vigente.
- Si el envío del correo falla, la invitación queda pendiente y puede reenviarse; no se marca como aceptada.
- La aceptación de un token vencido, revocado o utilizado muestra una pantalla segura y permite solicitar un reenvío al Owner.
- La revocación de acceso invalida nuevas sesiones de producto. Los datos del tenant no se eliminan.
- La UI nunca interpreta un guardado parcial como éxito.

## Compatibilidad y migración

Los clientes existentes se migran sin perder acceso:

- membresías Owner existentes permanecen Owner;
- el plan global actual se traduce a estados iniciales por producto;
- accesos Business existentes se asignan a Plantilla/Personalizado según `TenantSubmodule`;
- Labs deriva su nivel desde el submódulo/workspace vigente y normaliza cualquier selección múltiple a un único nivel efectivo;
- Rest solo se muestra si existe contrato válido; asignaciones antiguas sin contrato quedan marcadas para corrección administrativa y no obtienen un enlace inválido;
- los accesos explícitos de usuarios existentes se preservan.

La migración debe ser idempotente y producir un reporte de filas normalizadas o pendientes.

## Pruebas y criterios de aceptación

### Servicios y datos

- Crear un cliente produce tenant activo, Owner activo y accesos consistentes.
- Editar un cliente no modifica slug, industria ni rol Owner desde el payload de UI.
- Cada producto conserva estado y plan independientes.
- Business admite Plantilla y Personalizado con estados distintos y características válidas.
- Labs admite exactamente un nivel y deriva correctamente sus canales.
- Rest crea contrato, entitlement y accesos en una transacción.
- Un fallo deliberado durante la asignación Rest revierte todos los cambios.

### Navegación

- Un Owner con Rest válido ve `Vase Rest` dentro de Proyectos.
- El enlace abre `rest.vase.ar` y el contexto de sesión se resuelve sin `REST_CONTRACT_INACTIVE`.
- Un usuario sin Rest o sin contrato válido no ve el enlace.

### Equipo

- Solo un Owner activo puede invitar Managers o Members.
- La invitación envía un enlace de un solo uso y registra al creador.
- Un usuario existente puede aceptar sin duplicarse.
- El Owner solo puede asignar módulos contratados por su tenant.
- El Super Admin ve, edita, suspende y reactiva el equipo desde la fila del Owner.
- Managers y Members no pueden modificar contratos, planes ni límites.

### Interfaz

- El paso Cliente no contiene campos técnicos del tenant o membresía.
- Las tarjetas muestran resúmenes correctos y controles específicos por producto.
- No aparecen chatbots en Rest ni un contador manual de chatbots en Labs.
- Los errores mantienen los datos del formulario y el éxito refresca tanto la fila como el acceso del cliente.
- El flujo es utilizable por teclado y comunica estados, errores y controles mediante texto además de color.

## Fuera de alcance

- Permitir que Managers creen otros usuarios.
- Permitir que Owners contraten o cambien planes.
- Eliminar datos operativos al retirar acceso.
- Reemplazar al Owner principal desde la vista de equipo.
- Rediseñar los productos Business, Labs o Rest fuera de sus entitlements y puntos de entrada.
