# Cobros de Vase con Mercado Pago

## Objetivo

Permitir que los clientes paguen los productos de Vase desde la cuenta central de la plataforma. La aplicación de Mercado Pago Vase está creada para Argentina con el producto Suscripciones.

## Modelo comercial

- Business personalizado: ARS 950.000 por página, en dos pagos de ARS 475.000 (al inicio y contra entrega), y ARS 175.000 mensuales por hosting, mantenimiento y soporte.
- Labs y Management conservan sus precios y condiciones vigentes configurados en Vase. Los cargos únicos, incluidos setup y paquetes de tokens cuando corresponda, se cobran por separado de los abonos.
- Los precios, la moneda y la periodicidad se resuelven en el servidor a partir de ofertas confiables; nunca se aceptan importes del navegador.
- Las condiciones del plan Business Base requieren definición comercial antes de ofrecerlas para cobrar.

## Arquitectura

`vase-app` concentra la facturación por cuenta y producto, aprovechando la identidad, los permisos y las configuraciones existentes. Mercado Pago Suscripciones gestiona cargos recurrentes mediante una suscripción por oferta contratada. Checkout Pro gestiona cargos únicos. Cada operación se vincula con una referencia persistente de Vase y se muestra en la sección de facturación del cliente autorizado.

En la pantalla «Plan y pagos», el cliente encuentra los cargos pendientes registrados para su cuenta y accede desde cada uno al pago correspondiente. La segunda cuota de Business se habilita contra entrega, no simultáneamente con la primera por defecto.

El servidor crea las operaciones con credenciales privadas. El cliente completa el pago en Mercado Pago. Volver al sitio no acredita un pago por sí solo: los estados se reconcilian con la API de Mercado Pago y notificaciones autenticadas. La activación y suspensión deben preservar las reglas de acceso existentes y distinguir pago de alta de suscripción de los cobros periódicos.

## Seguridad y estados

Solo usuarios autorizados de la cuenta pueden iniciar o administrar cobros. Se previenen envíos duplicados y se registran los identificadores externos sin exponer secretos. Se contemplan suscripciones pendientes, autorizadas, pausadas y canceladas; pagos pendientes, aprobados, rechazados y revertidos; reintentos y notificaciones duplicadas o fuera de orden. No se almacenan datos de tarjetas.

## Entrega y verificación

1. Confirmar el catálogo comercial aplicable, la contratación de Business y los puntos de entrada existentes.
2. Preparar el modelo persistente y la interfaz de facturación central, con pruebas de autorización y aislamiento entre cuentas.
3. Integrar suscripciones, checkout de cargos únicos, conciliación y notificaciones firmadas.
4. Actualizar precios públicos que contradigan el modelo confirmado, sin inventar condiciones para ofertas no definidas.
5. Probar con credenciales y cuentas de prueba, verificar estados y solicitar una prueba completa explícita antes de cualquier operación que pueda generar cargos. Revisar la integración antes de habilitar producción.
