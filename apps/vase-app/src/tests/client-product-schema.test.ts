import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(
  new URL(
    "../../prisma/migrations/20260804090000_client_product_access_and_team/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

function prismaBlock(kind: "enum" | "model", name: string) {
  const match = new RegExp(
    `(?:^|\\n)${kind}\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`,
    "m",
  ).exec(schema);

  if (!match) {
    throw new Error(`Missing ${kind} ${name}`);
  }

  return match[1];
}

function sqlTable(name: string) {
  const match = new RegExp(
    "CREATE TABLE `" + name + "` \\(([\\s\\S]*?)\\n\\) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
    "m",
  ).exec(migration);

  if (!match) {
    throw new Error(`Missing migration table ${name}`);
  }

  return match[1];
}

function sqlAlter(name: string) {
  const match = new RegExp("ALTER TABLE `" + name + "`\\s+([\\s\\S]*?);", "m").exec(migration);

  if (!match) {
    throw new Error(`Missing ALTER TABLE ${name}`);
  }

  return match[1];
}

function expectForeignKey(
  table: string,
  column: string,
  targetTable: string,
  onDelete: "CASCADE" | "SET NULL",
) {
  const statement = new RegExp(
    "ALTER TABLE `" +
      table +
      "`\\s+ADD CONSTRAINT `[^`]+`\\s+FOREIGN KEY \\(`" +
      column +
      "`\\) REFERENCES `" +
      targetTable +
      "`\\(`id`\\) ON DELETE " +
      onDelete +
      " ON UPDATE CASCADE;",
    "m",
  );

  expect(migration).toMatch(statement);
}

function expectCompositeForeignKey(
  table: string,
  columns: [string, string],
  targetTable: string,
  targetColumns: [string, string],
) {
  const source = columns.map((column) => "`" + column + "`").join(", ");
  const target = targetColumns.map((column) => "`" + column + "`").join(", ");
  const statement = new RegExp(
    "ALTER TABLE `" +
      table +
      "`\\s+ADD CONSTRAINT `[^`]+`\\s+FOREIGN KEY \\(" +
      source +
      "\\) REFERENCES `" +
      targetTable +
      "`\\(" +
      target +
      "\\) ON DELETE CASCADE ON UPDATE CASCADE;",
    "m",
  );

  expect(migration).toMatch(statement);
}

function expectLines(block: string, lines: RegExp[]) {
  for (const line of lines) {
    expect(block).toMatch(line);
  }
}

function expectTimestampFields(block: string) {
  expectLines(block, [
    /^\s*createdAt\s+DateTime\s+@default\(now\(\)\)\s*$/m,
    /^\s*updatedAt\s+DateTime\s+@updatedAt\s*$/m,
  ]);
}

function expectEnumValues(name: string, values: string[]) {
  const valuesInSchema = prismaBlock("enum", name)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  expect(valuesInSchema).toEqual(values);
}

describe("client product access schema", () => {
  it("defines every commercial access enum with its supported values", () => {
    expectEnumValues("CommercialAccessStatus", ["TRIAL", "ACTIVE", "SUSPENDED"]);
    expectEnumValues("ModuleFeatureValueType", ["BOOLEAN", "INTEGER", "TEXT"]);
    expectEnumValues("TenantInvitationStatus", ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]);
    expectEnumValues("TenantInvitationRole", ["MANAGER", "MEMBER"]);
    expectEnumValues("LabsEntitlementPlan", ["STARTER", "PRO", "GROWTH"]);
  });

  it("adds commercial state and membership provenance with unambiguous relations", () => {
    for (const modelName of ["TenantModule", "TenantSubmodule"]) {
      const model = prismaBlock("model", modelName);
      expectLines(model, [
        /^\s*commercialStatus\s+CommercialAccessStatus\s+@default\(ACTIVE\)\s*$/m,
        /^\s*trialEndsAt\s+DateTime\?\s*$/m,
        /^\s*@@index\(\[tenantId, commercialStatus\]\)\s*$/m,
      ]);
    }

    expectLines(prismaBlock("model", "TenantAiWorkspace"), [
      /^\s*entitlementPlan\s+LabsEntitlementPlan\s+@default\(STARTER\)\s*$/m,
    ]);

    const membership = prismaBlock("model", "Membership");
    expectLines(membership, [
      /^\s*createdByUserId\s+String\?\s*$/m,
      /^\s*user\s+User\s+@relation\("MembershipUser", fields: \[userId\], references: \[id\], onDelete: Cascade\)\s*$/m,
      /^\s*createdByUser\s+User\?\s+@relation\("MembershipCreatedBy", fields: \[createdByUserId\], references: \[id\], onDelete: SetNull\)\s*$/m,
      /^\s*@@index\(\[tenantId, createdByUserId\]\)\s*$/m,
    ]);

    expectLines(prismaBlock("model", "User"), [
      /^\s*memberships\s+Membership\[\]\s+@relation\("MembershipUser"\)\s*$/m,
      /^\s*createdMemberships\s+Membership\[\]\s+@relation\("MembershipCreatedBy"\)\s*$/m,
      /^\s*clientAccessConfig\s+Json\?\s*$/m,
    ]);
    expectLines(prismaBlock("model", "Tenant"), [
      /^\s*subscription\s+TenantSubscription\?\s*$/m,
    ]);
  });

  it("defines normalized feature grants and tenant invitations with inverse relations", () => {
    const feature = prismaBlock("model", "ModuleFeature");
    expectLines(feature, [
      /^\s*id\s+String\s+@id\s+@default\(cuid\(\)\)\s*$/m,
      /^\s*moduleId\s+String\s*$/m,
      /^\s*submoduleId\s+String\?\s*$/m,
      /^\s*scopeKey\s+String\s+@default\("__module__"\)\s*$/m,
      /^\s*key\s+String\s*$/m,
      /^\s*name\s+String\s*$/m,
      /^\s*description\s+String\?\s*$/m,
      /^\s*sortOrder\s+Int\s+@default\(0\)\s*$/m,
      /^\s*valueType\s+ModuleFeatureValueType\s+@default\(BOOLEAN\)\s*$/m,
      /^\s*trialDefault\s+Json\?\s*$/m,
      /^\s*activeDefault\s+Json\?\s*$/m,
      /^\s*minValue\s+Int\?\s*$/m,
      /^\s*maxValue\s+Int\?\s*$/m,
      /^\s*isActive\s+Boolean\s+@default\(true\)\s*$/m,
      /^\s*module\s+Module\s+@relation\(fields: \[moduleId\], references: \[id\], onDelete: Cascade\)\s*$/m,
      /^\s*submodule\s+ModuleSubmodule\?\s+@relation\(fields: \[submoduleId, moduleId\], references: \[id, moduleId\], onDelete: Cascade\)\s*$/m,
      /^\s*tenantGrants\s+TenantFeatureGrant\[\]\s*$/m,
      /^\s*@@unique\(\[moduleId, submoduleId, key\]\)\s*$/m,
      /^\s*@@unique\(\[moduleId, scopeKey, key\]\)\s*$/m,
      /^\s*@@index\(\[submoduleId, moduleId\]\)\s*$/m,
      /^\s*@@index\(\[moduleId, submoduleId, isActive, sortOrder\]\)\s*$/m,
    ]);
    expectTimestampFields(feature);

    const grant = prismaBlock("model", "TenantFeatureGrant");
    expectLines(grant, [
      /^\s*id\s+String\s+@id\s+@default\(cuid\(\)\)\s*$/m,
      /^\s*tenantId\s+String\s*$/m,
      /^\s*featureId\s+String\s*$/m,
      /^\s*enabled\s+Boolean\s+@default\(true\)\s*$/m,
      /^\s*value\s+Json\?\s*$/m,
      /^\s*tenant\s+Tenant\s+@relation\(fields: \[tenantId\], references: \[id\], onDelete: Cascade\)\s*$/m,
      /^\s*feature\s+ModuleFeature\s+@relation\(fields: \[featureId\], references: \[id\], onDelete: Cascade\)\s*$/m,
      /^\s*@@unique\(\[tenantId, featureId\]\)\s*$/m,
      /^\s*@@index\(\[tenantId, enabled\]\)\s*$/m,
    ]);
    expectTimestampFields(grant);

    const invitation = prismaBlock("model", "TenantInvitation");
    expectLines(invitation, [
      /^\s*id\s+String\s+@id\s+@default\(cuid\(\)\)\s*$/m,
      /^\s*tenantId\s+String\s*$/m,
      /^\s*invitedByUserId\s+String\s*$/m,
      /^\s*name\s+String\s*$/m,
      /^\s*email\s+String\s*$/m,
      /^\s*role\s+TenantInvitationRole\s*$/m,
      /^\s*moduleIds\s+Json\s*$/m,
      /^\s*tokenHash\s+String\s+@unique\s*$/m,
      /^\s*status\s+TenantInvitationStatus\s+@default\(PENDING\)\s*$/m,
      /^\s*expiresAt\s+DateTime\s*$/m,
      /^\s*acceptedAt\s+DateTime\?\s*$/m,
      /^\s*revokedAt\s+DateTime\?\s*$/m,
      /^\s*tenant\s+Tenant\s+@relation\(fields: \[tenantId\], references: \[id\], onDelete: Cascade\)\s*$/m,
      /^\s*invitedBy\s+User\s+@relation\(fields: \[invitedByUserId\], references: \[id\], onDelete: Cascade\)\s*$/m,
      /^\s*@@index\(\[tenantId, status, createdAt\]\)\s*$/m,
      /^\s*@@index\(\[email, status\]\)\s*$/m,
      /^\s*@@index\(\[expiresAt, status\]\)\s*$/m,
    ]);
    expectTimestampFields(invitation);

    expectLines(prismaBlock("model", "Tenant"), [
      /^\s*featureGrants\s+TenantFeatureGrant\[\]\s*$/m,
      /^\s*invitations\s+TenantInvitation\[\]\s*$/m,
    ]);
    expectLines(prismaBlock("model", "Module"), [
      /^\s*features\s+ModuleFeature\[\]\s*$/m,
    ]);
    expectLines(prismaBlock("model", "ModuleSubmodule"), [
      /^\s*features\s+ModuleFeature\[\]\s*$/m,
      /^\s*@@unique\(\[id, moduleId\]\)\s*$/m,
    ]);
    expectLines(prismaBlock("model", "User"), [
      /^\s*tenantInvitations\s+TenantInvitation\[\]\s*$/m,
    ]);
  });

  it("keeps the MySQL migration additive and aligned with the Prisma contract", () => {
    expectLines(sqlAlter("TenantModule"), [
      /ADD COLUMN `commercialStatus` ENUM\('TRIAL', 'ACTIVE', 'SUSPENDED'\) NOT NULL DEFAULT 'ACTIVE'/,
      /ADD COLUMN `trialEndsAt` DATETIME\(3\) NULL/,
      /ADD INDEX `TenantModule_tenantId_commercialStatus_idx`\(`tenantId`, `commercialStatus`\)/,
    ]);
    expectLines(sqlAlter("TenantSubmodule"), [
      /ADD COLUMN `commercialStatus` ENUM\('TRIAL', 'ACTIVE', 'SUSPENDED'\) NOT NULL DEFAULT 'ACTIVE'/,
      /ADD COLUMN `trialEndsAt` DATETIME\(3\) NULL/,
      /ADD INDEX `TenantSubmodule_tenantId_commercialStatus_idx`\(`tenantId`, `commercialStatus`\)/,
    ]);
    expectLines(sqlAlter("TenantAiWorkspace"), [
      /ADD COLUMN `entitlementPlan` ENUM\('STARTER', 'PRO', 'GROWTH'\) NOT NULL DEFAULT 'STARTER'/,
    ]);
    expectLines(sqlAlter("Membership"), [
      /ADD COLUMN `createdByUserId` VARCHAR\(191\) NULL/,
      /ADD INDEX `Membership_tenantId_createdByUserId_idx`\(`tenantId`, `createdByUserId`\)/,
    ]);
    expectLines(sqlAlter("ModuleSubmodule"), [
      /ADD UNIQUE INDEX `ModuleSubmodule_id_moduleId_key`\(`id`, `moduleId`\)/,
    ]);

    const featureTable = sqlTable("ModuleFeature");
    expectLines(featureTable, [
      /`id` VARCHAR\(191\) NOT NULL/,
      /`moduleId` VARCHAR\(191\) NOT NULL/,
      /`submoduleId` VARCHAR\(191\) NULL/,
      /`scopeKey` VARCHAR\(191\) NOT NULL DEFAULT '__module__'/,
      /`key` VARCHAR\(191\) NOT NULL/,
      /`sortOrder` INTEGER NOT NULL DEFAULT 0/,
      /`valueType` ENUM\('BOOLEAN', 'INTEGER', 'TEXT'\) NOT NULL DEFAULT 'BOOLEAN'/,
      /`trialDefault` JSON NULL/,
      /`activeDefault` JSON NULL/,
      /`minValue` INTEGER NULL/,
      /`maxValue` INTEGER NULL/,
      /`isActive` BOOLEAN NOT NULL DEFAULT true/,
      /UNIQUE INDEX `ModuleFeature_moduleId_submoduleId_key_key`\(`moduleId`, `submoduleId`, `key`\)/,
      /UNIQUE INDEX `ModuleFeature_moduleId_scopeKey_key_key`\(`moduleId`, `scopeKey`, `key`\)/,
      /INDEX `ModuleFeature_moduleId_submoduleId_isActive_sortOrder_idx`\(`moduleId`, `submoduleId`, `isActive`, `sortOrder`\)/,
      /INDEX `ModuleFeature_submoduleId_moduleId_idx`\(`submoduleId`, `moduleId`\)/,
      /CONSTRAINT `ModuleFeature_scopeKey_matches_submodule_chk` CHECK \(\(`submoduleId` IS NULL AND `scopeKey` = '__module__'\) OR \(`submoduleId` IS NOT NULL AND `scopeKey` = `submoduleId`\)\)/,
    ]);

    const grantTable = sqlTable("TenantFeatureGrant");
    expectLines(grantTable, [
      /`tenantId` VARCHAR\(191\) NOT NULL/,
      /`featureId` VARCHAR\(191\) NOT NULL/,
      /`enabled` BOOLEAN NOT NULL DEFAULT true/,
      /`value` JSON NULL/,
      /UNIQUE INDEX `TenantFeatureGrant_tenantId_featureId_key`\(`tenantId`, `featureId`\)/,
      /INDEX `TenantFeatureGrant_tenantId_enabled_idx`\(`tenantId`, `enabled`\)/,
    ]);

    const invitationTable = sqlTable("TenantInvitation");
    expectLines(invitationTable, [
      /`tenantId` VARCHAR\(191\) NOT NULL/,
      /`invitedByUserId` VARCHAR\(191\) NOT NULL/,
      /`name` VARCHAR\(191\) NOT NULL/,
      /`email` VARCHAR\(191\) NOT NULL/,
      /`role` ENUM\('MANAGER', 'MEMBER'\) NOT NULL/,
      /`moduleIds` JSON NOT NULL/,
      /`tokenHash` VARCHAR\(191\) NOT NULL/,
      /`status` ENUM\('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'\) NOT NULL DEFAULT 'PENDING'/,
      /UNIQUE INDEX `TenantInvitation_tokenHash_key`\(`tokenHash`\)/,
      /INDEX `TenantInvitation_tenantId_status_createdAt_idx`\(`tenantId`, `status`, `createdAt`\)/,
      /INDEX `TenantInvitation_email_status_idx`\(`email`, `status`\)/,
      /INDEX `TenantInvitation_expiresAt_status_idx`\(`expiresAt`, `status`\)/,
    ]);

    expect(migration).not.toMatch(
      /\b(?:DROP\s+(?:TABLE|COLUMN|INDEX|DATABASE)|TRUNCATE(?:\s+TABLE)?|DELETE\s+FROM|ALTER\s+TABLE\s+[^;]*\b(?:DROP|MODIFY|CHANGE|RENAME)\b)/i,
    );
    expectForeignKey("Membership", "createdByUserId", "User", "SET NULL");
    expectForeignKey("ModuleFeature", "moduleId", "Module", "CASCADE");
    expectCompositeForeignKey(
      "ModuleFeature",
      ["submoduleId", "moduleId"],
      "ModuleSubmodule",
      ["id", "moduleId"],
    );
    expectForeignKey("TenantFeatureGrant", "tenantId", "Tenant", "CASCADE");
    expectForeignKey("TenantFeatureGrant", "featureId", "ModuleFeature", "CASCADE");
    expectForeignKey("TenantInvitation", "tenantId", "Tenant", "CASCADE");
    expectForeignKey("TenantInvitation", "invitedByUserId", "User", "CASCADE");
  });
});
