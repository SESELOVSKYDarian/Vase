import Link from "next/link";
import type { Route } from "next";
import { auth } from "@/auth";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ExistingUserInviteForm, NewUserInviteForm } from "@/app/(auth)/invite/invite-forms";
import { prisma } from "@/lib/db/prisma";
import { TEAM_ROLE_LABEL } from "@/lib/team/team-access";
import { findValidInvitation } from "@/server/services/team-invitations";

type InvitePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token = "" } = await searchParams;
  const invitation = await findValidInvitation(token);

  let body;
  if (!invitation) {
    body = <p className="text-sm leading-7 text-[var(--muted)]">Esta invitación no es válida o ya venció. Pedile a quien te invitó que te mande otra.</p>;
  } else {
    const session = await auth();
    const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
    const invitedEmail = invitation.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });

    if (sessionEmail === invitedEmail) {
      body = <ExistingUserInviteForm token={token} />;
    } else if (sessionEmail) {
      body = <p className="text-sm leading-7 text-[var(--muted)]">Esta invitación es para otro correo. Cerrá sesión y volvé a abrir el enlace.</p>;
    } else if (existingUser) {
      body = (
        <Link
          href={`/signin?redirectTo=${encodeURIComponent(`/invite?token=${token}`)}` as Route}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
        >
          Iniciar sesión para aceptar
        </Link>
      );
    } else {
      body = <NewUserInviteForm token={token} />;
    }
  }

  return (
    <section className="w-full max-w-[26rem]">
      <AuthHeading
        title={invitation ? `Te invitaron a ${invitation.tenant.name}` : "Invitación"}
        description={
          invitation ? `Vas a entrar como ${TEAM_ROLE_LABEL[invitation.role]} con el correo ${invitation.email}.` : undefined
        }
      />
      {body}
    </section>
  );
}
