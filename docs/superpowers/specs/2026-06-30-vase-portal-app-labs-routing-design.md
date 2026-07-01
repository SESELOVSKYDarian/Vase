# Diseño de separación de Vase Portal, App y Labs

## Objetivo

Organizar la plataforma en dos aplicaciones desplegables y tres dominios con
responsabilidades claras:

- `vase.ar` presenta la web pública desde `apps/vase-portal`;
- `app.vase.ar` presenta autenticación y el panel general desde
  `apps/vase-app`;
- `labs.vase.ar` presenta exclusivamente la experiencia de Labs para clientes
  habilitados, reutilizando autenticación, datos y lógica de `apps/vase-app`.

La migración debe conservar el aspecto y el contenido público que actualmente
funcionan en `vase.ar`, así como el panel, las cuentas y los datos ya
disponibles en `app.vase.ar`.

## Enfoque aprobado

Se utilizarán dos aplicaciones, no tres:

1. La web pública existente se extrae del árbol raíz de `origin/main` y se
   integra en `apps/vase-portal`.
2. El panel general y Labs continúan en `apps/vase-app`.
3. `apps/vase-app` selecciona la experiencia permitida según el hostname:
   plataforma general en `app.vase.ar` y Labs aislado en `labs.vase.ar`.

Este enfoque evita duplicar autenticación, autorización, Prisma, servicios de
Labs y acceso a datos, pero permite desplegar la web pública de forma
independiente.

## Límites de producto y direccionamiento

| Dominio | Aplicación | Entrada principal | Comportamiento |
| --- | --- | --- | --- |
| `vase.ar` | `apps/vase-portal` | `/` | Web pública, marketing, precios, documentación y acceso a registro/login |
| `app.vase.ar` | `apps/vase-app` | `/app` | Panel autenticado del cliente |
| `labs.vase.ar` | `apps/vase-app` | `/app/owner/labs` | Panel de Labs, únicamente para clientes habilitados |

### Vase Portal

- La portada y las páginas públicas conservan su diseño, contenido, SEO,
  componentes, fuentes y recursos actuales.
- Los botones de inicio de sesión apuntan a
  `https://app.vase.ar/signin`.
- Los botones de registro apuntan a `https://app.vase.ar/register`.
- El Portal no contiene una segunda implementación de autenticación.
- Los enlaces históricos `vase.ar/app`, `vase.ar/signin` y
  `vase.ar/register` redirigen a sus equivalentes canónicos en
  `app.vase.ar`.
- Las funciones públicas que requieren servidor, como el formulario de
  contacto, se migran con un contrato explícito y sin importar el backend
  completo del panel al Portal.

### Vase App

- `https://app.vase.ar/app` continúa siendo el panel principal.
- Una visita autenticada muestra el panel del cliente.
- Una visita sin sesión redirige a:

  ```text
  https://app.vase.ar/signin?redirectTo=%2Fapp
  ```

- Después de autenticarse, el cliente vuelve a `/app`.
- El logo principal y la acción visible `Inicio` apuntan a
  `https://vase.ar`.
- Las demás secciones del panel mantienen sus rutas actuales.
- La ruta `/` de `app.vase.ar` redirige de forma canónica a `/app`.

### Vase Labs

- Se conservan las rutas actuales; no se reemplaza
  `/app/owner/labs/...` por una estructura nueva.
- El logo de Vase Labs apunta a
  `https://labs.vase.ar/app/owner/labs`.
- Se elimina la acción `Volver al Panel de Vase`.
- No se muestra la navegación general de Vase App dentro del dominio de Labs.
- Una ruta de página ajena a Labs dentro de `labs.vase.ar` redirige al Panel de
  Labs, no a `app.vase.ar`.
- Los assets, endpoints de autenticación, health checks y APIs estrictamente
  necesarios para Labs quedan permitidos por una lista explícita.
- Una API no permitida en el hostname de Labs responde con un error HTTP
  apropiado; no responde con una redirección HTML.

## Flujo de autenticación y autorización

La autenticación continúa centralizada en `app.vase.ar` y utiliza el dominio
de cookie compartido `.vase.ar`.

### Cliente sin sesión

1. El cliente solicita una ruta de App o Labs.
2. La aplicación genera un `redirectTo` validado para un dominio oficial de
   Vase.
3. El navegador abre `app.vase.ar/signin`.
4. Tras iniciar sesión, el cliente vuelve a la ruta original.

El retorno debe validar hostname y ruta para evitar redirecciones abiertas.

### Cliente con Labs habilitado

1. El servidor resuelve sesión, tenant activo, membresía y acceso al módulo.
2. `labs.vase.ar` permite las rutas de Labs correspondientes.
3. Una ruta inexistente o ajena al módulo vuelve a
   `/app/owner/labs`.
4. La navegación y el logo siempre permanecen dentro del dominio de Labs.

### Cliente sin Labs habilitado

1. El servidor rechaza el acceso antes de renderizar datos de Labs.
2. El cliente vuelve a:

   ```text
   https://app.vase.ar/app?labs=required
   ```

3. El panel general muestra un aviso para activar o contratar Labs.

