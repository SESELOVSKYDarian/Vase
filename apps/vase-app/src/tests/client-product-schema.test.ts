import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(
  new URL(
    "../../prisma/migrations/20260804090000_client_product_access_and_team/migration.sql",
    import.meta.url,
  ),
  "utf8",
);
const migrationRoot = new URL("../../prisma/migrations/", import.meta.url);
const currentMigration = "20260804090000_client_product_access_and_team";
const modulePermissionMigration = readFileSync(
  new URL("../../prisma/migrations/20260804100000_admin_module_permission/migration.sql", import.meta.url),
  "utf8",
);
const primaryOwnerMigrationUrl = new URL(
  "../../prisma/migrations/20260804110000_tenant_primary_owner/migration.sql",
  import.meta.url,
);
const primaryOwnerMigration = existsSync(primaryOwnerMigrationUrl)
  ? readFileSync(primaryOwnerMigrationUrl, "utf8")
  : "";
const labsPlanBackfillMigrationUrl = new URL(
  "../../prisma/migrations/20260804120000_labs_entitlement_plan_backfill/migration.sql",
  import.meta.url,
);
const labsPlanBackfillMigration = existsSync(labsPlanBackfillMigrationUrl)
  ? readFileSync(labsPlanBackfillMigrationUrl, "utf8")
  : "";
const labsCatalogBackfillMigrationUrl = new URL(
  "../../prisma/migrations/20260906160000_labs_catalog_backfill/migration.sql",
  import.meta.url,
);
const labsCatalogBackfillMigration = existsSync(labsCatalogBackfillMigrationUrl)
  ? readFileSync(labsCatalogBackfillMigrationUrl, "utf8")
  : "";
const laterMigrationSql = readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name > currentMigration)
  .map((entry) => ({
    name: entry.name,
    sql: readFileSync(new URL(entry.name + "/migration.sql", migrationRoot), "utf8"),
  }));

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

function expectCustomObjectsPreservedInLaterMigrations() {
  const customObjects = [
    "uq_ModuleFeature_scope_key",
    "uq_ModuleSubmodule_id_moduleId",
    "fk_ModuleFeature_submodule_module",
  ];

  for (const { name, sql } of laterMigrationSql) {
    for (const objectName of customObjects) {
      const escapedName = objectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const mutation = new RegExp(
        "\\b(?:DROP\\s+(?:INDEX|CONSTRAINT|FOREIGN\\s+KEY)|RENAME\\s+(?:INDEX|CONSTRAINT))\\s+(?:IF\\s+EXISTS\\s+)?`?" +
          escapedName +
          "`?\\b|\\b" +
          escapedName +
          "\\b\\s+RENAME\\s+TO\\b",
        "i",
      );

      expect(sql, `${name} must preserve ${objectName}`).not.toMatch(mutation);
    }
  }
}

