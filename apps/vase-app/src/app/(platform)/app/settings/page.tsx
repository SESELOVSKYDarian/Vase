import { AppShell } from "@/components/layout/app-shell";
import { SettingsBody, loadSettingsContext } from "./settings-content";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const ctx = await loadSettingsContext(query.tab);
  const { membership, session, dashboard } = ctx;

  return (
    <AppShell
      title="Ajustes"
      subtitle="Tu perfil, tu negocio y la facturación"
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      viewerRole={membership.role}
    >
      <SettingsBody ctx={ctx} tabHref={(tab) => `/app/settings?tab=${tab}`} />
    </AppShell>
  );
}
