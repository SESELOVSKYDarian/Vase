#!/bin/sh
set -eu

BASELINE_MIGRATION="20260621165900_baseline"

mode="$(node <<'NODE'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

(async () => {
  try {
    const migrationsTable = await prisma.$queryRawUnsafe(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations'"
    );
    const appTables = await prisma.$queryRawUnsafe(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> '_prisma_migrations'"
    );

    const migrationCount = Number(migrationsTable?.[0]?.count ?? 0);
    const appTableCount = Number(appTables?.[0]?.count ?? 0);

    if (migrationCount === 0 && appTableCount > 0) {
      process.stdout.write("baseline");
      return;
    }

    process.stdout.write("deploy");
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
)"

if [ "$mode" = "baseline" ]; then
  echo "Baseline Prisma history for existing database..."
  npx prisma migrate resolve --applied "$BASELINE_MIGRATION"
fi

npx prisma migrate deploy
exec "$@"
