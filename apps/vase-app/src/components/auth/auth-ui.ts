// Estilos compartidos de las pantallas de acceso (entrar, crear cuenta, recuperar contraseña).
// Un solo verde de marca (#3B633D), bordes suaves y campos grandes para tocar cómodo en el celular.

export const authLabel = "block text-sm font-medium text-[#2b322e]";

export const authInput =
  "min-h-12 w-full rounded-xl border border-[#d9e1db] bg-white px-4 text-[15px] text-[#191c1b] shadow-[0_1px_2px_rgba(25,28,27,0.04)] outline-none transition placeholder:text-[#9aa7a0] hover:border-[#c3cec6] focus:border-[#3B633D] focus:ring-4 focus:ring-[#3B633D]/12";

export const authTextarea =
  "min-h-36 w-full rounded-xl border border-[#d9e1db] bg-white px-4 py-3 text-[15px] leading-7 text-[#191c1b] shadow-[0_1px_2px_rgba(25,28,27,0.04)] outline-none transition placeholder:text-[#9aa7a0] hover:border-[#c3cec6] focus:border-[#3B633D] focus:ring-4 focus:ring-[#3B633D]/12";

export const authPrimaryButton =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3B633D] px-5 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(25,28,27,0.08),0_10px_24px_-10px_rgba(59,99,61,0.6)] transition hover:bg-[#335636] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3B633D]/25 disabled:cursor-not-allowed disabled:opacity-60";

export const authSecondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d9e1db] bg-white px-4 text-sm font-semibold text-[#191c1b] transition hover:border-[#c3cec6] hover:bg-[#f7f9f7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3B633D]/15 disabled:cursor-not-allowed disabled:opacity-60";

export const authLink = "font-semibold text-[#3B633D] underline-offset-4 hover:underline";

export const authPanel = "rounded-2xl border border-[#e3e9e5] bg-[#f7f9f7] p-4 sm:p-5";

export const authHint = "text-sm leading-6 text-[#66736b]";

/** Tarjeta que se elige (producto, canal, plan). */
export function authChoice(active: boolean) {
  return [
    "w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3B633D]/15",
    active
      ? "border-[#3B633D] bg-[#3B633D]/[0.06] shadow-[inset_0_0_0_1px_#3B633D]"
      : "border-[#dfe6e1] bg-white hover:border-[#c3cec6] hover:bg-[#fbfcfb]",
  ].join(" ");
}
