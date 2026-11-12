# Textos de interfaz en Vase

Quien usa Vase es dueño de una pyme, un encargado o un mozo en plena hora pico. Escribí para esa persona.

## Reglas

- **Voseo rioplatense**: "Elegí", "Tocá", "Entrá", "Podés". Nunca "elija", "elige", "puedes".
- **Corto y concreto**: una idea por frase. Subtítulos de 3 a 7 palabras.
- **Decí qué pasa y qué hacer**: "Cambios sin publicar" + botón "Publicar". "La sucursal no responde. Revisá que el servidor esté prendido."
- **Sin jerga interna** en pantallas de cliente: no "tenant", "Edge", "WAL", "canonical", "entitlement", "sync durable", códigos de error crudos. Sí "tu negocio", "el servidor de la sucursal", "se sincroniza solo".
- **Mayúscula solo al principio** (estilo oración). Nada de Title Case ni TODO MAYÚSCULAS.
- **Números y plata en es-AR**: `toLocaleString("es-AR")`, `$ 1.234,50`, fechas "12 nov".
- **Sin signos de exclamación** ni emojis en la interfaz del panel.
- Puntos suspensivos con el carácter `…` en estados de carga ("Guardando…").

## Títulos y subtítulos (barra superior)

| Sección | Título | Subtítulo |
| --- | --- | --- |
| Business · Resumen | Resumen | Esto es lo que pasa hoy en tu tienda |
| Business · Pedidos | Pedidos | Todo lo que entra por la tienda |
| Business · Ajustes | Ajustes | Lo que se configura una vez |
| Rest · Inicio (dueño) | Inicio | Así está tu negocio hoy |
| Rest · Salón | Salón | Mesas en vivo: abrir, unir y liberar |
| Rest · Caja › Cuentas corrientes | Cuentas corrientes | Clientes que pagan después |

## Estados

| Situación | Texto |
| --- | --- |
| Todo bien | Todo publicado · Todo sincronizado |
| Cambios locales | Cambios sin publicar · 3 por sincronizar |
| Sin internet (Rest) | Sin conexión — "Podés seguir trabajando: la sucursal guarda todo y lo sincroniza cuando vuelva internet." |
| Servidor local caído (Rest) | La sucursal no responde — "Frenamos la operación para no mezclar datos…" |
| Cargando | Preparando tus datos… · Validando acceso… |
| En proceso | "Estamos preparando esta guía" · "{Sección} todavía está en el panel anterior" |

## Vacíos

Explican por qué no hay nada y proponen el próximo paso:

- "Todavía no entraron pedidos." (+ nada, porque no depende del usuario)
- "Cuando entren pedidos vas a ver acá lo que más se vende."
- "Todavía no conectaste ninguna sucursal" + "Instalá Vase Rest Edge en la sucursal para que siga trabajando aunque se corte internet." + botón "Conectar una sucursal".

## Errores

- Humanos y accionables: "Código o PIN incorrecto." · "No se pudo publicar: {detalle}".
- Si solo hay un código técnico, mostrar una frase y dejar el código entre paréntesis o en el detalle, no solo el código.

## Botones

Verbo + objeto, cortos: "Publicar", "Crear sucursal", "Ver todos", "Abrir en el panel anterior", "Cerrar turno",
"Ingresar al panel", "Soy del equipo". Confirmaciones destructivas en rojo y con el objeto explícito
("Sí, cerrar sesión").

## Roles de Rest

OWNER = Dueño · MANAGER = Encargado · CASHIER = Caja · WAITER = Mozo · KITCHEN = Cocina · STOCK = Depósito · DELIVERY = Delivery.
