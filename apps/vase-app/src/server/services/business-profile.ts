import { prisma } from "@/lib/db/prisma";
import { MAX_BRANCHES } from "@/lib/business/business-profile";
import { MAX_SOCIAL_LINKS, normalizeSocialUrl, socialColumns, type SocialLink } from "@/lib/business/social-links";

const REQUEST_TIMEOUT_MS = 4_000;

function businessOrigin() {
  const configured = process.env.BUSINESS_EDITOR_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

function serviceToken() {
  return process.env.SERVICE_TO_SERVICE_TOKEN?.trim() || null;
}

/** Lo que los productos leen de Mi negocio. */
export async function getBusinessProfilePayload(tenantId: string) {
  const [tenant, info, branches, billing] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, industry: true } }),
    prisma.tenantBusinessInfo.findUnique({ where: { tenantId } }),
    prisma.tenantBranch.findMany({ where: { tenantId }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] }),
    prisma.tenantBillingProfile.findUnique({ where: { tenantId } }),
  ]);
  if (!tenant) return null;

  // El nombre de la cuenta puede no ser el de la tienda: Business lo toma recién cuando la persona
  // guardó algo en Mi negocio (la importación inicial no cuenta).
  const confirmed = Boolean(info && info.updatedAt.getTime() - info.createdAt.getTime() > 1000);

  return {
    name: confirmed ? tenant.name : null,
    industry: tenant.industry,
    tagline: info?.tagline ?? null,
    logoUrl: info?.logoUrl ?? null,
    phone: info?.phone ?? null,
    whatsapp: info?.whatsapp ?? null,
    email: info?.email ?? null,
    website: info?.website ?? null,
    hours: info?.hours ?? null,
    timezone: info?.timezone ?? null,
    currency: info?.currency ?? null,
    socialLinks: Array.isArray(info?.socialLinks) ? info.socialLinks : [],
    branches: branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      hours: branch.hours,
      isMain: branch.isMain,
    })),
    fiscal: {
      legalName: billing?.legalName ?? null,
      taxId: billing?.taxId ?? null,
      taxCondition: billing?.taxCondition ?? null,
      fiscalAddress: billing?.fiscalAddress ?? null,
      city: billing?.city ?? null,
      province: billing?.province ?? null,
      postalCode: billing?.postalCode ?? null,
    },
    updatedAt: info?.updatedAt?.toISOString() ?? null,
  };
}

/** Avisa a Business que algo cambió, para que deje de usar lo que tenía guardado. No frena al usuario. */
export function notifyBusinessProfileChanged(tenantId: string) {
  const origin = businessOrigin();
  const token = serviceToken();
  if (!origin || !token) return;
  void fetch(new URL(`/api/v1/integrations/internal/tenant/${encodeURIComponent(tenantId)}/business-profile/invalidate`, origin), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch(() => {});
}

type BusinessSeed = {
  logoUrl?: string | null;
  tagline?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  socialLinks?: Array<{ network?: string; url?: string }>;
  branches?: Array<{ name?: string | null; address?: string | null; phone?: string | null; hours?: string | null }>;
  legalName?: string | null;
};

const clip = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);
const SEED_NETWORKS = new Set(["instagram", "facebook", "tiktok", "youtube"]);

function safeLogo(value: unknown) {
  const url = clip(value, 2048);
  if (!url) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * La primera vez que se abre Mi negocio, trae lo que la tienda de Business ya tenía cargado.
 * Se hace una sola vez: si Business responde (aunque no tenga nada), queda marcado.
 */
export async function importBusinessProfileSeed(tenantId: string) {
  const origin = businessOrigin();
  const token = serviceToken();
  if (!origin || !token) return false;

  let seed: BusinessSeed | null = null;
  try {
    const response = await fetch(
      new URL(`/api/v1/integrations/internal/tenant/${encodeURIComponent(tenantId)}/business-profile-seed`, origin),
      { headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
    if (response.status === 404) seed = {};
    else if (response.ok) seed = ((await response.json()) as { seed?: BusinessSeed }).seed ?? {};
    else return false;
  } catch {
    return false;
  }

  const socialLinks: SocialLink[] = (seed.socialLinks ?? [])
    .filter((link) => typeof link.network === "string" && SEED_NETWORKS.has(link.network))
    .map((link, index) => ({ id: `${link.network}-${index}`, network: link.network as SocialLink["network"], url: normalizeSocialUrl(String(link.url ?? "")) ?? "" }))
    .filter((link) => link.url)
    .slice(0, MAX_SOCIAL_LINKS);
  const branches = (seed.branches ?? [])
    .map((branch) => ({ name: clip(branch.name, 120), address: clip(branch.address, 191), phone: clip(branch.phone, 40), hours: clip(branch.hours, 120) }))
    .filter((branch): branch is { name: string; address: string; phone: string | null; hours: string | null } => Boolean(branch.name && branch.address))
    .slice(0, MAX_BRANCHES);
  const legalName = clip(seed.legalName, 191);

  await prisma.$transaction(async (tx) => {
    const already = await tx.tenantBusinessInfo.findUnique({ where: { tenantId }, select: { id: true } });
    if (already) return;
    await tx.tenantBusinessInfo.create({
      data: {
        tenantId,
        logoUrl: safeLogo(seed.logoUrl),
        tagline: clip(seed.tagline, 200),
        phone: clip(seed.phone, 40),
        email: clip(seed.email, 191),
        whatsapp: clip(seed.whatsapp, 40),
        socialLinks,
        ...socialColumns(socialLinks),
      },
    });
    const existingBranches = await tx.tenantBranch.count({ where: { tenantId } });
    if (existingBranches === 0 && branches.length) {
      await tx.tenantBranch.createMany({
        data: branches.map((branch, index) => ({ tenantId, ...branch, isMain: index === 0, sortOrder: index })),
      });
    }
    if (legalName) {
      const billing = await tx.tenantBillingProfile.findUnique({ where: { tenantId }, select: { legalName: true } });
      if (!billing?.legalName) {
        await tx.tenantBillingProfile.upsert({
          where: { tenantId },
          update: { legalName },
          create: { tenantId, legalName },
        });
      }
    }
  });
  return true;
}
