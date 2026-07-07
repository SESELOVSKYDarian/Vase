import { PrismaClient } from "../generated/prisma";

export { Prisma } from "../generated/prisma";
export type { PrismaClient } from "../generated/prisma";

const globalForPrisma = globalThis as unknown as {
  labsPrisma?: PrismaClient;
};

export const labsPrisma = globalForPrisma.labsPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.labsPrisma = labsPrisma;
}
