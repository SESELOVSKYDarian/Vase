import { NextResponse } from "next/server";
import { knowledgeRepository, type KnowledgeItemRecord } from "../../../lib/knowledge-repository";
import { parseKnowledgeInput, type ParsedKnowledgeInput } from "../../../lib/knowledge-source";
import { resolveLabsRequestContext } from "../../../lib/request-context";
import { createBusinessCatalogSnapshotImporter } from "../../../lib/business-catalog-snapshot";
import { labsCatalogService } from "../../../lib/catalog-repository";

type KnowledgePostDependencies = {
  resolveContext(cookieHeader: string | null): Promise<{
    context: { globalTenantId: string };
    assistant: { id: string };
  }>;
  syncExternalCatalog(globalTenantId: string): Promise<unknown>;
  create(assistantId: string, input: ParsedKnowledgeInput): Promise<KnowledgeItemRecord>;
  createExternal(
    assistantId: string,
    globalTenantId: string,
    input: Extract<ParsedKnowledgeInput, { type: "EXTERNAL_MANAGEMENT" }>,
    importSnapshot: (globalTenantId: string) => Promise<unknown>,
  ): Promise<KnowledgeItemRecord>;
};

const validationErrors = new Set([
  "KNOWLEDGE_INPUT_INVALID",
  "KNOWLEDGE_FILE_TYPE_UNSUPPORTED",
  "KNOWLEDGE_URL_INVALID",
  "KNOWLEDGE_FAQ_INVALID",
]);
const authenticationErrors = new Set([
  "LABS_SESSION_REQUIRED",
  "LABS_SESSION_INVALID",
  "LABS_SESSION_EXPIRED",
]);
const authorizationErrors = new Set(["LABS_TENANT_FORBIDDEN"]);
const notConnectedErrors = new Set(["EXTERNAL_MANAGEMENT_NOT_CONNECTED"]);
const upstreamErrors = new Set(["EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE"]);
const conflictErrors = new Set([
  "KNOWLEDGE_SOURCE_ALREADY_EXISTS",
  "KNOWLEDGE_SOURCE_RESERVATION_LOST",
]);

export function createKnowledgePostHandler(dependencies: KnowledgePostDependencies) {
  return async function POST(request: Request) {
    try {
      const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        throw new Error("KNOWLEDGE_INPUT_INVALID");
      }
      const input = parseKnowledgeInput(body);
      const knowledgeItem = input.type === "EXTERNAL_MANAGEMENT"
        ? await dependencies.createExternal(
          resolved.assistant.id,
          resolved.context.globalTenantId,
          input,
          dependencies.syncExternalCatalog,
        )
        : await dependencies.create(resolved.assistant.id, input);
      return NextResponse.json({ knowledgeItem }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (validationErrors.has(message)) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      if (authenticationErrors.has(message)) {
        return NextResponse.json({ error: message }, { status: 401 });
      }
      if (authorizationErrors.has(message)) {
        return NextResponse.json({ error: message }, { status: 403 });
      }
      if (notConnectedErrors.has(message)) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      if (upstreamErrors.has(message)) {
        return NextResponse.json({ error: message }, { status: 502 });
      }
      if (conflictErrors.has(message)) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      return NextResponse.json({ error: "KNOWLEDGE_CREATE_FAILED" }, { status: 500 });
    }
  };
}

export const POST = createKnowledgePostHandler({
  resolveContext: resolveLabsRequestContext,
  syncExternalCatalog: createBusinessCatalogSnapshotImporter({
    fetchUpstream: fetch,
    sync: (batch) => labsCatalogService.sync(batch),
    appInternalUrl: process.env.APP_INTERNAL_URL,
    serviceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
  }),
  create: knowledgeRepository.create,
  createExternal: knowledgeRepository.createExternal,
});
