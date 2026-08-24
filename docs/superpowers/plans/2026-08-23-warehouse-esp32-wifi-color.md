# Depósito IA: Wi‑Fi portable y color de LEDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un ESP32 de depósito se instale en distintos locales usando perfiles Wi‑Fi persistentes y que cada comando encienda los LEDs con el color RGB elegido desde Vase Management.

**Architecture:** Se conserva el flujo ESP32 → Vase Management mediante polling. El ESP32 probará primero el perfil Wi‑Fi editable guardado en `Preferences` y luego los perfiles integrados `WIFI Damac N4164 ` y `Barra`; si ninguno conecta, habilitará un portal local de recuperación. El backend ya tiene color RGB y configuración remota, por lo que la implementación extenderá validación, UI y firmware sin crear otra cola ni otro protocolo.

**Tech Stack:** Arduino ESP32, `WiFi.h`, `WebServer.h`, `Preferences`, Adafruit NeoPixel, ArduinoJson, Next.js 14, TypeScript, Prisma/PostgreSQL, Vitest/Node tests.

---

### Task 1: Blindar el contrato de color RGB

**Files:**
- Modify: `apps/vase-management/lib/warehouse/warehouse-led-command.ts`
- Modify: `apps/vase-management/lib/warehouse/warehouse-device.service.ts`
- Test: `apps/vase-management/lib/warehouse/warehouse-led-command.test.ts`

- [ ] **Step 1: Write failing tests for RGB normalization**

Agregar casos que comprueben que `{ r: 300, g: -1, b: 80 }` se normaliza a `{ r: 255, g: 0, b: 80 }`, que los valores no numéricos usan el color verde existente y que el comando conserva el color normalizado.

- [ ] **Step 2: Run the focused test and verify it fails**

Run from `apps/vase-management`:

```bash
node --test lib/warehouse/warehouse-led-command.test.ts
```

Expected: FAIL because color components are currently passed through without a shared 0–255 normalization contract.

- [ ] **Step 3: Implement the minimal color normalizer**

Crear una función pura `normalizeWarehouseLedColor` en `warehouse-led-command.ts` que convierta cada componente a entero, aplique `Math.max(0, Math.min(255, value))` y use `{ r: 0, g: 80, b: 20 }` cuando falte un componente válido. Aplicarla antes de validar y devolver el comando.

- [ ] **Step 4: Pass the normalized color through device commands**

En `warehouse-device.service.ts`, conservar el color enviado por las rutas y pasar el resultado normalizado a `normalizeWarehouseLedCommand`. No reemplazar colores `{0,0,0}` porque siguen representando apagado.

- [ ] **Step 5: Run the focused test and commit**

```bash
node --test lib/warehouse/warehouse-led-command.test.ts
git add apps/vase-management/lib/warehouse/warehouse-led-command.ts apps/vase-management/lib/warehouse/warehouse-device.service.ts apps/vase-management/lib/warehouse/warehouse-led-command.test.ts
git commit -m "feat(warehouse): normalize led command colors"
```

Expected: PASS.

### Task 2: Agregar selector de color a las acciones web

**Files:**
- Modify: `apps/vase-management/app/dashboard/deposito-ia/productos/page.tsx`
- Modify: `apps/vase-management/components/warehouse/product-editor.tsx`
- Modify: `apps/vase-management/components/warehouse/types.ts`
- Modify: `apps/vase-management/app/api/warehouse/products/[productId]/test-led/route.ts`
- Test: `apps/vase-management/lib/warehouse/warehouse-device.service.test.ts`

- [ ] **Step 1: Write failing test for a custom test-LED color**

Agregar una prueba que invoque la construcción del comando de prueba con `{ r: 255, g: 0, b: 0 }` y compruebe que el payload conserva rojo, verde y azul.

- [ ] **Step 2: Run the focused test and verify it fails**

```bash
node --test lib/warehouse/warehouse-device.service.test.ts
```

