# Labs Commercial Operations Deploy

## Services

Deploy these EasyPanel services:

1. `vase-app`
   - Workspace: `@vase/app`
   - Run Prisma migrations before the new image.
   - Required for internal endpoints:
     - `/api/internal/business/labs/fulfillment`
     - `/api/internal/business/labs/orders/quote`
     - `/api/internal/business/labs/orders`
     - `/api/internal/business/labs/orders/snapshot`

2. `vase-labs`
   - Workspace: `@vase/labs`
   - Run Prisma migrations before the new image.
   - Public URL: `https://labs.vase.ar`
   - Internal app URL: `APP_INTERNAL_URL=http://app-vase:3002`

3. `vase-labs-conversation-analysis-worker`
   - Same image and environment as `vase-labs`.
   - Command: `npm --workspace @vase/labs run worker:conversation-analysis`

4. `vase-transcription`
   - Build context: `services/vase-transcription`
   - Private network only, port `8080`.
   - Uses faster-whisper locally, default `small` CPU `int8`.

## Shared Secrets

Use the same `SERVICE_TO_SERVICE_TOKEN` in `vase-app` and `vase-labs`.

Use the same `TRANSCRIPTION_SERVICE_TOKEN` in `vase-labs` and `vase-transcription`.

## Labs Environment

```env
APP_INTERNAL_URL=http://app-vase:3002
SERVICE_TO_SERVICE_TOKEN=CHANGE_ME_LONG_RANDOM
TRANSCRIPTION_SERVICE_URL=http://vase-transcription:8080
TRANSCRIPTION_SERVICE_TOKEN=CHANGE_ME_LONG_RANDOM
```

## Transcription Environment

```env
TRANSCRIPTION_SERVICE_TOKEN=CHANGE_ME_LONG_RANDOM
WHISPER_MODEL=small
WHISPER_COMPUTE_TYPE=int8
MAX_AUDIO_BYTES=15728640
```

## Migration Order

1. Deploy `vase-app` database migration.
2. Deploy `vase-app`.
3. Deploy `vase-labs` database migration.
4. Deploy `vase-labs`.
5. Deploy/restart `vase-labs` workers.
6. Deploy `vase-transcription`.

## Smoke Test

1. Open Labs Activity and confirm lead score/report appears after inbound messages.
2. Open Labs Orders and confirm the sidebar shows `Pedidos`.
3. Create a quote through the internal order flow and confirm exact phrase protection.
4. Confirm Business receives the order once for the same idempotency key.
5. Send an audio message and verify transcription uses `vase-transcription`, not OpenAI audio.