La restricción se aplica en middleware para la navegación y nuevamente en los
guards del servidor para la seguridad. Ocultar enlaces en la interfaz no se
considera autorización suficiente.

## Migración de Vase Portal

La fuente de referencia es la sección pública vigente de `origin/main`:

- `src/app/(marketing)`;
- `src/components/marketing`;
- `src/config/public-site.ts`;
- componentes de UI utilizados por las páginas públicas;
- estilos globales, fuentes, imágenes, metadatos, sitemap y robots;
- validadores y servicios usados exclusivamente por acciones públicas.

La migración debe seguir las dependencias reales desde esas rutas. No se copia
el árbol completo de la aplicación autenticada.

Las importaciones se adaptan a la estructura de `apps/vase-portal`, con alias
locales y dependencias declaradas en `@vase/portal`. Cuando exista lógica útil
para más de una aplicación, se mueve a un paquete compartido únicamente si no
depende del runtime específico de App.

## Configuración de orígenes

Los enlaces entre productos no deben quedar distribuidos como strings
inconsistentes. Cada aplicación utiliza configuración validada para:

```text
PUBLIC_SITE_ORIGIN=https://vase.ar
APP_ORIGIN=https://app.vase.ar
LABS_ORIGIN=https://labs.vase.ar
```

Los valores de producción tienen defaults seguros para los dominios oficiales
y pueden sobrescribirse en desarrollo y pruebas.

## Despliegue

### Portal

```text
Servicio: portal-vase
Repositorio: SESELOVSKYDarian/Vase
Rama: Vase-Test-Repos
Ruta de compilación: /
Dockerfile: apps/vase-portal/Dockerfile
Dominio: vase.ar
Puerto interno: 3001
```

### App y Labs

```text
Servicio: vase-app-next
Repositorio: SESELOVSKYDarian/Vase
Rama: Vase-Test-Repos
Ruta de compilación: /
Dockerfile: apps/vase-app/Dockerfile
Dominios: app.vase.ar, labs.vase.ar
Puerto interno: 3002
```

Ambos Dockerfiles compilan desde la raíz del repositorio porque dependen del
workspace y de paquetes compartidos.

## Manejo de fallos

- Si Portal no puede completar una acción pública, muestra un error local y no
  redirige al panel.
- Si App no puede validar la sesión, utiliza el login centralizado.
- Si no puede resolverse el acceso a Labs, el servidor deniega el contenido;
  no asume acceso por defecto.
- Si el cliente tiene sesión pero no plan de Labs, vuelve al panel general con
  el estado `labs=required`.
- Los health checks de readiness fallan cuando una dependencia obligatoria no
  está disponible.
- Durante el cambio de `vase.ar`, el servicio anterior se conserva como
  rollback hasta finalizar las pruebas de aceptación.

## Validación

### Pruebas automatizadas

- Typecheck de `@vase/portal` y `@vase/app`.
- Build de producción de ambos workspaces.
- Tests de la matriz hostname/ruta.
- Tests de redirección para `vase.ar/app`, login, registro y retorno posterior
  a la autenticación.
- Tests del logo y `Inicio` en App.
- Tests del logo, navegación cerrada y ausencia de salida al panel general en
  Labs.
- Tests de acceso a Labs con sesión habilitada, sin sesión y sin plan.
- Tests que distingan redirecciones de página y errores de API.
- Validación de sitemap, robots, metadatos y enlaces internos del Portal.
- Build de las dos imágenes Docker desde el contexto raíz.

### Pruebas de aceptación

- `vase.ar` reproduce la web pública vigente.
- Todos los CTA de sesión y registro abren `app.vase.ar`.
- `app.vase.ar/app` conserva el panel del cliente.
- El logo y `Inicio` de App abren `vase.ar`.
- `labs.vase.ar/app/owner/labs` abre el Panel de Labs para un cliente
  habilitado.
- El logo de Labs vuelve al Panel de Labs.
- No existe la acción `Volver al Panel de Vase` en Labs.
- Una ruta ajena al módulo en `labs.vase.ar` permanece dentro de Labs.
- Un cliente sin Labs vuelve a App y ve la opción de activación.
- Logout y cookies funcionan entre los subdominios oficiales.

## Secuencia de puesta en producción

1. Completar Portal y las reglas de dominio en la rama
   `Vase-Test-Repos`.
2. Ejecutar tests, builds y builds Docker.
3. Desplegar Portal en un dominio temporal y validar la web pública.
4. Desplegar App con `app.vase.ar` y `labs.vase.ar`.
5. Validar cuentas reales controladas, planes y navegación.
6. Mover `vase.ar` al servicio `portal-vase`.
7. Ejecutar la matriz de smoke tests de los tres dominios.
8. Mantener disponible el rollback hasta confirmar estabilidad.

## Fuera de alcance

- Separar Labs en una tercera aplicación.
- Cambiar las URLs internas actuales de Labs.
- Migrar la base de datos principal.
- Rediseñar la web pública o el panel.
- Modificar precios, textos comerciales o planes.
- Cambiar el flujo SSO de Vase Business salvo sus enlaces de retorno a App.
