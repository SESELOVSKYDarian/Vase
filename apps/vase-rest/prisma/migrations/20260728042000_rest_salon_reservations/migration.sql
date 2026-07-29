CREATE TABLE "DiningFloor" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true,
  "revision" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "DiningFloor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiningFloor_branchId_code_key" ON "DiningFloor"("branchId","code");
CREATE INDEX "DiningFloor_globalTenantId_branchId_active_idx" ON "DiningFloor"("globalTenantId","branchId","active");

CREATE TABLE "DiningZone" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "floorId" TEXT NOT NULL,
  "code" TEXT NOT NULL, "name" TEXT NOT NULL, "colorToken" TEXT,
  CONSTRAINT "DiningZone_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiningZone_floorId_code_key" ON "DiningZone"("floorId","code");

CREATE TABLE "DiningTable" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "branchId" TEXT NOT NULL,
  "floorId" TEXT NOT NULL, "zoneId" TEXT, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL, "x" DECIMAL(10,2) NOT NULL, "y" DECIMAL(10,2) NOT NULL,
  "width" DECIMAL(10,2) NOT NULL, "height" DECIMAL(10,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE', "revision" INTEGER NOT NULL DEFAULT 1,
  "mergeGroupId" TEXT, "mergedIntoId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiningTable_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiningTable_branchId_code_key" ON "DiningTable"("branchId","code");
CREATE INDEX "DiningTable_globalTenantId_branchId_status_idx" ON "DiningTable"("globalTenantId","branchId","status");
CREATE INDEX "DiningTable_mergeGroupId_idx" ON "DiningTable"("mergeGroupId");

CREATE TABLE "TableTransition" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "branchId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL, "fromStatus" TEXT NOT NULL, "toStatus" TEXT NOT NULL,
  "fromRevision" INTEGER NOT NULL, "toRevision" INTEGER NOT NULL, "actorId" TEXT NOT NULL,
  "commandId" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TableTransition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TableTransition_globalTenantId_commandId_key"
ON "TableTransition"("globalTenantId","commandId");
CREATE INDEX "TableTransition_tableId_occurredAt_idx" ON "TableTransition"("tableId","occurredAt");

CREATE TABLE "Reservation" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL, "guestName" TEXT NOT NULL, "guestPhone" TEXT,
  "partySize" INTEGER NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED', "notes" TEXT, "revision" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL, "cancelledAt" TIMESTAMP(3), "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Reservation_globalTenantId_branchId_startsAt_endsAt_idx"
ON "Reservation"("globalTenantId","branchId","startsAt","endsAt");
CREATE INDEX "Reservation_branchId_status_startsAt_idx" ON "Reservation"("branchId","status","startsAt");

CREATE TABLE "ReservationTable" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "reservationId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL, CONSTRAINT "ReservationTable_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReservationTable_reservationId_tableId_key"
ON "ReservationTable"("reservationId","tableId");
CREATE INDEX "ReservationTable_globalTenantId_tableId_idx" ON "ReservationTable"("globalTenantId","tableId");

ALTER TABLE "DiningFloor" ADD CONSTRAINT "DiningFloor_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiningFloor" ADD CONSTRAINT "DiningFloor_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiningZone" ADD CONSTRAINT "DiningZone_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "DiningFloor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiningTable" ADD CONSTRAINT "DiningTable_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiningTable" ADD CONSTRAINT "DiningTable_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "DiningFloor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiningTable" ADD CONSTRAINT "DiningTable_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "DiningZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TableTransition" ADD CONSTRAINT "TableTransition_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReservationTable" ADD CONSTRAINT "ReservationTable_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReservationTable" ADD CONSTRAINT "ReservationTable_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
