# Acceso individual a Vase Labs desde Admin

## Objetivo

Permitir que el Super Admin asigne, cambie o quite el acceso de Vase Labs a un cliente individual sin modificar el catálogo global de planes ni afectar a otros clientes.

## Comportamiento aprobado

- Cada cliente puede tener como máximo un plan de Vase Labs activo.
- Los planes disponibles siguen viniendo del catálogo global: Starter, Pro y Growth, además de cualquier plan válido agregado al catálogo.
- Cambiar el plan desactiva la relación Labs anterior del cliente y activa la seleccionada.
- Elegir `Sin acceso` desactiva el acceso Labs del cliente y conserva los registros para auditoría y recuperación.
- No se eliminan filas del catálogo global ni planes asignados a otros clientes.

## Flujo de datos

1. El editor carga los planes activos del catálogo.
2. El Admin selecciona `Trial`, `Activo` o `Sin acceso`.
3. Para un acceso activo, el editor envía el `submoduleId`, la clave del plan y el estado comercial.
4. El servicio valida que el plan pertenezca al módulo `vase_labs` y esté activo.
5. En una transacción, se desactivan los planes Labs anteriores del tenant y se activa o desactiva únicamente el seleccionado.
6. Se actualiza el estado de entitlement de Labs y se registra el cambio de acceso.

## Seguridad y compatibilidad

- Se mantiene la autorización existente de Super Admin.
- Se mantiene la validación de catálogo existente.
- Quitar acceso no borra el tenant, el workspace ni el historial de auditoría.
- Business, Rest y Management no cambian.

## Verificación

- Test de asignación de un plan Labs.
- Test de cambio de un plan a otro.
- Test de retiro del plan con `Sin acceso`.
- Lint y pruebas existentes del flujo de acceso.
