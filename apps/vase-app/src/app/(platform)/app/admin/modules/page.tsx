import type { Route } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminModulesConsole } from "@/components/admin/admin-modules-console";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { getAdminModulesCatalog } from "@/server/queries/modules-admin";

export default async function AdminModulesPage() {
  try {
    await requireAdminPermission(adminPermissions.MODULES);
  } catch {
    forbidden();
  }

  const modules = await getAdminModulesCatalog();

  return (
    <AppShell
      title="Módulos y Publicación"
      subtitle="Catálogo, editor, submódulos, ZIP y activación por tenant en un solo flujo."
      tenantLabel="Admin Master"
    >
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Consola Modular</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Gestión visual de módulos</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              V1 segura: sube ZIP, publícalo y activa por tenant sin ejecutar código dinámico.
            </p>
          </div>
          <Link href={"/" as Route} className="inline-flex min-h-10 items-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]">
            Volver al inicio admin
          </Link>
        </div>
      </section>

      <AdminModulesConsole modules={modules} />
    </AppShell>
  );
}

