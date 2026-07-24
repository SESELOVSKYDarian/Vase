# OpenAI Audio Transcription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transcribir audios de WhatsApp con `gpt-4o-mini-transcribe` usando la API key cifrada de cada asistente y continuar la respuesta normal de Vase Labs.

**Architecture:** El webhook y la cola durable existentes no cambian. El worker descarga el audio desde Meta, resuelve la API key del asistente al reclamar cada trabajo, crea un cliente de transcripción OpenAI para ese trabajo y luego guarda el texto y ejecuta el flujo conversacional existente.

**Tech Stack:** TypeScript, Node.js `fetch`/`FormData`, OpenAI Audio Transcriptions API, Prisma, Vitest, Next.js 16.

---

### Task 1: Cliente económico de transcripción OpenAI

**Files:**
- Modify: `apps/vase-labs/app/lib/audio-transcription-client.ts`
- Test: `tests/v3-labs-audio-transcription-client.test.ts`

- [ ] **Step 1: Escribir la prueba fallida del formulario OpenAI**

Reemplazar la expectativa del servicio privado por una solicitud a OpenAI que
incluya `file` y `model`:

```ts
const client = createAudioTranscriptionClient({
  apiKey: "sk-business",
  model: "gpt-4o-mini-transcribe",
  fetcher,
});
await client.transcribe(Buffer.from("audio"), "audio/ogg; codecs=opus");
expect(fetcher).toHaveBeenCalledWith(
  "https://api.openai.com/v1/audio/transcriptions",
  expect.objectContaining({
    method: "POST",
    headers: { authorization: "Bearer sk-business" },
  }),
);
expect((body as FormData).get("model")).toBe("gpt-4o-mini-transcribe");
expect(((body as FormData).get("file") as Blob).type).toBe("audio/ogg");
```

- [ ] **Step 2: Ejecutar la prueba y comprobar RED**

Run:

```bash
npx vitest run tests/v3-labs-audio-transcription-client.test.ts
```

Expected: FAIL porque el cliente todavía exige
`TRANSCRIPTION_SERVICE_URL`/`TRANSCRIPTION_SERVICE_TOKEN` y usa el campo
`audio`.

- [ ] **Step 3: Implementar el cliente OpenAI mínimo**

El cliente debe resolver la clave en construcción, normalizar MIME, usar el
modelo configurable y ocultar cuerpos de error:

```ts
export function createAudioTranscriptionClient(input: {
  apiKey: string;
  model?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}) {
  const fetcher = input.fetcher ?? fetch;
  return {
    async transcribe(buffer: Buffer, mimeType: string) {
      if (!input.apiKey.trim()) throw new Error("OPENAI_API_KEY_MISSING");
      const form = new FormData();
      const normalizedMimeType =
        mimeType.split(";", 1)[0]?.trim().toLowerCase() || "audio/ogg";
      form.set(
        "file",
        new Blob([new Uint8Array(buffer)], { type: normalizedMimeType }),
        "channel-audio.ogg",
      );
      form.set("model", input.model?.trim() || "gpt-4o-mini-transcribe");
      const response = await fetcher(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { authorization: `Bearer ${input.apiKey.trim()}` },
          body: form,
          signal,
        },
      );
      if (!response.ok) throw new Error("OPENAI_TRANSCRIPTION_FAILED");
      const payload = await response.json() as { text?: unknown };
      if (typeof payload.text !== "string" || !payload.text.trim()) {
        throw new Error("TRANSCRIPTION_EMPTY");
      }
      return { text: payload.text.trim() };
    },
  };
}
```

El código final debe conservar el `AbortController` existente y limpiar el
timeout en `finally`.

- [ ] **Step 4: Ejecutar la prueba y comprobar GREEN**

Run:

```bash
npx vitest run tests/v3-labs-audio-transcription-client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/vase-labs/app/lib/audio-transcription-client.ts tests/v3-labs-audio-transcription-client.test.ts
git commit -m "feat(labs): transcribe channel audio with OpenAI mini"
```

### Task 2: Resolver la API key del asistente por trabajo

**Files:**
- Create: `apps/vase-labs/app/lib/assistant-openai-key.ts`
- Create: `tests/v3-labs-assistant-openai-key-resolver.test.ts`

