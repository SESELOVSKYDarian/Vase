CREATE TABLE "SupportRequestReceipt" (
    "requestId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportRequestReceipt_pkey" PRIMARY KEY ("requestId")
);

CREATE UNIQUE INDEX "SupportRequestReceipt_ticketId_key"
ON "SupportRequestReceipt"("ticketId");

ALTER TABLE "SupportRequestReceipt"
ADD CONSTRAINT "SupportRequestReceipt_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
