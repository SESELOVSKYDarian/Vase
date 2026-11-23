import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AccountEmailForm, ConfirmAccountEmail } from "@/components/admin/account-email-form";
import { requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { readEmailChangeToken } from "@/lib/auth/email-change-token";
import { prisma } from "@/lib/db/prisma";

const ADMIN_EMAIL = "administracion@vase.ar";

/** Admin › Ajustes › Tu cuenta: con qué correo entra el admin. */
export default async function AdminAccountPage({ searchParams }: { searchParams: Promise<{ confirm?: string }> }) {
  let session;
  try {
    session = await requireVerifiedPlatformRole("SUPER_ADMIN");
  } catch {
    forbidden();
  }

  const { confirm } = await searchParams;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, lastLoginAt: true, passwordChangedAt: true },
  });
  const claims = confirm ? readEmailChangeToken(confirm) : null;
  const pending = claims && claims.userId === session.user.id && claims.email !== user?.email ? claims : null;
  const date = (value: Date | null | undefined) =>
    value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short" }).format(value) : "—";

  return (
    <AppShell title="Tu cuenta" subtitle="Con qué correo entrás al Admin" tenantLabel="Admin">
      <div className="vpa-stack">
        {confirm && !pending ? (
          <div className="vpa-notice" role="status">
            {user?.email === claims?.email ? "Este cambio ya está hecho." : "El enlace venció o es de otra cuenta. Pedí el cambio de nuevo."}
          </div>
        ) : null}
        {pending && confirm ? <ConfirmAccountEmail token={confirm} email={pending.email} /> : null}

        <section className="vpa-card">
          <div className="vpa-facts">
            <div>
              <div className="vpa-lab">Correo de ingreso</div>
              <b>{user?.email ?? "—"}</b>
            </div>
            <div>
              <div className="vpa-lab">Nombre</div>
              <b>{user?.name ?? "—"}</b>
            </div>
            <div>
              <div className="vpa-lab">Último ingreso</div>
              <b>{date(user?.lastLoginAt)}</b>
            </div>
          </div>
        </section>

        <AccountEmailForm suggested={user?.email === ADMIN_EMAIL ? "" : ADMIN_EMAIL} />
      </div>
    </AppShell>
  );
}
