import { labsOrderQuoteRequestSchema } from "@vase/contracts";
import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { buildLabsOrderQuote } from "@/server/services/labs-business-orders";

type Dependencies = {
  authorize(authorization: string | null): void;
  quote(input: unknown): Promise<unknown>;
};

function authError(error: unknown) {
  const message = error instanceof Error ? error.message : "FORBIDDEN";
  return NextResponse.json(
    { error: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? message : "FORBIDDEN" },
    { status: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? 503 : 403 },
  );
}

function serviceError(error: unknown) {
  if (error instanceof Error && error.message === "TENANT_NOT_FOUND") {
    return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ error: "BUSINESS_ORDER_QUOTE_UNAVAILABLE" }, { status: 502 });
}

export function createLabsOrderQuoteRouteHandler(dependencies: Dependencies) {
  return async function POST(request: Request) {
    try {
      dependencies.authorize(request.headers.get("authorization"));
    } catch (error) {
      return authError(error);
    }

    const body = await request.json().catch(() => null);
    const parsed = labsOrderQuoteRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

    try {
      return NextResponse.json(await dependencies.quote(parsed.data));
    } catch (error) {
      return serviceError(error);
    }
  };
}

export const runtime = "nodejs";

export const POST = createLabsOrderQuoteRouteHandler({
  authorize: (authorization) => assertServiceToken(authorization, process.env.SERVICE_TO_SERVICE_TOKEN),
  quote: buildLabsOrderQuote,
});
