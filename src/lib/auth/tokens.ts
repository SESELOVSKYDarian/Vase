import { createHash, randomBytes } from "node:crypto";
import { appConfig } from "@/config/app";
import { prisma } from "@/lib/db/prisma";

type TokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenExpiry(type: TokenType) {
  const now = Date.now();

  if (type === "EMAIL_VERIFICATION") {
    return new Date(now + appConfig.security.emailVerificationHours * 60 * 60 * 1000);
  }

  return new Date(now + appConfig.security.passwordResetMinutes * 60 * 1000);
}

export async function issueAuthToken(userId: string, type: TokenType) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = tokenExpiry(type);

  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function consumeAuthToken(rawToken: string, type: TokenType) {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.authToken.findUnique({
    where: {
      type_tokenHash: {
        type,
        tokenHash,
      },
    },
    include: {
      user: true,
    },
  });

  if (!token || token.consumedAt || token.expiresAt < new Date()) {
    return null;
  }

  await prisma.authToken.update({
    where: {
      id: token.id,
    },
    data: {
      consumedAt: new Date(),
    },
  });

  return token;
}

export async function peekAuthToken(rawToken: string, type: TokenType) {
  const tokenHash = hashToken(rawToken);

  return prisma.authToken.findUnique({
    where: {
      type_tokenHash: {
        type,
        tokenHash,
      },
    },
    include: {
      user: true,
    },
  });
}

export async function revokeAuthTokens(userId: string, type: TokenType) {
  await prisma.authToken.updateMany({
    where: {
      userId,
      type,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });
}
