"use client";

import { useActionState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  submitContactInquiry,
  type ContactActionState,
} from "@/app/(marketing)/contact-actions";

const initialState: ContactActionState = {};
const fieldClass =
  "h-13 w-full rounded-[1.15rem] border border-black/[0.07] bg-[#f7f9f7] px-4 text-[0.95rem] text-[#000202] outline-none transition placeholder:text-[#6b746f]/45 focus:border-[#3B633D]/35 focus:bg-white focus:ring-4 focus:ring-[#3B633D]/[0.08]";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs leading-5 text-[#9a493d]">{message}</p> : null;
}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactInquiry,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-[#18201c]">
          Nombre y apellido
          <input
            className={fieldClass}
            name="fullName"
            type="text"
            autoComplete="name"
            minLength={3}
            maxLength={80}
            placeholder="Tu nombre"
            required
          />
          <FieldError message={state.fieldErrors?.fullName?.[0]} />
        </label>

        <label className="space-y-2 text-sm font-semibold text-[#18201c]">
          Empresa
          <input
            className={fieldClass}
            name="company"
            type="text"
            autoComplete="organization"
            minLength={2}
            maxLength={120}
            placeholder="Nombre de tu empresa"
            required
          />
          <FieldError message={state.fieldErrors?.company?.[0]} />
        </label>

        <label className="space-y-2 text-sm font-semibold text-[#18201c]">
          Email
          <input
            className={fieldClass}
            name="email"
            type="email"
            autoComplete="email"
            minLength={6}
            maxLength={120}
            placeholder="nombre@empresa.com"
            required
          />
          <FieldError message={state.fieldErrors?.email?.[0]} />
        </label>

        <label className="space-y-2 text-sm font-semibold text-[#18201c]">
          Teléfono
          <input
            className={fieldClass}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            minLength={7}
            maxLength={30}
            placeholder="+54 9 223..."
            required
          />
          <FieldError message={state.fieldErrors?.phone?.[0]} />
        </label>
      </div>

      <label className="block space-y-2 text-sm font-semibold text-[#18201c]">
        ¿En qué podemos ayudarte?
        <textarea
          className={`${fieldClass} min-h-40 resize-y py-4 leading-7`}
          name="message"
          minLength={20}
          maxLength={1200}
          placeholder="Contanos sobre tu negocio, el problema que querés resolver o el producto de Vase que te interesa."
          required
        />
        <FieldError message={state.fieldErrors?.message?.[0]} />
      </label>

      <div aria-live="polite" className="min-h-6">
        {state.error ? <p className="text-sm text-[#9a493d]">{state.error}</p> : null}
        {state.success ? (
          <p className="flex items-center gap-2 text-sm font-medium text-[#2f633e]">
            <CheckCircle2 className="size-4" />
            {state.success}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 border-t border-black/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-xs leading-5 text-[#5f6d66]">
          Usamos estos datos únicamente para responder tu consulta.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex h-13 items-center justify-center rounded-full bg-[#173d2b] px-7 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(23,61,43,0.18)] transition hover:-translate-y-0.5 hover:bg-[#204d37] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Enviar consulta"}
          {!pending ? <ArrowRight className="ml-2 size-4 transition group-hover:translate-x-1" /> : null}
        </button>
      </div>
    </form>
  );
}
