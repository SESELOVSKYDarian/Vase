# Warehouse ESP32 Device Setup Design

## Goal

Make the Deposito IA device page the source of truth for configuring and validating ESP32 LED-strip controllers in production.

## Current State

`apps/vase-management` already has pull-based device routes:

- `GET /api/warehouse/devices/[deviceKey]/next-command`
- `POST /api/warehouse/devices/[deviceKey]/commands/[commandId]/complete`

The device page lists controllers and shows an offline/online state, but it hides most of the configuration needed by the physical ESP32. A user can see a masked key, but cannot copy the full `deviceKey`, exact polling URL, completion URL, or an Arduino-ready config block from the UI.

## Selected Approach

Add a per-device setup panel to the existing `dashboard/deposito-ia/dispositivos` screen.

Each device card will show:

- full setup status based on `lastSeenAt` and `status`
- polling URL generated from the management app public base URL
- command completion URL template
- full `deviceKey` behind an explicit show/hide control
- copy buttons for `deviceKey`, polling URL, completion URL, and an Arduino config snippet
- a test command button that can enqueue a command even while the device is offline
- clear diagnostics when a controller has never connected

The backend keeps the existing ESP32 architecture: devices authenticate only by `deviceKey`, while the internal UI remains protected by the current session and company scope.

## API Contract

Extend `GET /api/warehouse/devices` to return a safe DTO for the authenticated company. The DTO may include the device key because the page is an authenticated operational setup screen for that company.

Each returned device should include:

- `id`
- `name`
- `deviceKey`
- `type`
- `status`
- `lastSeenAt`
- `ledCount`
- `brightness`
- `maxActiveLeds`
- `active`
- `createdAt`
- `updatedAt`
- `pollingUrl`
- `completeUrlTemplate`
- `serverBaseUrl`

The public base URL is resolved from `NEXT_PUBLIC_APP_URL`, then `NEXTAUTH_URL`, and falls back to the request origin when needed.

## UI Behavior

The page remains within the existing Deposito IA visual system. It must work in light and dark themes and keep the operational density of the current management dashboard.

Device cards gain a setup block:

- Connection row: online/offline badge, last ping, and relative status text.
- Firmware values: `SERVER_BASE_URL`, `DEVICE_KEY`, `LED_COUNT`, `LED_PIN`.
- Endpoint values: polling URL and completion URL template.
- Copy actions use the browser clipboard and show a short success/error notice.
- Show/hide key state is local to each card.

The existing "Probar LED" action should no longer require the card to already be online. The expected behavior is:

- if the device is online, the command should be picked up almost immediately
- if the device is offline, the command is queued for the next poll until it expires

## ESP32 Contract

Firmware should poll:

`GET {serverBaseUrl}/api/warehouse/devices/{deviceKey}/next-command`

Expected responses:

- `204`: no command, but the ping updates `lastSeenAt`
- `200`: JSON command with `id`, `ledNumber`, `activeCount`, `color`, and `durationMs`
- `500`: server-side error; firmware should retry on the next polling interval

After executing a command, firmware should call:

`POST {serverBaseUrl}/api/warehouse/devices/{deviceKey}/commands/{commandId}/complete`

Payload:

```json
{ "status": "DONE" }
```

or:

```json
{ "status": "FAILED", "error": "short error message" }
```

## Error Handling

The UI should distinguish:

- failed authenticated API calls
- clipboard failures
- never-connected devices
- connected-but-currently-offline devices
- queued test commands

The ESP32 polling route should keep returning `204` when there is no command, because that is a successful heartbeat.

## Testing

Add focused tests around the device service DTO helpers and URL generation. Verify:

- base URL normalization removes trailing slashes
- polling URLs use the real `deviceKey`
- completion templates include `{commandId}`
- command test can be created for an offline device

Run the focused tests first, then a production build for `apps/vase-management`.

## Out of Scope

- Rewriting the ESP32 Arduino firmware in this change.
- WhatsApp webhook setup.
- Changing the database schema.
- Changing authentication or company ownership rules.