- [ ] **Step 1: Escribir las pruebas fallidas del resolvedor**

Cubrir clave válida y clave ausente:

```ts
const encryptedValue = encryptChannelSecret("sk-business", "encryption-key");
await expect(resolveAssistantOpenAiApiKey({
  assistantId: "assistant_1",
  encryptionSecret: "encryption-key",
  repository: {
    findEncryptedOpenAiKey: async () => encryptedValue,
  },
})).resolves.toBe("sk-business");

await expect(resolveAssistantOpenAiApiKey({
  assistantId: "assistant_2",
  encryptionSecret: "encryption-key",
  repository: {
    findEncryptedOpenAiKey: async () => null,
  },
})).rejects.toThrow("OPENAI_API_KEY_MISSING");
```

- [ ] **Step 2: Ejecutar la prueba y comprobar RED**

Run:

```bash
npx vitest run tests/v3-labs-assistant-openai-key-resolver.test.ts
```

Expected: FAIL porque el módulo todavía no existe.

- [ ] **Step 3: Implementar el resolvedor y repositorio Prisma**

```ts
export async function resolveAssistantOpenAiApiKey(input: {
  assistantId: string;
  encryptionSecret: string;
  repository: {
    findEncryptedOpenAiKey(assistantId: string): Promise<string | null>;
  };
}) {
  if (!input.encryptionSecret.trim()) {
    throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");
  }
  const encrypted = await input.repository.findEncryptedOpenAiKey(
    input.assistantId,
  );
  if (!encrypted) throw new Error("OPENAI_API_KEY_MISSING");
  return decryptChannelSecret(encrypted, input.encryptionSecret);
}

export class PrismaAssistantOpenAiKeyRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async findEncryptedOpenAiKey(assistantId: string) {
    const secret = await this.prisma.assistantSecret.findUnique({
      where: {
        assistantId_kind: { assistantId, kind: "OPENAI_API_KEY" },
      },
      select: { encryptedValue: true },
    });
    return secret?.encryptedValue ?? null;
  }
}
```

- [ ] **Step 4: Ejecutar la prueba y comprobar GREEN**

Run:

```bash
npx vitest run tests/v3-labs-assistant-openai-key-resolver.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/vase-labs/app/lib/assistant-openai-key.ts tests/v3-labs-assistant-openai-key-resolver.test.ts
git commit -m "feat(labs): resolve assistant OpenAI key for audio"
```

### Task 3: Crear el transcriptor después de reclamar cada trabajo

**Files:**
- Modify: `apps/vase-labs/app/lib/audio-transcription-worker.ts`
- Test: `tests/v3-labs-audio-transcription-worker.test.ts`

- [ ] **Step 1: Escribir la prueba fallida de aislamiento por asistente**

```ts
const resolveTranscriber = vi.fn(async (job) => ({
  transcribe: vi.fn(async () => ({
    text: `transcript-${job.id}`,
  })),
}));
const worker = createAudioTranscriptionWorker({
  queue,
  downloadMedia,
  resolveTranscriber,
  continueConversation,
});
await worker.processNext();
expect(resolveTranscriber).toHaveBeenCalledWith(
  expect.objectContaining({ id: "job_1" }),
);
```

- [ ] **Step 2: Ejecutar la prueba y comprobar RED**

Run:

```bash
npx vitest run tests/v3-labs-audio-transcription-worker.test.ts
```

Expected: FAIL porque el worker todavía recibe un único `transcriber` global.

- [ ] **Step 3: Implementar resolución por trabajo**

Cambiar la dependencia pública:

```ts
resolveTranscriber(
  job: AudioJob,
): Promise<WorkerDeps["transcriber"]> | WorkerDeps["transcriber"];
```

En `processNext`, resolver antes de llamar a
`processAudioTranscriptionJob`:

```ts
const transcriber = await input.resolveTranscriber(job);
const result = await processAudioTranscriptionJob(job, {
  downloadMedia: () => input.downloadMedia(job),
  transcriber,
  storeTranscript: input.storeTranscript,
  continueConversation: input.continueConversation,
  complete: (jobId, transcript) => input.queue.complete(jobId, transcript),
  fail: (jobId, error) => input.queue.fail(jobId, error),
});
```

