import { forbidden } from "next/navigation";
import { WorkspaceContacts } from "@/components/workspace/contacts";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { listSupportContacts } from "@/server/queries/workspace";

export const dynamic = "force-dynamic";

/** Contactos de WhatsApp de Vase y con qué cuenta está vinculado cada número. */
export default async function WorkspaceContactsPage() {
  const ctx = await getWorkspaceContext();
  if (ctx.role === "DEVELOPER") forbidden();
  const { contacts, tenants } = await listSupportContacts();
  const unlinked = contacts.filter((contact) => !contact.tenantId).length;

  return (
    <WorkspaceShell
      base={ctx.base}
      active="contactos"
      title="Contactos de WhatsApp"
      subtitle={`${contacts.length} ${contacts.length === 1 ? "número" : "números"}${unlinked ? ` · ${unlinked} sin vincular` : ""}`}
      userName={ctx.userName}
      adminUrl={ctx.adminUrl}
    >
      <WorkspaceContacts contacts={contacts} tenants={tenants} base={ctx.base} />
    </WorkspaceShell>
  );
}
