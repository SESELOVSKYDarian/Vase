import type { Route } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsBody, loadSettingsContext } from "./settings-content";

const LABS_URL = (process.env.NEXT_PUBLIC_LABS_URL ?? "https://labs.vase.ar").replace(/\/+$/, "");

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  // Mi negocio tiene su sección en el menú y lo de Labs vive en Labs › Configuraciones: los links viejos llegan ahí.
  if (query.tab === "negocio") redirect("/app/negocio" as Route);
  if (query.tab === "labs") redirect(`${LABS_URL}/owner/configuraciones` as Route);

  const ctx = await loadSettingsContext(query.tab);
  const { membership, session, dashboard } = ctx;

  return (
    <AppShell
      title="Ajustes"
      subtitle="Tu perfil y la facturación"
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
