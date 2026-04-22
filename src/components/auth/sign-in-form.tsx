"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { signInAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FieldError } from "@/components/auth/field-error";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function SignInForm({
  resetSuccess = false,
  redirectTo = "/app",
}: {
  resetSuccess?: boolean;
  redirectTo?: string;
}) {
  const [state, formAction] = useActionState(signInAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <AuthNotice
        kind="success"
        message={resetSuccess ? "Contrasena actualizada. Ya podes iniciar sesion." : undefined}
      />
      <AuthNotice kind="error" message={state.error} />

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className="space-y-1.5">
          <label className="ml-1 text-xs uppercase tracking-[0.18em] text-[#6c7b70]" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@example.com"
            className="min-h-14 w-full rounded-xl border-none bg-[#f2f4f2] px-5 text-[#191c1b] outline-none transition-all placeholder:text-[#bbcabe] focus:ring-2 focus:ring-[#18c37e]/30"
          />
          <FieldError message={state.fieldErrors?.email?.[0]} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <label className="ml-1 text-xs uppercase tracking-[0.18em] text-[#6c7b70]" htmlFor="password">
              Contraseña
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-[#006d43] transition hover:text-[#004a2c]"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              minLength={8}
              placeholder="********"
              className="min-h-14 w-full rounded-xl border-none bg-[#f2f4f2] px-5 pr-14 text-[#191c1b] outline-none transition-all placeholder:text-[#bbcabe] focus:ring-2 focus:ring-[#18c37e]/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              className="absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-[#006d43] transition hover:bg-[#dfeee3] hover:text-[#004a2c]"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <FieldError message={state.fieldErrors?.password?.[0]} />
        </div>

        <div className="rounded-2xl border border-[#d9e6dc] bg-[#f7fbf8] p-4">
          <label className="flex cursor-pointer items-start gap-3" htmlFor="rememberSession">
            <input
              id="rememberSession"
              name="rememberSession"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-[#bbcabe] text-[#006d43] focus:ring-[#18c37e]/30"
            />
            <span className="space-y-1">
              <span className="block text-sm font-semibold text-[#191c1b]">
                Mantener sesión iniciada
              </span>
              <span className="block text-xs leading-6 text-[#5a6a5f]">
                Si lo activas, te volveremos a pedir la contraseña dentro de 7 días. Si no,
                tu sesión vencerá en 1 día.
              </span>
            </span>
          </label>
        </div>

        <SubmitButton
          pendingLabel="Ingresando..."
          className="mt-4 min-h-14 w-full rounded-full bg-[linear-gradient(135deg,#006d43_0%,#18c37e_100%)] px-8 text-sm font-bold tracking-[0.08em] text-white shadow-[0_18px_36px_rgba(24,195,126,0.2)] transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          Iniciar sesión
        </SubmitButton>
      </form>

      <div className="mt-8">
        <AuthNotice
          kind="info"
          message="El acceso social todavia no esta habilitado en esta version. Por ahora el ingreso funciona con email y contrasena."
        />
      </div>
    </>
  );
}
