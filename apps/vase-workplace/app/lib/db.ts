import { PrismaClient } from "../generated/prisma";

const globalForPrisma = globalThis as typeof globalThis & {
  workplacePrisma?: PrismaClient;
};

export const db = globalForPrisma.workplacePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.workplacePrisma = db;
}
