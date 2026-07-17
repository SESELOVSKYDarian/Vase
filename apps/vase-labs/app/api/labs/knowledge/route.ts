import { NextResponse } from "next/server";
import { knowledgeRepository, type KnowledgeItemRecord } from "../../../lib/knowledge-repository";
import { parseKnowledgeInput, type ParsedKnowledgeInput } from "../../../lib/knowledge-source";
import { resolveLabsRequestContext } from "../../../lib/request-context";

type KnowledgePostDependencies = {
  resolveContext(cookieHeader: string | null): Promise<{ assistant: { id: string } }>;
  create(assistantId: string, input: ParsedKnowledgeInput): Promise<KnowledgeItemRecord>;
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
      const knowledgeItem = await dependencies.create(resolved.assistant.id, input);
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
      return NextResponse.json({ error: "KNOWLEDGE_CREATE_FAILED" }, { status: 500 });
    }
  };
}

export const POST = createKnowledgePostHandler({
  resolveContext: resolveLabsRequestContext,
  create: knowledgeRepository.create,
});
