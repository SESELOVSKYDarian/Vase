# Vase Rest

Production restaurant operations module for Vase.

## Runtime

- Next.js 16.2.1 / React 19
- Prisma 6 with the dedicated PostgreSQL service `postgres-rest`
- Port `3009`
- Public domain `https://rest.vase.ar`

## Local setup

1. Copy `.env.example` to `.env.local` and provide real development credentials.
2. Run `npm run prisma:generate --workspace @vase/rest`.
3. Apply migrations with `npm run prisma:migrate:deploy --workspace @vase/rest`.
4. Start with `npm run dev:v3:rest`.

The `noctua`, `backend-reservas`, `supabase`, and `Proyecto-Restaurante` directories are preserved migration references. New production code must not import them.
