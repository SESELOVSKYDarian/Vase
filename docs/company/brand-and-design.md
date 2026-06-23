# Vase - Marca Y Diseno

## Direccion De Marca

Vase debe sentirse:

- moderno
- premium
- claro
- calmo
- confiable
- humano
- operacionalmente fuerte

No debe sentirse:

- generico
- ruidoso
- infantil
- demasiado corporativo
- excesivamente tecnico
- saturado de efectos
- dependiente de plantillas SaaS comunes

## Tono De Voz

Usar lenguaje:

- simple
- seguro
- directo
- profesional
- cercano
- orientado a negocio

Evitar:

- jerga innecesaria
- promesas exageradas
- frases vacias de marketing
- tecnicismos si el usuario final no los necesita

Ejemplos de tono:

- "Moderniza tu negocio sin complejidad."
- "Todo tu equipo, tus productos y tus operaciones en un mismo ecosistema."
- "Activa solo lo que necesitás y escala cuando tu negocio lo pida."

## Colores Base

| Token | Hex | Uso |
| --- | --- | --- |
| Carbon | `#000202` | Texto fuerte, fondos premium, contraste |
| Graphite | `#2F3030` | Superficies oscuras, bordes, UI operativa |
| Jade | `#3B633D` | Accion principal, marca, foco |
| Sage | `#739374` | Acentos suaves, estados positivos, apoyo |
| Mist | `#EFF3F4` | Fondo claro editorial |
| White | `#FFFFFF` | Superficies limpias, texto sobre oscuro |
| Slate | `#64748B` | Texto secundario |
| Danger | `#B42318` | Errores y riesgo |
| Warning | `#B7791F` | Advertencias |
| Info | `#2563EB` | Informacion tecnica puntual |

## Uso De Color

Marketing puede usar una direccion mas clara/editorial:

- fondo mist
- texto carbon
- jade como accion
- sage como acento suave
- pocas cajas
- mucho aire

Paneles operativos pueden usar superficies mas densas:

- carbon o graphite
- cards sobrias
- acentos jade
- badges para estados
- tablas claras y legibles

No usar violeta como color default de SaaS.

No abusar de gradientes.

No usar dark mode solo porque "se ve tech"; debe tener sentido operativo.

## Tipografia

Preferencia:

- Display/UI: Manrope, Satoshi, General Sans o similar.
- Mono: IBM Plex Mono o JetBrains Mono para IDs, logs, metadata y estados tecnicos.

Reglas:

- titulares con peso alto y tracking levemente negativo
- cuerpo con buena altura de linea
- textos comerciales simples y legibles
- mono solo para informacion tecnica

## Layout

Principios:

- claridad primero
- jerarquia fuerte
- pocos niveles visuales
- respirar antes que llenar
- cards cuando organicen, no por decoracion
- tablas con densidad comoda
- formularios con labels visibles

Marketing:

- composicion editorial
- bloques amplios
- CTAs claros
- narrativa por secciones
- menos bordes visibles

Producto:

- navegacion consistente
- estados visibles
- acciones principales claras
- feedback inmediato
- empty states utiles

Admin/Workplace:

- densidad operativa
- filtros y tablas robustas
- auditoria visible
- estados y prioridades legibles

## Componentes

### Botones

Primario:

- fondo jade
- texto claro o carbon segun contraste
- accion principal

Secundario:

- borde sutil
- superficie clara o glass
- accion alternativa

Danger:

- rojo sobrio
- solo para accion destructiva

### Cards

Usar cards para agrupar decisiones, metricas o entidades.

Evitar cards anidadas innecesarias.

### Formularios

- label siempre visible
- error cerca del campo
- ayuda contextual cuando aporte
- copy humano
- no depender solo de placeholder

### Tablas

- header claro
- filas respiradas
- badges para estado
- acciones por fila ordenadas
- filtros arriba

### Empty States

Deben explicar:

- que falta
- por que importa
- cual es la proxima accion

## Movimiento

Usar motion con moderacion:

- reveals suaves
- transiciones de estado
- feedback de interaccion

Evitar:

- animaciones constantes
- rebotes exagerados
- efectos que distraen

Respetar `prefers-reduced-motion`.

## Accesibilidad

- contraste AA minimo
- foco visible
- areas clickeables comodas
- no usar color como unico indicador
- labels en formularios
- navegacion teclado-friendly

## Reglas Para Nuevas Pantallas

Antes de crear una pantalla:

1. Identificar producto y usuario.
2. Definir accion principal.
3. Usar tokens de marca.
4. Mantener copy simple.
5. Evitar patrones genericos.
6. Verificar mobile y desktop.
7. Asegurar estados vacio/cargando/error.
