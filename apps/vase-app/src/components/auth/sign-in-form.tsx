"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { signInAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { authInput, authLabel, authPrimaryButton } from "@/components/auth/auth-ui";
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
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <AuthNotice kind="success" message={resetSuccess ? "Listo, cambiaste tu contraseña. Ya podés entrar." : undefined} />
      <AuthNotice kind="error" message={state.error} />

      <div className="space-y-2">
        <label className={authLabel} htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="nombre@tunegocio.com"
          className={authInput}
        />
        <FieldError message={state.fieldErrors?.email?.[0]} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label className={authLabel} htmlFor="password">
            Contraseña
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-[#3B633D] underline-offset-4 hover:underline">
            ¿La olvidaste?
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
            className={`${authInput} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#66736b] transition hover:bg-[#f1f4f2] hover:text-[#191c1b]"
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
        <FieldError message={state.fieldErrors?.password?.[0]} />
      </div>

      <label className="flex cursor-pointer select-none items-center gap-3" htmlFor="rememberSession">
        <input
          id="rememberSession"
          name="rememberSession"
          type="checkbox"
          className="h-[18px] w-[18px] shrink-0 rounded border-[#c3cec6] accent-[#3B633D]"
        />
        <span className="text-sm text-[#2b322e]">
          Mantener la sesión abierta <span className="text-[#8a958e]">· 7 días</span>
        </span>
      </label>

      <SubmitButton pendingLabel="Entrando..." className={`${authPrimaryButton} mt-2`}>
        Entrar
      </SubmitButton>
    </form>
  );
}
