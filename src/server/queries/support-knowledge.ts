import { prisma } from "@/lib/db/prisma";

export type SupportKnowledgeFilters = {
  tenantId?: string;
  q?: string;
  category?: string;
  includeInactive?: boolean;
};

function normalizeTags(tags: unknown) {
  return Array.isArray(tags)
    ? tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
}

type SupportKnowledgeSearchItem = {
  id: string;
  tenantId: string | null;
  question: string;
  answer: string;
  category: string | null;
  tags: unknown;
  isActive: boolean;
  updatedAt: Date;
  tenant?: {
    id: string;
    name: string;
    accountName: string;
  } | null;
  createdByUser?: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type SupportKnowledgeMatch = {
  item: SupportKnowledgeSearchItem;
  score: number;
};

function computeKnowledgeScore(input: {
  item: {
    tenantId: string | null;
    question: string;
    answer: string;
    category: string | null;
    tags: unknown;
  };
  query: string;
  tenantId?: string;
}) {
  const normalizedQuery = input.query.toLowerCase().trim();

  if (!normalizedQuery) {
    return 0;
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const tags = normalizeTags(input.item.tags);
  const haystack = [
    input.item.question,
    input.item.answer,
    input.item.category ?? "",
    tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  if (input.tenantId && input.item.tenantId === input.tenantId) {
    score += 8;
  }

  if (input.item.question.toLowerCase().includes(normalizedQuery)) {
    score += 12;
  }

  if ((input.item.category ?? "").toLowerCase().includes(normalizedQuery)) {
    score += 6;
  }

  score += queryTokens.reduce((total, token) => {
    if (tags.some((tag) => tag.toLowerCase().includes(token))) {
      return total + 4;
    }

    if (haystack.includes(token)) {
      return total + 2;
    }

    return total;
  }, 0);

  return score;
}

export async function listSupportKnowledgeItems(filters: SupportKnowledgeFilters = {}) {
  const query = filters.q?.trim();

  const items = await prisma.supportKnowledgeItem.findMany({
    where: {
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.tenantId
        ? {
            OR: [{ tenantId: null }, { tenantId: filters.tenantId }],
          }
        : {}),
    },
    orderBy: [{ tenantId: "desc" }, { updatedAt: "desc" }],
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          accountName: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!query) {
    return items;
  }

  return items
    .map((item) => ({
      item,
      score: computeKnowledgeScore({ item, query, tenantId: filters.tenantId }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.item.updatedAt.getTime() - left.item.updatedAt.getTime())
    .map((entry) => entry.item);
}

export async function getSupportKnowledgeItemById(knowledgeId: string) {
  return prisma.supportKnowledgeItem.findUnique({
    where: { id: knowledgeId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          accountName: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function findRelevantSupportKnowledgeItems(input: {
  message: string;
  tenantId?: string;
  limit?: number;
}) {
  const items = await prisma.supportKnowledgeItem.findMany({
    where: {
      isActive: true,
      ...(input.tenantId
        ? {
            OR: [{ tenantId: null }, { tenantId: input.tenantId }],
          }
        : {}),
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          accountName: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return items
    .map((item) => ({
      item,
      score: computeKnowledgeScore({
        item,
        query: input.message,
        tenantId: input.tenantId,
      }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (input.tenantId) {
        const leftTenantWeight = left.item.tenantId === input.tenantId ? 1 : 0;
        const rightTenantWeight = right.item.tenantId === input.tenantId ? 1 : 0;

        if (rightTenantWeight !== leftTenantWeight) {
          return rightTenantWeight - leftTenantWeight;
        }
      }

      return right.item.updatedAt.getTime() - left.item.updatedAt.getTime();
    })
    .slice(0, input.limit ?? 5);
}

export async function getSupportKnowledgeCategories(tenantId?: string) {
  const items = await prisma.supportKnowledgeItem.findMany({
    where: {
      isActive: true,
      ...(tenantId ? { OR: [{ tenantId: null }, { tenantId }] } : {}),
      category: {
        not: null,
      },
    },
    select: {
      category: true,
    },
    distinct: ["category"],
    orderBy: {
      category: "asc",
    },
  });

  return items.map((item) => item.category).filter(Boolean) as string[];
}
