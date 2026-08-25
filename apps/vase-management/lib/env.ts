// lib/env.ts
// Validación centralizada de variables de entorno.
//
// REGLA: en producción (NODE_ENV=production), si falta una variable crítica
// el proceso debe fallar al arrancar — no debe arrancar "a medias" con un
// fallback silencioso (eso es lo que generaría, por ejemplo, facturación
// fiscal mock corriendo en producción sin que nadie lo note).
//
// Este módulo se importa desde lib/prisma.ts (que es el primer punto de
// entrada compartido por API routes y Server Components), por lo que la
// validación corre apenas se toca cualquier endpoint que use la base.

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Crítico siempre
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET es obligatoria'),
  NEXTAUTH_URL: z.string().url().optional(),

  // IA — opcional en cualquier entorno (degrada funcionalidad, no bloquea)
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),

  // Fiscal AFIP/ARCA — crítico SOLO en producción si AFIP_ENV=production
  AFIP_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  AFIP_CERT: z.string().optional(),
  AFIP_KEY: z.string().optional(),
  AFIP_CUIT: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const issues = parsed.error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n')
    const message = `❌ Variables de entorno inválidas:\n${issues}`

    if (process.env.NODE_ENV === 'production') {
      // En producción: NO arrancar. Esto es intencional.
      throw new Error(message)
    }
    // En desarrollo: avisar fuerte pero no bloquear (permite onboarding sin .env completo)
    console.error(message)
    return envSchema.parse({ ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? '', NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'dev-only-insecure-secret' })
  }

  const env = parsed.data

  // Regla de negocio crítica: facturación fiscal en producción requiere
  // credenciales AFIP reales. Si AFIP_ENV=production sin certificados,
  // bloqueamos el arranque para que NUNCA salga un CAE mock como si fuera real.
  if (process.env.NODE_ENV === 'production' && env.AFIP_ENV === 'production') {
    if (!env.AFIP_CERT || !env.AFIP_KEY || !env.AFIP_CUIT) {
      throw new Error(
        '❌ AFIP_ENV=production pero faltan AFIP_CERT / AFIP_KEY / AFIP_CUIT. ' +
        'No se puede arrancar: esto evita que el sistema emita CAE simulados como si fueran fiscales reales. ' +
        'Configurá las credenciales reales o dejá AFIP_ENV=sandbox.'
      )
    }
  }

  return env
}

export const env = validateEnv()
