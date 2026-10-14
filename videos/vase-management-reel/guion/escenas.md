# Reel Vase Management — escenas

1080x1920 · ~45 s de voz (estimado con la velocidad real medida en el reel de Labs: 3,5 palabras/s + pausas).
Mensaje central: **cargás una vez y todo cierra** (la venta mueve el stock, la cuenta corriente y el tablero sin cargar nada dos veces).
Estructura: gancho con dolor → escena dramática en silencio → DROP con logo → 5 pantallas de la app → remate de dos frases → CTA.

Los tiempos son estimados. Cuando esté la voz, usá `timing.json` y disparo por palabra.

- **HF** = escena tipográfica (HyperFrames).
- **RM** = pantalla de app (Remotion). Copiá los títulos, columnas, estados y toasts tal cual están entre comillas, porque son los textos reales de la UI.

## Portada, primer cuadro y posteo

- **Portada:** "Vendiste algo que no tenías. Otra vez." Va en dos líneas y la segunda ("Otra vez.") más grande, en rojo/alerta. Sin logo grande; como mucho un "Vase Management" chico abajo.
- **Primer cuadro (frame 0):** "Vendiste algo que no tenías." Va en tipografía grande, sin logo, con el subtítulo ya visible desde el cuadro 0.
- **Texto del posteo:**

> Vendiste algo que no tenías. Otra vez.
> Con Vase Management cada venta descuenta el stock sola, el sistema no te deja vender lo que no hay y te avisa qué reponer. Los pedidos de tu tienda online entran solos, ves quién te debe y cuánto, y tenés tus ventas y tu caja en una sola pantalla.
> Cargás una vez. Y todo cierra.
> Escribinos por WhatsApp al +54 9 223 449-6403 y te lo mostramos con tu negocio. vase.ar
>
> #MarDelPlata #Pymes #ControlDeStock #Comercio #Distribuidoras

## Tabla de escenas

