import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const role = session.user.platformRole;
  if (role !== "SUPPORT" && role !== "DEVELOPER" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    availability?: "ONLINE" | "OFFLINE" | "BUSY";
  };
  if (!body.availability) {
    return NextResponse.json({ error: "availability requerida" }, { status: 400 });
  }

  const current = await prisma.internalUserProfile.findUnique({
    where: { userId: session.user.id },
    select: { availability: true },
  });
  if (!current) return NextResponse.json({ error: "perfil interno no encontrado" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    const nextAvailability = body.availability as "ONLINE" | "OFFLINE" | "BUSY";
    await tx.internalUserProfile.update({
      where: { userId: session.user.id },
      data: { availability: nextAvailability },
    });
    await tx.availabilityLog.create({
      data: {
        userId: session.user.id,
        actorUserId: session.user.id,
        previousStatus: current.availability,
        nextStatus: nextAvailability,
        changedBy: "SELF",
      },
    });
  });

  return NextResponse.json({ ok: true });
}
