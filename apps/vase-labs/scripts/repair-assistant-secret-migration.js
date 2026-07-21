const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { PrismaClient } = require("../app/generated/prisma");

const migrationName = "20260721091500_assistant_openai_key";
const prisma = new PrismaClient();

async function main() {
  const migrationTables = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations'",
  );
  if (Number(migrationTables[0]?.tableCount ?? 0) === 0) return;

  const failed = await prisma.$queryRawUnsafe(
    "SELECT migration_name FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NULL AND rolled_back_at IS NULL LIMIT 1",
    migrationName,
  );
  if (!Array.isArray(failed) || failed.length === 0) return;

  const tables = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'AssistantSecret'",
  );
  if (Number(tables[0]?.tableCount ?? 0) > 0) {
    const rows = await prisma.$queryRawUnsafe("SELECT COUNT(*) AS rowCount FROM AssistantSecret");
    if (Number(rows[0]?.rowCount ?? 0) !== 0) {
      throw new Error("ASSISTANT_SECRET_RECOVERY_REFUSED_NON_EMPTY_TABLE");
    }
    await prisma.$executeRawUnsafe("DROP TABLE AssistantSecret");
  }

  await prisma.$disconnect();
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  console.log(`Running prisma migrate resolve --rolled-back ${migrationName}`);
  execFileSync(executable, ["prisma", "migrate", "resolve", "--rolled-back", migrationName], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
  });
}

main()
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