Expected: FAIL because the test-LED route currently fija `{ r: 0, g: 80, b: 20 }`.

- [ ] **Step 3: Add a shared `WarehouseLedColor` UI value**

En `components/warehouse/types.ts`, definir `WarehouseLedColor = { r: number; g: number; b: number }`. El editor mantendrá un color local inicial `{ r: 0, g: 80, b: 20 }` y un input HTML `type="color"` que traduzca hexadecimal a RGB.

- [ ] **Step 4: Send the selected color in test commands**

Extender el POST de `/api/warehouse/products/[productId]/test-led` con `color` validado mediante el esquema existente del servicio. La página de productos debe conservar el color elegido para la sesión y usarlo tanto en “Probar LEDs” como en la edición del producto.

- [ ] **Step 5: Show the selected color in the LED canvas**

Actualizar `LedStripCanvas` si es necesario para usar el color seleccionado en la previsualización, sin cambiar la lógica de selección ni permitir LEDs ocupados por otro producto.

- [ ] **Step 6: Run tests and commit**

```bash
node --test lib/warehouse/warehouse-device.service.test.ts
git add apps/vase-management/app/dashboard/deposito-ia/productos/page.tsx apps/vase-management/components/warehouse/product-editor.tsx apps/vase-management/components/warehouse/types.ts apps/vase-management/app/api/warehouse/products/[productId]/test-led/route.ts apps/vase-management/lib/warehouse/warehouse-device.service.test.ts
git commit -m "feat(warehouse): choose led color from products"
```

### Task 3: Probar y guardar perfiles Wi‑Fi en el ESP32

**Files:**
- Modify: `firmware/warehouse-esp32/warehouse-esp32.ino`
- Test: `apps/vase-management/lib/warehouse/warehouse-device.setup.test.ts`

- [ ] **Step 1: Write the firmware contract test first**

Extender el test de contrato para comprobar que el firmware contiene los campos `wifiSsid`, `wifiPassword`, `serverBaseUrl`, `deviceKey`, los perfiles de fallback y el flujo de `Preferences`.

- [ ] **Step 2: Run the contract test and verify it fails**

```bash
node --test lib/warehouse/warehouse-device.setup.test.ts
```

Expected: FAIL until el firmware exponga los perfiles y el modo de recuperación.

- [ ] **Step 3: Add literal fallback profiles without trimming SSIDs**

Agregar una estructura `WifiProfile` con el perfil editable persistente y los perfiles integrados para `WIFI Damac N4164 ` y `Barra`. El primer SSID conserva el espacio final. Las contraseñas se toman de la configuración local actual del firmware que se va a flashear; no se escriben en el plan ni se suben al repositorio.

- [ ] **Step 4: Implement connection fallback**

Crear `tryConnect(ssid, password, timeoutMs)` y hacer que `connectWifi()` pruebe en este orden: perfil editable, Damac y Barra. Si la conexión falla, no borrar el perfil editable y pasar al portal de recuperación.

- [ ] **Step 5: Add local recovery portal**

Usar `WebServer` y `WiFi.softAP` para exponer una página simple en `192.168.4.1` con SSID, contraseña, servidor y `deviceKey`. Guardar el formulario en `Preferences`, apagar el AP y reiniciar la conexión sin modificar el protocolo de polling.

- [ ] **Step 6: Run the contract test and commit firmware separately**

```bash
node --test lib/warehouse/warehouse-device.setup.test.ts
git add apps/vase-management/lib/warehouse/warehouse-device.setup.test.ts firmware/warehouse-esp32/warehouse-esp32.ino
git commit -m "feat(warehouse): add portable esp32 wifi provisioning"
```

No incluir credenciales del cliente en el commit. El archivo de firmware ya tiene cambios locales del usuario; revisar el diff antes de agregarlo.

### Task 4: Aplicar configuración remota sin bloquear el equipo

