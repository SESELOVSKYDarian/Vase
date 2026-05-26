import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.MASTER_ADMIN_EMAIL ?? "vasescompany912@gmail.com";
  const password = process.env.MASTER_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("MASTER_ADMIN_PASSWORD no esta configurada.");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Vase Master Admin",
      platformRole: "SUPER_ADMIN",
      passwordHash,
      emailVerified: new Date(),
    },
    create: {
      name: "Vase Master Admin",
      email,
      platformRole: "SUPER_ADMIN",
      passwordHash,
      emailVerified: new Date(),
      locale: "es",
    },
  });

  console.info(
    JSON.stringify({
      event: "bootstrap-master-admin.completed",
      userId: user.id,
      email: user.email,
      platformRole: user.platformRole,
      emailVerified: Boolean(user.emailVerified),
    }),
  );
}

main()
  .catch((error) => {
    console.error("[bootstrap-master-admin] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
