import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: npx tsx scripts/enable-labs.ts <email-del-usuario>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { role: { in: ["OWNER", "MANAGER"] } },
        include: { tenant: true },
      },
    },
  });

  if (!user) {
    console.error("Usuario no encontrado");
    process.exit(1);
  }

  if (user.memberships.length === 0) {
    console.error("El usuario no es OWNER ni MANAGER de ningun tenant");
    process.exit(1);
  }

  const tenant = user.memberships[0].tenant;

  const module = await prisma.module.upsert({
    where: { id: "vase_labs" },
    update: {},
    create: {
      id: "vase_labs",
      name: "Vase Labs",
      description: "Vase Labs Module",
      isActive: true,
      product: "LABS",
      route: "/app/labs",
    },
  });

  await prisma.tenantModule.upsert({
    where: {
      tenantId_moduleId: {
        tenantId: tenant.id,
        moduleId: "vase_labs",
      },
    },
    update: { isActive: true },
    create: {
      tenantId: tenant.id,
      moduleId: "vase_labs",
      isActive: true,
    },
  });

  await prisma.aIWorkspace.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      plan: "STARTER",
    },
  });

  console.log(`Modulo Labs activado exitosamente para el tenant: ${tenant.name}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