describe("client product access schema", () => {
  it("defines every commercial access enum with its supported values", () => {
    expectEnumValues("CommercialAccessStatus", ["TRIAL", "ACTIVE", "SUSPENDED"]);
    expectEnumValues("ModuleFeatureValueType", ["BOOLEAN", "INTEGER", "TEXT"]);
    expectEnumValues("TenantInvitationStatus", ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]);
    expect(schema).not.toContain("enum TenantInvitationRole");
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
      /^\s*primaryOwnerUserId\s+String\?\s+@unique\s*$/m,
      /^\s*primaryOwner\s+User\?\s+@relation\("TenantPrimaryOwner", fields: \[primaryOwnerUserId\], references: \[id\], onDelete: SetNull\)\s*$/m,
    ]);
    expectLines(prismaBlock("model", "User"), [
      /^\s*primaryOwnedTenant\s+Tenant\?\s+@relation\("TenantPrimaryOwner"\)\s*$/m,
    ]);
  });

  it("adds the primary owner invariant in a forward-only migration with conservative backfill", () => {
    expect(primaryOwnerMigration).toMatch(/ALTER TABLE `Tenant`\s+ADD COLUMN `primaryOwnerUserId` VARCHAR\(191\) NULL;/);
    expect(primaryOwnerMigration).toMatch(/HAVING COUNT\(\*\) = 1/);
    expect(primaryOwnerMigration).toMatch(/CREATE UNIQUE INDEX `Tenant_primaryOwnerUserId_key` ON `Tenant`\(`primaryOwnerUserId`\);/);
    expect(primaryOwnerMigration).toMatch(/FOREIGN KEY \(`primaryOwnerUserId`\) REFERENCES `User`\(`id`\) ON DELETE SET NULL ON UPDATE CASCADE/);
    expect(primaryOwnerMigration).not.toMatch(/\b(?:DROP\s+(?:TABLE|COLUMN|INDEX)|TRUNCATE(?:\s+TABLE)?|DELETE\s+FROM)\b/i);
  });

  it("backfills legacy Labs plans in a later forward migration without editing the column migration", () => {
    expect(labsPlanBackfillMigration).toContain("Deployment assumption:");
    expect(labsPlanBackfillMigration).toMatch(/UPDATE `TenantAiWorkspace`/);
    expect(labsPlanBackfillMigration).toMatch(/JOIN `ModuleSubmodule`/);
    expect(labsPlanBackfillMigration).toMatch(/`moduleId` = 'vase_labs'/);
    expect(labsPlanBackfillMigration).toMatch(/`submoduleId`/);
    expect(labsPlanBackfillMigration).toMatch(/`isActive` = TRUE/);
    expect(labsPlanBackfillMigration).toMatch(/`commercialStatus` IN \('ACTIVE', 'TRIAL'\)/);
    expect(labsPlanBackfillMigration).toMatch(/LOWER\([^)]*`key`[^)]*\)/);
    expect(labsPlanBackfillMigration).toMatch(/WHEN 'growth' THEN 3/);
    expect(labsPlanBackfillMigration).toMatch(/WHEN 'pro' THEN 2/);
    expect(labsPlanBackfillMigration).toMatch(/WHEN 'starter' THEN 1/);
    expect(labsPlanBackfillMigration).toMatch(/MAX\s*\(/);
    expect(labsPlanBackfillMigration).toMatch(/WHEN 3 THEN 'GROWTH'/);
    expect(labsPlanBackfillMigration).toMatch(/WHEN 2 THEN 'PRO'/);
    expect(labsPlanBackfillMigration).toMatch(/WHEN 1 THEN 'STARTER'/);
    expect(labsPlanBackfillMigration).toMatch(/WHEN 'PREMIUM' THEN 'GROWTH'/);
    expect(labsPlanBackfillMigration).toMatch(/WHEN 'START' THEN 'STARTER'/);
    expect(labsPlanBackfillMigration).toMatch(/WHERE `workspace`\.`entitlementPlan` = 'STARTER'/);
    expect(labsPlanBackfillMigration).not.toMatch(/\b(?:ALTER|DROP|DELETE|TRUNCATE|RENAME)\b/i);
    expect(migration).not.toMatch(/UPDATE `TenantAiWorkspace`/);
    expect("20260804120000_labs_entitlement_plan_backfill" > currentMigration).toBe(true);
  });

  it("seeds the Labs catalog in an idempotent forward migration", () => {
    expect(labsCatalogBackfillMigration).toContain("vase_labs");
    expect(labsCatalogBackfillMigration).toMatch(/starter/);
    expect(labsCatalogBackfillMigration).toMatch(/pro/);
    expect(labsCatalogBackfillMigration).toMatch(/growth/);
    expect(labsCatalogBackfillMigration).toMatch(/ON DUPLICATE KEY UPDATE/);
    expect(labsCatalogBackfillMigration).toMatch(/`?isActive`?\s*=\s*TRUE/);
    expect(labsCatalogBackfillMigration).not.toMatch(/\b(?:DROP|DELETE|TRUNCATE|RENAME)\b/i);
    expect("20260906160000_labs_catalog_backfill" > "20260804120000_labs_entitlement_plan_backfill").toBe(true);
  });

  it.each([
    { name: "pro-only", keys: ["pro"], legacy: "PREMIUM", expected: "PRO" },
    { name: "growth wins over pro", keys: ["pro", "growth"], legacy: "PREMIUM", expected: "GROWTH" },
    { name: "starter", keys: ["starter"], legacy: "PREMIUM", expected: "STARTER" },
    { name: "no selection premium fallback", keys: [], legacy: "PREMIUM", expected: "GROWTH" },
    { name: "no selection start fallback", keys: [], legacy: "START", expected: "STARTER" },
  ])("documents deterministic Labs backfill fixture: $name", ({ keys, legacy, expected }) => {
    const rank = Math.max(0, ...keys.map((key) => ({ starter: 1, pro: 2, growth: 3 })[key as "starter" | "pro" | "growth"]));
    const resolved = rank === 3 ? "GROWTH" : rank === 2 ? "PRO" : rank === 1 ? "STARTER"
      : legacy === "PREMIUM" ? "GROWTH" : "STARTER";
    expect(resolved).toBe(expected);
  });

  it("defines normalized feature grants and tenant invitations with inverse relations", () => {
    const feature = prismaBlock("model", "ModuleFeature");
    expect(feature).not.toMatch(/\bscopeKey\b/);
    expect(schema).toContain("/// Prisma cannot express these while this public relation remains direct; every future migration must preserve them.");
    expectLines(feature, [
      /^\s*id\s+String\s+@id\s+@default\(cuid\(\)\)\s*$/m,
      /^\s*moduleId\s+String\s*$/m,
      /^\s*submoduleId\s+String\?\s*$/m,
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
      /^\s*submodule\s+ModuleSubmodule\?\s+@relation\(fields: \[submoduleId\], references: \[id\], onDelete: Cascade\)\s*$/m,
      /^\s*tenantGrants\s+TenantFeatureGrant\[\]\s*$/m,
      /^\s*@@unique\(\[moduleId, submoduleId, key\]\)\s*$/m,
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
      /^\s*role\s+TenantRole\s*$/m,
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
    const submodule = prismaBlock("model", "ModuleSubmodule");
    expectLines(submodule, [
      /^\s*features\s+ModuleFeature\[\]\s*$/m,
    ]);
    expect(submodule).not.toMatch(/@@unique\(\[id, moduleId\]\)/);
    expect(schema).toContain("/// Every future migration must preserve this custom constraint.");
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
    expect(migration).not.toContain("canManageModules");
    expect(modulePermissionMigration).toMatch(
      /ALTER TABLE `AdminAccessPolicy`\s+ADD COLUMN `canManageModules` BOOLEAN NOT NULL DEFAULT false;/,
    );
    expect(modulePermissionMigration).not.toMatch(/\b(?:DROP|DELETE|TRUNCATE|MODIFY|CHANGE|RENAME)\b/i);
    expectLines(sqlAlter("ModuleSubmodule"), [
      /ADD UNIQUE INDEX `uq_ModuleSubmodule_id_moduleId`\(`id`, `moduleId`\)/,
    ]);

    const featureTable = sqlTable("ModuleFeature");
    expect(featureTable).not.toMatch(/`scopeKey`/);
    expectLines(featureTable, [
      /`id` VARCHAR\(191\) NOT NULL/,
      /`moduleId` VARCHAR\(191\) NOT NULL/,
      /`submoduleId` VARCHAR\(191\) NULL/,
      /`key` VARCHAR\(191\) NOT NULL/,
      /`sortOrder` INTEGER NOT NULL DEFAULT 0/,
      /`valueType` ENUM\('BOOLEAN', 'INTEGER', 'TEXT'\) NOT NULL DEFAULT 'BOOLEAN'/,
      /`trialDefault` JSON NULL/,
      /`activeDefault` JSON NULL/,
      /`minValue` INTEGER NULL/,
      /`maxValue` INTEGER NULL/,
      /`isActive` BOOLEAN NOT NULL DEFAULT true/,
      /UNIQUE INDEX `ModuleFeature_moduleId_submoduleId_key_key`\(`moduleId`, `submoduleId`, `key`\)/,
      /UNIQUE INDEX `uq_ModuleFeature_scope_key`\(`moduleId`, \(IF\(`submoduleId` IS NULL, 'M:', CONCAT\('S:', `submoduleId`\)\)\), `key`\)/,
      /INDEX `ModuleFeature_moduleId_submoduleId_isActive_sortOrder_idx`\(`moduleId`, `submoduleId`, `isActive`, `sortOrder`\)/,
      /INDEX `ModuleFeature_submoduleId_moduleId_idx`\(`submoduleId`, `moduleId`\)/,
    ]);
    expectLines(prismaBlock("model", "AdminAccessPolicy"), [
      /^\s*canManageModules\s+Boolean\s+@default\(false\)\s*$/m,
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
      /`role` ENUM\('OWNER', 'MANAGER', 'MEMBER'\) NOT NULL/,
      /CONSTRAINT `TenantInvitation_role_is_invitable_chk` CHECK \(`role` IN \('MANAGER', 'MEMBER'\)\)/,
      /`moduleIds` JSON NOT NULL/,
      /`tokenHash` VARCHAR\(191\) NOT NULL/,
      /`status` ENUM\('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'\) NOT NULL DEFAULT 'PENDING'/,
      /UNIQUE INDEX `TenantInvitation_tokenHash_key`\(`tokenHash`\)/,
      /INDEX `TenantInvitation_tenantId_status_createdAt_idx`\(`tenantId`, `status`, `createdAt`\)/,
      /INDEX `TenantInvitation_email_status_idx`\(`email`, `status`\)/,
      /INDEX `TenantInvitation_expiresAt_status_idx`\(`expiresAt`, `status`\)/,
    ]);

    expect(migration).toContain("-- IMPORTANT: Requires MySQL >= 8.0.16 for functional indexes and enforced CHECK constraints.");
    expect(migration).toContain("uq_ModuleFeature_scope_key, uq_ModuleSubmodule_id_moduleId, and fk_ModuleFeature_submodule_module");

    expect(migration).not.toMatch(
      /\b(?:DROP\s+(?:TABLE|COLUMN|INDEX|DATABASE)|TRUNCATE(?:\s+TABLE)?|DELETE\s+FROM|ALTER\s+TABLE\s+[^;]*\b(?:DROP|MODIFY|CHANGE|RENAME)\b)/i,
    );
    expectForeignKey("Membership", "createdByUserId", "User", "SET NULL");
    expectForeignKey("ModuleFeature", "moduleId", "Module", "CASCADE");
    expectForeignKey("ModuleFeature", "submoduleId", "ModuleSubmodule", "CASCADE");
    expectCompositeForeignKey(
      "ModuleFeature",
      ["submoduleId", "moduleId"],
      "ModuleSubmodule",
      ["id", "moduleId"],
    );
    expect(migration).toMatch(/ADD CONSTRAINT `fk_ModuleFeature_submodule_module`/);
    expectForeignKey("TenantFeatureGrant", "tenantId", "Tenant", "CASCADE");
    expectForeignKey("TenantFeatureGrant", "featureId", "ModuleFeature", "CASCADE");
    expectForeignKey("TenantInvitation", "tenantId", "Tenant", "CASCADE");
    expectForeignKey("TenantInvitation", "invitedByUserId", "User", "CASCADE");
    expectCustomObjectsPreservedInLaterMigrations();
  });
});
