import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  new URL("../app/(platform)/app/admin/modules/page.tsx", import.meta.url),
  "utf8",
);
// Las acciones del admin están repartidas por tema en la carpeta actions/: se leen todas juntas.
const actionsDir = new URL("../app/(platform)/app/admin/actions/", import.meta.url);
const actionsSource = readdirSync(actionsDir)
  .map((file) => readFileSync(new URL(file, actionsDir), "utf8"))
  .join("\n");

describe("admin modules page authorization", () => {
  it("uses the dedicated MODULES permission instead of a SUPER_ADMIN-only guard", () => {
    expect(pageSource).toContain('requireAdminPermission(adminPermissions.MODULES)');
    expect(pageSource).not.toContain("requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN)");
  });

  it("applies that same permission to every module and submodule catalog mutation", () => {
    for (const actionName of [
      "createAdminModuleAction",
      "updateAdminModuleAction",
      "deleteAdminModuleAction",
      "createModuleSubmoduleAction",
      "updateModuleSubmoduleAction",
      "deleteModuleSubmoduleAction",
    ]) {
      expect(actionsSource).toMatch(new RegExp(
        `export async function ${actionName}[\\s\\S]{0,450}requireAdminPermission\\(adminPermissions\\.MODULES\\)`,
      ));
    }
  });
});
