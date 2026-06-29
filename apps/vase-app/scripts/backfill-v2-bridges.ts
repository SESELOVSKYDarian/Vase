import { prisma } from "../src/lib/db/prisma";

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = ${tableName}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function backfillClients() {
  const hasClientV2 = await tableExists("ClientV2");
  if (!hasClientV2) return;

  await prisma.$executeRawUnsafe(`
    INSERT INTO ClientV2 (id, tenantId, sourceClientAccountId, companyName, contactName, email, phone, notes, status, createdAt, updatedAt)
    SELECT
      UUID(), ca.tenantId, ca.id, COALESCE(ca.companyName, ca.name), ca.name, ca.email, ca.phone, NULL, ca.status, ca.createdAt, ca.updatedAt
    FROM ClientAccount ca
    LEFT JOIN ClientV2 c2 ON c2.sourceClientAccountId = ca.id
    WHERE c2.id IS NULL
  `);
}

async function backfillBudgets() {
  const hasBudgetV2 = await tableExists("BudgetV2");
  if (!hasBudgetV2) return;

  await prisma.$executeRawUnsafe(`
    INSERT INTO BudgetV2 (id, tenantId, sourceCustomQuoteId, clientId, projectId, status, totalCents, validUntil, createdAt, updatedAt)
    SELECT
      UUID(), q.tenantId, q.id, NULL, NULL, q.status, q.totalAmountCents, q.validUntil, q.createdAt, q.updatedAt
    FROM CustomQuote q
    LEFT JOIN BudgetV2 b2 ON b2.sourceCustomQuoteId = q.id
    WHERE b2.id IS NULL
  `);
}

async function backfillTickets() {
  const hasTicketV2 = await tableExists("TicketV2");
  if (!hasTicketV2) return;

  await prisma.$executeRawUnsafe(`
    INSERT INTO TicketV2 (id, tenantId, sourceSupportTicketId, projectId, clientId, title, description, status, priority, progress, estimatedHours, realHours, notifyClient, createdBy, createdAt, updatedAt)
    SELECT
      UUID(), t.tenantId, t.id, NULL, NULL, t.subject, t.aiSummary, t.status, t.priority, 0, NULL, NULL, false, t.createdByUserId, t.createdAt, t.updatedAt
    FROM SupportTicket t
    LEFT JOIN TicketV2 t2 ON t2.sourceSupportTicketId = t.id
    WHERE t2.id IS NULL
  `);
}

async function main() {
  await backfillClients();
  await backfillBudgets();
  await backfillTickets();
  console.info("V2 bridge backfill completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

