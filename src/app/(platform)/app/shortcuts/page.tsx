import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";
import { prisma } from "@/lib/db/prisma";
import { ShortcutsManager } from "./shortcuts-manager";
import { redirect } from "next/navigation";

export default async function ShortcutsPage() {
  const session = await requireUser();
  const membership = await getTenantMembership(session.user.id);
  
  if (!membership) {
    redirect("/signin");
  }

  const user = (await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { shortcuts: true }
  })) as any;

  return (
    <AppShell
      title="Mis Comandos"
      subtitle="Personaliza tus atajos de teclado para navegar y trabajar más rápido en Vase."
      tenantLabel={membership.tenant.name}
    >
      <div className="max-w-4xl">
        <ShortcutsManager initialShortcuts={user?.shortcuts} />
      </div>
    </AppShell>
  );
}
