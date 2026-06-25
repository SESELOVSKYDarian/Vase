import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  labsPrisma?: PrismaClient;
};

export const labsPrisma = globalForPrisma.labsPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.labsPrisma = labsPrisma;
}
