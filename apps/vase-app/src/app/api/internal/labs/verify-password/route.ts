import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ userId: z.string().min(1).max(160), password: z.string().min(1).max(512) }).strict();

export function createLabsPasswordVerifyHandler(input: {
  authorize(request: Request): void;
  limit(userId: string): Promise<unknown>;
  findHash(userId: string): Promise<string | null>;
  verify(password: string, hash: string): Promise<boolean>;
}) {
  return async function POST(request: Request) {
    try {
      input.authorize(request);
      const body = schema.parse(await request.json());
      await input.limit(body.userId);
      const hash = await input.findHash(body.userId);
      const verified = hash ? await input.verify(body.password, hash) : false;
      if (!verified) return NextResponse.json({ verified: false }, { status: 401 });
      return NextResponse.json({ verified: true });
    } catch (error) {
      const code = error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED" ? "RATE_LIMIT_EXCEEDED" : "PASSWORD_VERIFICATION_FAILED";
      return NextResponse.json({ verified: false, error: code }, { status: code === "RATE_LIMIT_EXCEEDED" ? 429 : 400 });
    }
  };
}

export const POST = createLabsPasswordVerifyHandler({
  authorize(request) { assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN); },
  limit(userId) { return enforceRateLimit({ scope: "labs-token-reveal", key: userId, limit: 5, windowSeconds: 300 }); },
  async findHash(userId) { return (await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } }))?.passwordHash ?? null; },
  verify: verifyPassword,
});
