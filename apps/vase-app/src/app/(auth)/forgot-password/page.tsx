import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(214,201,186,0.5),_transparent_35%),linear-gradient(180deg,#F8F5F0_0%,#EFE7DC_100%)] px-6 py-10">
      <div className="w-full max-w-md rounded-[36px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_90%,transparent)] p-8 shadow-[0_30px_100px_rgba(15,23,42,0.1)]">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.24em] text-[var(--muted-soft)] uppercase">
            Recuperacion
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Recuperar contrasena
          </h1>
          <p className="text-sm leading-7 text-[var(--muted)]">
            Te enviaremos un enlace temporal y seguro para restablecer el acceso.
          </p>
        </div>

        <div className="mt-8">
          <ForgotPasswordForm />
        </div>

        <div className="mt-6">
          <Link href="/signin" className="text-sm font-semibold text-[var(--accent)]">
            Volver a iniciar sesion
          </Link>
        </div>
      </div>
    </div>
  );
}
