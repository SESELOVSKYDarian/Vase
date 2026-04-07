import { prisma } from "@/lib/db/prisma";

type RateLimitOptions = {
  scope: string;
  key: string;
  limit: number;
  windowSeconds: number;
};

export async function enforceRateLimit({
  scope,
  key,
  limit,
  windowSeconds,
}: RateLimitOptions) {
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000,
  );

  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      key_scope_windowStart: {
        key,
        scope,
        windowStart,
      },
    },
    update: {
      count: {
        increment: 1,
      },
    },
    create: {
      key,
      scope,
      windowStart,
      count: 1,
    },
  });

  if (bucket.count > limit) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  return {
    remaining: Math.max(limit - bucket.count, 0),
    resetAt: new Date(windowStart.getTime() + windowSeconds * 1000),
  };
}
