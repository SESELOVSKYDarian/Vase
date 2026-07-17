import { describe, expect, it, vi } from "vitest";
import {
  createKnowledgeItem,
  mapKnowledgeInputToCreateData,
  type KnowledgeItemCreateData,
  type KnowledgeItemRecord,
  type KnowledgeRepository,
} from "../apps/vase-labs/app/lib/knowledge-repository";
import { createKnowledgePostHandler } from "../apps/vase-labs/app/api/labs/knowledge/route";

function record(data: KnowledgeItemCreateData): KnowledgeItemRecord {
  return { id: `knowledge_${data.assistantId}`, ...data };
}

describe("Labs knowledge repository", () => {
  it("maps every parsed source to the required Prisma data", () => {
    expect(mapKnowledgeInputToCreateData("assistant_1", {
      type: "FAQ", title: "Envios", question: "Cuanto demora?", answer: "48 horas",
    })).toEqual({
      assistantId: "assistant_1",
      title: "Envios",
      sourceType: "FAQ",
      content: "Pregunta: Cuanto demora?\nRespuesta: 48 horas",
      status: "READY",
    });
    expect(mapKnowledgeInputToCreateData("assistant_1", {
      type: "URL", title: "Ayuda", url: "https://vase.ar/ayuda",
    })).toMatchObject({ content: "https://vase.ar/ayuda", status: "READY" });
    expect(mapKnowledgeInputToCreateData("assistant_1", {
      type: "VASE_MANAGEMENT", title: "Catalogo",
    })).toMatchObject({ content: "Catalogo conectado mediante Vase Management", status: "READY" });
    expect(mapKnowledgeInputToCreateData("assistant_1", {
      type: "EXTERNAL_MANAGEMENT", title: "ERP",
    })).toMatchObject({ content: "Catalogo conectado mediante sistema de gestion externo", status: "READY" });
    expect(mapKnowledgeInputToCreateData("assistant_1", {
      type: "FILE", title: "Manual", fileName: "manual.docx",
    })).toMatchObject({ content: "manual.docx", status: "QUEUED" });
  });

  it("uses only the trusted assistant argument when creating records", async () => {
    const writes: KnowledgeItemCreateData[] = [];
    const repository: KnowledgeRepository = {
      async create(data) { writes.push(data); return record(data); },
    };

    await createKnowledgeItem(repository, "assistant_trusted", {
      type: "URL", title: "Docs", url: "https://vase.ar/docs",
    });

    expect(writes[0].assistantId).toBe("assistant_trusted");
  });
});

describe("POST /api/labs/knowledge", () => {
  function handler(options?: { resolveError?: Error; createError?: Error }) {
    const create = vi.fn(async (assistantId: string, input: Parameters<typeof mapKnowledgeInputToCreateData>[1]) => {
      if (options?.createError) throw options.createError;
      return record(mapKnowledgeInputToCreateData(assistantId, input));
    });
    const resolveContext = vi.fn(async () => {
      if (options?.resolveError) throw options.resolveError;
      return { assistant: { id: "assistant_resolved" } };
    });
    return { create, resolveContext, POST: createKnowledgePostHandler({ resolveContext, create }) };
  }

  it("creates under the resolved assistant and ignores caller tenant identifiers", async () => {
    const { POST, create, resolveContext } = handler();
    const response = await POST(new Request("https://labs.vase.ar/api/labs/knowledge", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "vase_session=signed" },
      body: JSON.stringify({
        type: "FAQ", title: "Pagos", question: "Aceptan tarjeta?", answer: "Si",
        assistantId: "assistant_attacker", globalTenantId: "tenant_attacker", tenantSlug: "attacker",
      }),
    }));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ knowledgeItem: { assistantId: "assistant_resolved" } });
    expect(resolveContext).toHaveBeenCalledWith("vase_session=signed");
    expect(create).toHaveBeenCalledWith("assistant_resolved", {
      type: "FAQ", title: "Pagos", question: "Aceptan tarjeta?", answer: "Si",
    });
  });

  it.each([
    ["malformed JSON", "{", "KNOWLEDGE_INPUT_INVALID"],
    ["invalid URL", JSON.stringify({ type: "URL", title: "Docs", url: "not-a-url" }), "KNOWLEDGE_URL_INVALID"],
  ])("returns a useful 400 for %s", async (_case, body, error) => {
    const response = await handler().POST(new Request("https://labs.vase.ar/api/labs/knowledge", {
      method: "POST", headers: { "content-type": "application/json" }, body,
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
  });

  it.each(["LABS_SESSION_REQUIRED", "LABS_SESSION_INVALID", "LABS_SESSION_EXPIRED"])(
    "maps the exact known auth code %s to 401",
    async (error) => {
      const response = await handler({ resolveError: new Error(error) }).POST(
        new Request("https://labs.vase.ar/api/labs/knowledge", { method: "POST", body: "{}" }),
      );
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error });
    },
  );

  it("maps the exact tenant authorization code to 403", async () => {
    const response = await handler({ resolveError: new Error("LABS_TENANT_FORBIDDEN") }).POST(
      new Request("https://labs.vase.ar/api/labs/knowledge", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "LABS_TENANT_FORBIDDEN" });
  });

  it.each([
    "database SESSION password leaked",
    "internal TENANT_FORBIDDEN diagnostic leaked",
  ])("hides deceptive internal message: %s", async (error) => {
    const response = await handler({ resolveError: new Error(error) }).POST(
      new Request("https://labs.vase.ar/api/labs/knowledge", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "KNOWLEDGE_CREATE_FAILED" });
  });

  it("hides persistence errors from the knowledge repository", async () => {
    const response = await handler({ createError: new Error("Prisma unique constraint details") }).POST(
      new Request("https://labs.vase.ar/api/labs/knowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "URL", title: "Docs", url: "https://vase.ar/docs" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "KNOWLEDGE_CREATE_FAILED" });
  });
});
