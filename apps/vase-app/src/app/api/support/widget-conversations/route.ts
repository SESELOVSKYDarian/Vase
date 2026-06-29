import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const membership = await getTenantMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ items: [] });
  }

  const items = await prisma.supportAiConversation.findMany({
    where: {
      tenantId: membership.tenantId,
      userId: session.user.id,
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ items });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const membership = await getTenantMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });
  }

  const item = await prisma.supportAiConversation.create({
    data: {
      tenantId: membership.tenantId,
      userId: session.user.id,
      title: "Nuevo chat",
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ item });
}

