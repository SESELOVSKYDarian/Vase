import { NextResponse } from "next/server";
import { requireVerifiedPlatformRole, platformRoles, requireVerifiedUser } from "@/lib/auth/guards";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import {
  createSupportKnowledgeSchema,
  deleteSupportKnowledgeSchema,
  updateSupportKnowledgeSchema,
} from "@/lib/validators/support";
import {
  getSupportKnowledgeItemById,
  getSupportKnowledgeCategories,
  listSupportKnowledgeItems,
} from "@/server/queries/support-knowledge";
import {
  createSupportKnowledgeItem,
  deleteSupportKnowledgeItem,
  updateSupportKnowledgeItem,
} from "@/server/services/support-knowledge";

function parseTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((tag) => sanitizeText(String(tag))).filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((tag) => sanitizeText(tag))
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);
    const url = new URL(request.url);
    const tenantId = sanitizeNullableText(url.searchParams.get("tenantId") ?? "") ?? undefined;
    const q = sanitizeNullableText(url.searchParams.get("q") ?? "") ?? undefined;
    const category = sanitizeNullableText(url.searchParams.get("category") ?? "") ?? undefined;

    const [items, categories] = await Promise.all([
      listSupportKnowledgeItems({
        tenantId,
        q,
        category,
        includeInactive: true,
      }),
      getSupportKnowledgeCategories(tenantId),
    ]);

    return NextResponse.json({ items, categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = createSupportKnowledgeSchema.safeParse({
      tenantId: sanitizeNullableText(String(body.tenantId ?? "")) ?? undefined,
      question: sanitizeText(String(body.question ?? "")),
      answer: sanitizeText(String(body.answer ?? "")),
      category: sanitizeNullableText(String(body.category ?? "")) ?? undefined,
      tags: parseTags(body.tags),
      isActive: Boolean(body.isActive),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const item = await createSupportKnowledgeItem({
      ...parsed.data,
      createdByUserId: session.user.id,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = updateSupportKnowledgeSchema.safeParse({
      knowledgeId: body.knowledgeId,
      tenantId: sanitizeNullableText(String(body.tenantId ?? "")) ?? undefined,
      question: sanitizeText(String(body.question ?? "")),
      answer: sanitizeText(String(body.answer ?? "")),
      category: sanitizeNullableText(String(body.category ?? "")) ?? undefined,
      tags: parseTags(body.tags),
      isActive: Boolean(body.isActive),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const item = await updateSupportKnowledgeItem(parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = deleteSupportKnowledgeSchema.safeParse({
      knowledgeId: body.knowledgeId,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await getSupportKnowledgeItemById(parsed.data.knowledgeId);

    if (!existing) {
      return NextResponse.json({ error: "KNOWLEDGE_NOT_FOUND" }, { status: 404 });
    }

    const item = await deleteSupportKnowledgeItem({
      knowledgeId: parsed.data.knowledgeId,
      actorPlatformRole: session.user.platformRole,
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "FORBIDDEN_GLOBAL_DELETE" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
