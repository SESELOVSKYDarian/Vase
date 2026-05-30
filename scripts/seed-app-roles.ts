import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { key: "ADMIN", name: "Admin" },
    { key: "CLIENTE", name: "Cliente" },
    { key: "DEVELOPER", name: "Developer" },
    { key: "DESIGNER", name: "Designer" },
    { key: "TESTER", name: "Tester" },
    { key: "SOPORTE", name: "Soporte" },
  ] as const;

  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        isSystem: true,
      },
      create: {
        key: role.key,
        name: role.name,
        isSystem: true,
      },
    });
  }

  const users = await prisma.user.findMany({
    select: { id: true, platformRole: true },
  });

  for (const user of users) {
    const fallbackRole =
      user.platformRole === "SUPER_ADMIN"
        ? "ADMIN"
        : user.platformRole === "SUPPORT"
          ? "SOPORTE"
          : user.platformRole === "DEVELOPER"
            ? "DEVELOPER"
            : "CLIENTE";

    const role = await prisma.role.findUnique({
      where: { key: fallbackRole },
      select: { id: true },
    });

    if (!role) continue;

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
