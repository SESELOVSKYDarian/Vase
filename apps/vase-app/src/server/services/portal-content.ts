import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import type { ContactInquiryInput } from "@/lib/validators/contact";
import { createAuditLog } from "@/server/services/audit-log";
import { sendContactEmail } from "@/server/services/contact-email";

export function toPublicDocumentSummary(doc: {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  updatedAt: Date;
  sections: Array<{ title: string }>;
}) {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary ?? doc.sections[0]?.title ?? "Sin resumen.",
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toPublicDocumentDetail(doc: {
  slug: string;
  title: string;
  summary: string | null;
  sections: Array<{
    id: string;
    title: string;
    body: string;
    steps: Array<{ id: string; title: string; content: string }>;
  }>;
}) {
  return {
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary ?? "Guía oficial Vase.",
    sections: doc.sections.map((section) => ({
      id: section.id,
      title: section.title,
      body: section.body,
      steps: section.steps.map((step) => ({
        id: step.id,
        title: step.title,
        content: step.content,
      })),
    })),
  };
}

export async function listPortalDocuments() {
  const docs = await prisma.wikiDocument.findMany({
    where: { status: "PUBLISHED", isPublic: true },
    orderBy: { updatedAt: "desc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
    take: 30,
  });

  return docs.map(toPublicDocumentSummary);
}

export async function getPortalDocument(slug: string) {
  const doc = await prisma.wikiDocument.findFirst({
    where: { slug, status: "PUBLISHED", isPublic: true },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          steps: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  return doc ? toPublicDocumentDetail(doc) : null;
}

export async function deliverPortalContactInquiry(
  input: ContactInquiryInput,
  context: { ipAddress: string; userAgent: string | null },
) {
  await enforceRateLimit({
    scope: "marketing:contact",
    key: `${context.ipAddress}:${input.email}`,
    limit: 4,
    windowSeconds: 60 * 30,
  });
  await sendContactEmail(input);
  await createAuditLog({
    action: "marketing.contact_inquiry_submitted",
    targetType: "contact_inquiry",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: {
      fullName: input.fullName,
      email: input.email,
    },
  });
}
