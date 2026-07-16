import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const pricing = await prisma.managementPricingVersion.findFirst({ where: { status: "PUBLISHED" }, orderBy: { version: "desc" } });
  return NextResponse.json(pricing ? { version: pricing.version, currency: pricing.currency, setupPrice: Number(pricing.setupPrice), monthlyPrice: Number(pricing.monthlyPrice), publishedAt: pricing.publishedAt?.toISOString() ?? null } : { version: 0, currency: "ARS", setupPrice: 350000, monthlyPrice: 95000, publishedAt: null });
}
