CREATE TABLE "BranchOrderSequence" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "branchId" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1, CONSTRAINT "BranchOrderSequence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BranchOrderSequence_branchId_key" ON "BranchOrderSequence"("branchId");

CREATE TABLE "RestaurantOrder" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL, "tableId" TEXT, "orderNumber" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN', "guestCount" INTEGER NOT NULL,
  "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0, "discountTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(18,2) NOT NULL DEFAULT 0, "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "revision" INTEGER NOT NULL DEFAULT 1, "openedBy" TEXT NOT NULL, "submittedAt" TIMESTAMP(3),
  "servedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3), "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RestaurantOrder_branchId_orderNumber_key" ON "RestaurantOrder"("branchId","orderNumber");
CREATE INDEX "RestaurantOrder_globalTenantId_branchId_status_createdAt_idx"
ON "RestaurantOrder"("globalTenantId","branchId","status","createdAt");

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL, "skuSnapshot" TEXT NOT NULL, "nameSnapshot" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL, "unitPrice" DECIMAL(18,2) NOT NULL,
  "modifierTotal" DECIMAL(18,2) NOT NULL DEFAULT 0, "lineTotal" DECIMAL(18,2) NOT NULL,
  "course" INTEGER NOT NULL DEFAULT 1, "notes" TEXT, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "revision" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrderItem_globalTenantId_orderId_status_idx" ON "OrderItem"("globalTenantId","orderId","status");

CREATE TABLE "OrderItemModifier" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "orderItemId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL, "nameSnapshot" TEXT NOT NULL, "quantity" INTEGER NOT NULL,
  "unitDelta" DECIMAL(18,2) NOT NULL, "totalDelta" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "OrderItemModifier_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrderItemModifier_globalTenantId_orderItemId_idx"
ON "OrderItemModifier"("globalTenantId","orderItemId");

CREATE TABLE "KitchenStation" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "KitchenStation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KitchenStation_branchId_code_key" ON "KitchenStation"("branchId","code");
CREATE INDEX "KitchenStation_globalTenantId_branchId_active_idx" ON "KitchenStation"("globalTenantId","branchId","active");

CREATE TABLE "KitchenStationCategory" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "stationId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL, CONSTRAINT "KitchenStationCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KitchenStationCategory_stationId_categoryId_key"
ON "KitchenStationCategory"("stationId","categoryId");
CREATE INDEX "KitchenStationCategory_globalTenantId_categoryId_idx"
ON "KitchenStationCategory"("globalTenantId","categoryId");

CREATE TABLE "KitchenTicket" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "branchId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL, "orderItemId" TEXT NOT NULL, "stationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED', "revision" INTEGER NOT NULL DEFAULT 1,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "preparingAt" TIMESTAMP(3),
  "readyAt" TIMESTAMP(3), "servedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "KitchenTicket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KitchenTicket_orderItemId_key" ON "KitchenTicket"("orderItemId");
CREATE INDEX "KitchenTicket_globalTenantId_branchId_stationId_status_queuedAt_idx"
ON "KitchenTicket"("globalTenantId","branchId","stationId","status","queuedAt");

CREATE TABLE "KitchenTicketTransition" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "ticketId" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL, "toStatus" TEXT NOT NULL, "fromRevision" INTEGER NOT NULL,
  "toRevision" INTEGER NOT NULL, "commandId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KitchenTicketTransition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KitchenTicketTransition_globalTenantId_commandId_key"
ON "KitchenTicketTransition"("globalTenantId","commandId");
CREATE INDEX "KitchenTicketTransition_ticketId_occurredAt_idx"
ON "KitchenTicketTransition"("ticketId","occurredAt");

CREATE TABLE "OrderCommandReceipt" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "commandId" TEXT NOT NULL, "action" TEXT NOT NULL, "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderCommandReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderCommandReceipt_globalTenantId_commandId_key"
ON "OrderCommandReceipt"("globalTenantId","commandId");
CREATE INDEX "OrderCommandReceipt_orderId_createdAt_idx" ON "OrderCommandReceipt"("orderId","createdAt");

ALTER TABLE "BranchOrderSequence" ADD CONSTRAINT "BranchOrderSequence_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MenuProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItemModifier" ADD CONSTRAINT "OrderItemModifier_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenStation" ADD CONSTRAINT "KitchenStation_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenStation" ADD CONSTRAINT "KitchenStation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenStationCategory" ADD CONSTRAINT "KitchenStationCategory_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "KitchenStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenStationCategory" ADD CONSTRAINT "KitchenStationCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "KitchenStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenTicketTransition" ADD CONSTRAINT "KitchenTicketTransition_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "KitchenTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderCommandReceipt" ADD CONSTRAINT "OrderCommandReceipt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