| Escena | Frases (índice en guion.json) | ~Tiempo | Tipo | Qué se ve | Palabra que dispara la animación |
|---|---|---|---|---|---|
| E1 Gancho | 0, 1 | 0,0–2,6 s | **HF** | Fondo oscuro. "Vendiste algo que no tenías." entra palabra por palabra. Sin logo. | **"tenías"**: la frase queda fija. **"Otra vez"**: entra un sello rojo inclinado "OTRA VEZ." con un golpe de cámara (shake corto). |
| E2 Planilla vs. estante | 2, 3 | 2,6–7,0 s | **HF** | Una celda de planilla genérica (sin marca Excel, solo la grilla verde/gris) con "Aceite de girasol 1,5 L │ Stock: **5**". Al lado, el ícono de un estante vacío. | **"cinco"**: el 5 hace zoom. **"ni una"**: el 5 se tacha y cae a **0** en rojo y el estante tiembla. |
| E3 Drama | 4 | 7,0–10,0 s | **HF** | Silencio musical (se corta el beat). Una burbuja de chat genérica, sin logo de WhatsApp: "Almacén Güemes: ¿Mañana me llegan las 6 de aceite?" con un "escribiendo…" que titila. | **"avisa"**: la burbuja vibra. Después queda 1 s de silencio total antes del drop. |
| E4 DROP | 5 | 10,0–11,5 s | **HF** | Entra el beat y el logo **Vase Management** a pantalla completa con flash. | **"Vase"**: drop del beat y flash. **"Management"**: el logo se asienta. |
| E5 Venta y stock | 6, 7 | 11,5–17,4 s | **RM** | Pantalla **Ventas**, modal "**Nueva venta**". Tipo: "Venta". Cliente: "Almacén Güemes". Fecha: 13/10/2026. En "Agregar producto" se escribe "aceite" y aparece "Aceite de girasol 1,5 L · ACE-150 · Stock: 24 u". Ítem: cant. 6 × $ 3.950,00, IVA 21 %, total $ 28.677,00. Botón "Crear venta". Después se agrega un segundo ítem: "Yerba mate 1 kg · YER-1000 · Stock: 3 u" con cant. **5**. | **"Vendés"**: clic en Crear venta y toast verde "**Venta creada** · $ 28.677,00". **"descuenta"**: el chip "Stock: 24 u" cuenta hacia abajo hasta **18 u**. **"no lo tenés"**: se tipea el 5 en la yerba. **"venderlo"**: toast rojo "**Stock insuficiente** · disponible 3, solicitado 5" y la fila de la yerba tiembla. |
| E6 Reponer | 8, 9 | 17,4–22,0 s | **RM** | Pantalla "**Stock Crítico**" con subtítulo "Productos que requieren reposición inmediata". Tarjetas: "Sin stock / Crítico: **3**", "Stock bajo: **7**", "Stock OK: **142**". Columnas: Producto · Categoría · Stock actual · Mínimo · Faltante · Costo reponer. Filas: Yerba mate 1 kg · Almacén · 3 · 12 · 9 · $ 34.200,00 / Lavandina 2 L · Limpieza · 0 · 10 · 10 · $ 12.500,00 / Fideos tirabuzón 500 g · Almacén · 4 · 20 · 16 · $ 14.400,00. | **"avisa"**: baja una notificación de la campana "**Stock bajo** — Yerba mate 1 kg tiene 3 unidades (mínimo: 12)". **"reponer"**: se resalta la columna "Costo reponer". **"ya tenés"**: la tarjeta "Stock OK: 142" pulsa en verde y aparece un tilde. |
| E7 Pedidos web | 10, 11 | 22,0–26,9 s | **RM** | Pantalla **Ventas** ("Gestión de ventas, pedidos y presupuestos"). Columnas: # · Tipo · Cliente · Fecha · Total · Estado. Hay 4 filas viejas (Kiosco Los Troncos, Despensa Mogotes…). | **"pedidos"**: aparece un globo fuera de la tabla, como gráfico y no como UI: "Nuevo pedido · tu tienda online". **"entran solos"**: la fila nueva baja arriba de todo: "1043 · Venta · Rotisería La Feliz · 13/10/2026 · $ 46.320,00 · **Confirmado**". **"dos veces"**: un "×2" tachado aparece y se va. |
| E8 Quién te debe | 12, 13 | 26,9–31,8 s | **RM** | Pantalla "**Riesgo Crediticio**" con subtítulo "Análisis de riesgo y límites de crédito por cliente". Tarjetas: Total clientes **86** · Riesgo alto/bloqueado **3** · Deuda total **$ 1.284.500,00** · Exceden límite **2**. Columnas: Cliente · CUIT/DNI · Límite crédito · Deuda actual · Uso % · Riesgo. Filas: Despensa Mogotes · $ 300.000 · $ 342.800 · 114 % (barra roja) · Alto / Almacén Güemes · $ 400.000 · $ 405.100 · 101 % (roja) · Medio / Rotisería La Feliz · $ 150.000 · $ 126.000 · 84 % (ámbar) · Medio / Kiosco Los Troncos · $ 250.000 · $ 186.000 · 74 % (verde) · Bajo. | **"debe"**: el contador "Deuda total" sube de $ 0 a $ 1.284.500,00. **"cuánto"**: se resalta la columna "Deuda actual". **"límite"**: las dos filas que pasan el 100 % titilan en rojo y la tarjeta "Exceden límite 2" pulsa. |
| E9 Tablero | 14 | 31,8–35,3 s | **RM** | **Tablero** (`/dashboard`) con 4 tarjetas: "Ventas del mes $ 8.742.300,00 · 312 operaciones · ↑ 12 %", "Caja este mes $ 2.115.600,00 · Ingresos menos egresos", "Por cobrar $ 1.284.500,00 · Facturas pendientes", "Stock crítico 3 · Productos bajo mínimo". Abajo va el gráfico de ventas de los últimos 30 días (barras/línea, eje 13/9 → 13/10). | **"ventas"**: la tarjeta "Ventas del mes" se ilumina y el gráfico se dibuja de izquierda a derecha. **"caja"**: se ilumina "Caja este mes". **"vistazo"**: zoom out a la pantalla entera. |
| E10 Remate | 15, 16 | 35,3–39,0 s | **HF** | Fondo limpio. "Cargás una vez." chico y calmo. Después "Y todo cierra." grande. Como detalle visual, los números de las escenas anteriores (18 u, $ 28.677, 1043, $ 1.284.500) se alinean en columna y cierran con un tilde. | **"una vez"**: aparece un único "1" o un clic. **"cierra"**: las cifras encajan, tilde verde y golpe de beat. |
| E11 CTA | 17, 18, 19 | 39,0–45,9 s | **HF** | Logo **Vase Management** + "Tu negocio, en un solo lugar." Después: "Escribinos por WhatsApp" + **+54 9 223 449-6403** + **vase.ar**. El ícono de WhatsApp solo va en el CTA, chico. | **"Vase"**: logo. **"WhatsApp"**: entra el número. **"tu negocio"**: entra vase.ar. **"¡Dale!"**: rebote final del botón/número y fin del beat. |

## Notas para el editor

- **Pronunciación (Piper/Daniela):** "Management" va como "Mániyment" en `say`, porque el yeísmo rioplatense hace que suene parecido a /mánidʒment/. Si suena raro, probá "Mánashment". Además, "online" va como "onlain" y "WhatsApp" como "guasap". En ElevenLabs (`guion-elevenlabs.txt`) se dejaron las palabras originales.
- **No mostrar:** facturas con CAE ni "Factura A/B/C autorizada", tampoco "actualización masiva de precios" ni "stock sincronizado en tiempo real con la tienda". No están respaldados en el código; el detalle está en `funciones-verificadas.md`.
- **El toast real de stock insuficiente** dice "Stock insuficiente para producto <id interno>: disponible 3, solicitado 5". En el video recreamos el mismo mensaje sin el ID interno. Conviene pedirle a dev que muestre el nombre del producto.
- **La fila del pedido web (E7)** en la app real no tiene etiqueta "Tienda online". Por eso el origen se marca con un globo gráfico afuera de la tabla y no se inventa una columna.
- **Datos:** todo lo que se ve es ficticio pero verosímil para una distribuidora de almacén y limpieza de Mar del Plata. Los montos van en formato es-AR ($ 28.677,00). Los productos son genéricos, sin marcas registradas.
- **Subtítulos:** en todas las escenas, palabra por palabra, con el texto `t` del guion.
