// lib/prisma.ts
// Singleton de Prisma Client para evitar múltiples conexiones en desarrollo

import { PrismaClient } from '@prisma/client'
import '@/lib/env' // valida env vars al primer import — bloquea arranque en prod si faltan críticas

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
