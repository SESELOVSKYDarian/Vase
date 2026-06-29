"use client";

import { createPortal } from "react-dom";
import { useActionState, useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { submitContactInquiry, type ContactActionState } from "@/app/(marketing)/contact-actions";

const initialState: ContactActionState = {};

type FooterContactModalProps = {
  buttonLabel: string;
  title: string;
  description: string;
  labels: {
    fullName: string;
    email: string;
    message: string;
    close: string;
    submit: string;
  };
  emailPlaceholder?: string;
};

export function FooterContactModal({
  buttonLabel,
  title,
  description,
  labels,
  emailPlaceholder,
}: FooterContactModalProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [state, formAction, pending] = useActionState(submitContactInquiry, initialState);
  const emailInputId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  return (
    <>
      <div className="flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <div className="w-full sm:flex-1">
          <label htmlFor={emailInputId} className="sr-only">
            {labels.email}
          </label>
          <input
            id={emailInputId}
            type="email"
            value={emailDraft}
            onChange={(event) => setEmailDraft(event.target.value)}
            autoComplete="email"
            placeholder={emailPlaceholder ?? labels.email}
            className="h-11 w-full rounded-full bg-white/82 px-5 text-sm text-[#000202] outline-none ring-1 ring-black/8 transition placeholder:text-[#2F3030]/42 focus:ring-[#3B633D]"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#2F3030] px-6 text-sm font-semibold text-[#EFF3F4] transition hover:bg-[#1f2020] sm:w-auto"
        >
          {buttonLabel}
        </button>
      </div>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(47,48,48,0.22)] px-5 py-8 backdrop-blur-md">
              <div className="absolute inset-0" onClick={() => setOpen(false)} aria-hidden="true" />

              <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[2rem] bg-[rgba(255,255,255,0.8)] p-6 shadow-[0_30px_80px_rgba(47,48,48,0.14)] ring-1 ring-white/80 backdrop-blur-2xl sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#000202] sm:text-[2rem]">
                      {title}
                    </h3>
                    <p className="max-w-lg text-sm leading-6 text-[#2F3030]/72">{description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex size-10 items-center justify-center rounded-full bg-white/75 text-[#2F3030] transition hover:bg-white"
                    aria-label={labels.close}
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <form action={formAction} className="mt-7 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="footer-contact-fullName" className="text-sm font-medium text-[#000202]">
                        {labels.fullName}
                      </label>
                      <input
                        id="footer-contact-fullName"
                        name="fullName"
                        type="text"
                        required
                        minLength={3}
                        maxLength={80}
                        autoComplete="name"
                        className="h-12 w-full rounded-[1.1rem] bg-white/86 px-4 text-sm text-[#000202] outline-none ring-1 ring-black/8 transition placeholder:text-[#2F3030]/40 focus:ring-[#3B633D]"
                      />
                      {state.fieldErrors?.fullName?.[0] ? (
                        <p className="text-xs text-[#874b3c]">{state.fieldErrors.fullName[0]}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="footer-contact-email" className="text-sm font-medium text-[#000202]">
                        {labels.email}
                      </label>
                      <input
                        id="footer-contact-email"
                        name="email"
                        type="email"
                        defaultValue={emailDraft}
                        required
                        minLength={6}
                        maxLength={120}
                        autoComplete="email"
                        pattern=".+@.+\.com"
                        title="Ingresa un email valido que incluya @ y .com"
                        className="h-12 w-full rounded-[1.1rem] bg-white/86 px-4 text-sm text-[#000202] outline-none ring-1 ring-black/8 transition placeholder:text-[#2F3030]/40 focus:ring-[#3B633D]"
                      />
                      {state.fieldErrors?.email?.[0] ? (
                        <p className="text-xs text-[#874b3c]">{state.fieldErrors.email[0]}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="footer-contact-message" className="text-sm font-medium text-[#000202]">
                      {labels.message}
                    </label>
                    <textarea
                      id="footer-contact-message"
                      name="message"
                      required
                      minLength={20}
                      maxLength={1200}
                      rows={6}
                      className="w-full rounded-[1.3rem] bg-white/86 px-4 py-3 text-sm leading-6 text-[#000202] outline-none ring-1 ring-black/8 transition placeholder:text-[#2F3030]/40 focus:ring-[#3B633D]"
                    />
                    {state.fieldErrors?.message?.[0] ? (
                      <p className="text-xs text-[#874b3c]">{state.fieldErrors.message[0]}</p>
                    ) : null}
                  </div>

                  {state.error ? <p className="text-sm text-[#874b3c]">{state.error}</p> : null}
                  {state.success ? <p className="text-sm text-[#3B633D]">{state.success}</p> : null}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#2F3030] px-6 text-sm font-semibold text-[#EFF3F4] transition hover:bg-[#1f2020] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {pending ? "Enviando..." : labels.submit}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