Si resolver la clave falla, capturar el error y llamar a `queue.fail` con un
código estable, sin dejar el trabajo en `PROCESSING`.

- [ ] **Step 4: Ejecutar la prueba y comprobar GREEN**

Run:

```bash
npx vitest run tests/v3-labs-audio-transcription-worker.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/vase-labs/app/lib/audio-transcription-worker.ts tests/v3-labs-audio-transcription-worker.test.ts
git commit -m "refactor(labs): resolve audio transcriber per job"
```

### Task 4: Conectar OpenAI al worker de producción

**Files:**
- Modify: `apps/vase-labs/scripts/conversation-analysis-worker.ts`
- Test: `tests/v3-labs-audio-transcription-client.test.ts`
- Test: `tests/v3-labs-audio-transcription-worker.test.ts`

- [ ] **Step 1: Sustituir la construcción del cliente local**

Crear una instancia de `PrismaAssistantOpenAiKeyRepository` y usar
`resolveTranscriber`:

```ts
const assistantOpenAiKeyRepository =
  new PrismaAssistantOpenAiKeyRepository(labsPrisma);

resolveTranscriber: async (rawJob) => {
  const job = rawJob as ClaimedAudioTranscriptionJob;
  const apiKey = await resolveAssistantOpenAiApiKey({
    assistantId: job.assistantId,
    encryptionSecret: process.env.TOKEN_ENCRYPTION_SECRET ?? "",
    repository: assistantOpenAiKeyRepository,
  });
  return createAudioTranscriptionClient({
    apiKey,
    model:
      process.env.AI_TRANSCRIPTION_MODEL?.trim()
      || "gpt-4o-mini-transcribe",
    timeoutMs: positiveInteger(
      process.env.AUDIO_TRANSCRIPTION_REQUEST_TIMEOUT_MS,
      120_000,
    ),
  });
},
```

Eliminar el cliente global que depende de
`TRANSCRIPTION_SERVICE_URL`/`TRANSCRIPTION_SERVICE_TOKEN`.

- [ ] **Step 2: Ejecutar pruebas focalizadas**

Run:

```bash
npx vitest run tests/v3-labs-audio-transcription-client.test.ts tests/v3-labs-audio-transcription-worker.test.ts tests/v3-labs-assistant-openai-key-resolver.test.ts tests/v3-labs-channel-webhook-service.test.ts
```

Expected: todos los archivos PASS.

- [ ] **Step 3: Ejecutar typecheck y build**

Run:

```bash
npm --workspace @vase/labs run typecheck
npm --workspace @vase/labs run build
```

Expected: ambos comandos terminan con exit code 0.

- [ ] **Step 4: Verificar formato y estado**

Run:

```bash
git diff --check
git status --short
```

Expected: sin errores de whitespace; solamente archivos de esta
implementación.

- [ ] **Step 5: Commit**

```bash
git add apps/vase-labs/scripts/conversation-analysis-worker.ts
git commit -m "feat(labs): use business OpenAI keys for audio"
```

### Task 5: Despliegue y comprobación de producción

**Files:**
- No code files.

- [ ] **Step 1: Configurar el modelo económico**

En `vase-labs-worker`:

```env
AI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
AUDIO_TRANSCRIPTION_REQUEST_TIMEOUT_MS=120000
```

Conservar el mismo `DATABASE_URL` y `TOKEN_ENCRYPTION_SECRET` de
`vase-labs`. Ya no se requieren `TRANSCRIPTION_SERVICE_URL` ni
`TRANSCRIPTION_SERVICE_TOKEN`.

- [ ] **Step 2: Desplegar servicios**

Desplegar `vase-labs` y luego `vase-labs-worker`. No desplegar
`vase-transcription`.

- [ ] **Step 3: Verificar un audio real**

Enviar un audio corto de WhatsApp. Confirmar:

- aparece el texto transcripto en la conversación;
- se genera una sola respuesta;
- el log contiene `audio_transcription_batch` con `completed: 1`;
- `AudioTranscriptionJob.status` queda en `COMPLETED`.
