import { prisma } from "@/lib/db/prisma";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
}

export async function generateUniqueTenantSlug(accountName: string) {
  const base = slugify(accountName) || "workspace";
  let candidate = base;
  let index = 1;

  // Small loop with bounded suffixing to avoid collisions.
  while (await prisma.tenant.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}