**Files:**
- Modify: `firmware/warehouse-esp32/warehouse-esp32.ino`
- Modify: `apps/vase-management/app/api/warehouse/devices/[deviceId]/config/route.ts`
- Modify: `apps/vase-management/lib/warehouse/warehouse-device.service.ts`
- Test: `apps/vase-management/lib/warehouse/warehouse-device.setup.test.ts`

- [ ] **Step 1: Write failing tests for safe remote config**

Comprobar que la respuesta de configuración para la interfaz web no contiene `wifiPassword`, que la respuesta autenticada del dispositivo sí entrega la credencial necesaria, que conserva el `deviceKey`, que acepta `brightness` entre 0 y 255 y que no aplica un SSID vacío.

- [ ] **Step 2: Run the test and verify the expected failure**

```bash
node --test lib/warehouse/warehouse-device.setup.test.ts
```

Expected: FAIL for the missing password redaction or invalid SSID behavior.

- [ ] **Step 3: Keep secrets write-only in the authenticated API**

La ruta web podrá enviar una nueva contraseña, pero el GET de configuración usado por el ESP32 debe devolverla solo al dispositivo identificado por su `deviceKey`, con `Cache-Control: no-store`. La respuesta de la interfaz web nunca debe mostrar el valor almacenado.

- [ ] **Step 4: Reconnect safely in firmware**

Cuando cambien SSID o contraseña, guardar una copia de la configuración anterior, intentar la nueva red y conservar la anterior si falla. Si ambas fallan, iniciar el portal local y seguir intentando sin perder el `deviceKey`.

- [ ] **Step 5: Run focused tests and commit**

```bash
node --test lib/warehouse/warehouse-device.setup.test.ts
git add apps/vase-management/app/api/warehouse/devices/[deviceId]/config/route.ts apps/vase-management/lib/warehouse/warehouse-device.service.ts apps/vase-management/lib/warehouse/warehouse-device.setup.test.ts firmware/warehouse-esp32/warehouse-esp32.ino
git commit -m "feat(warehouse): apply remote wifi configuration safely"
```

### Task 5: Validar integración física y despliegue

**Files:**
- Modify: `firmware/warehouse-esp32/warehouse-esp32.ino` only if a test exposes a firmware defect
- Test: `apps/vase-management/lib/warehouse/warehouse-led-firmware-contract.test.ts`

- [ ] **Step 1: Compile the firmware for the exact ESP32 board**

Desde Arduino IDE o Arduino CLI, instalar Adafruit NeoPixel, ArduinoJson y el core ESP32; compilar sin cambiar GPIO 2, `NEO_GRB` ni `NEO_KHZ800`.

- [ ] **Step 2: Flash and verify Wi‑Fi fallback**

Probar el perfil Damac con el SSID exacto `WIFI Damac N4164 `, luego Barra y finalmente el perfil editable. Registrar en monitor serie `WiFi OK`, IP asignada y URL de polling.

- [ ] **Step 3: Verify the full LED flow**

Desde Management, seleccionar cuatro LEDs y un color, ejecutar “Probar LEDs” y comprobar:

```text
Poll HTTP: 200
LEDs 4 durante 5000 ms
Complete HTTP: 200
```

Repetir con color rojo, azul y apagado; verificar que el ESP32 limpia la tira al vencer `durationMs`.

- [ ] **Step 4: Verify failure recovery**

Configurar temporalmente un SSID inválido desde la web, confirmar que el ESP32 entra en `Vase-ESP32-XXXX`, cargar una red válida desde `192.168.4.1` y comprobar que vuelve al polling sin cambiar el `deviceKey`.

- [ ] **Step 5: Run final checks and record deployment commands**

```bash
git diff --check
git status --short
cd apps/vase-management
npm run db:generate
npm run build
```

En EasyPanel, redesplegar `vase-management` con la migración ya aplicada y cargar el firmware compilado al ESP32 del local.
