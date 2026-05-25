import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { issueAuthToken, revokeAuthTokens } from "../src/lib/auth/tokens";
import { sendAuthEmail } from "../src/server/services/auth-email";

const prisma = new PrismaClient();

async function main() {
  const email = "vasescompany912@gmail.com";
  const password = process.env.MASTER_ADMIN_PASSWORD;
  const baseUrl = process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

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
      isDisabled: false,
      forcePasswordChange: false,
    },
    create: {
      name: "Vase Master Admin",
      email,
      platformRole: "SUPER_ADMIN",
      passwordHash,
      locale: "es",
    },
  });

  await revokeAuthTokens(user.id, "EMAIL_VERIFICATION");
  const token = await issueAuthToken(user.id, "EMAIL_VERIFICATION");
  const verifyUrl = `${baseUrl.replace(/\/$/, "")}/verify-email?token=${token.token}`;
  await sendAuthEmail({
    email,
    subject: "Verifica tu acceso Master Admin de Vase",
    actionUrl: verifyUrl,
  });

  console.info(`[bootstrap-master-admin] user=${email} verification_sent=true`);
}

main()
  .catch((error) => {
    console.error("[bootstrap-master-admin] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
