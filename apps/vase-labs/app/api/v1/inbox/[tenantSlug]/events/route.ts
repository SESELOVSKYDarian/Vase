import { labsPrisma } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  let lastSignature = "";
  let timer: ReturnType<typeof setInterval> | undefined;
  let keepAliveTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const check = async () => {
        try {
          const assistant = await (labsPrisma as any).assistant.findUnique({
            where: { tenantSlug },
            select: { id: true },
          });
          if (!assistant) return;
          const latest = await (labsPrisma as any).conversation.findFirst({
            where: { assistantId: assistant.id },
            orderBy: { updatedAt: "desc" },
            select: { id: true, updatedAt: true, messageCount: true },
          });
          const signature = latest
            ? `${latest.id}:${latest.updatedAt.toISOString()}:${latest.messageCount}`
            : "empty";
          if (!lastSignature) lastSignature = signature;
          else if (signature !== lastSignature) {
            lastSignature = signature;
            send("inbox.changed", { conversationId: latest?.id ?? null });
          }
        } catch {
          // The client keeps its last state and uses the normal polling fallback.
        }
      };

      send("ready", { intervalMs: 1500 });
      await check();
      timer = setInterval(() => void check(), 1500);
      keepAliveTimer = setInterval(() => {
        try { controller.enqueue(encoder.encode(": inbox-keepalive\n\n")); } catch { /* disconnected */ }
      }, 15_000);
      request.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        try { controller.close(); } catch { /* already closed */ }
      }, { once: true });
    },
    cancel() {
      if (timer) clearInterval(timer);
      if (keepAliveTimer) clearInterval(keepAliveTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    },
  });
}
