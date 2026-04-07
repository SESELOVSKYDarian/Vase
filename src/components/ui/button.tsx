import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { clsx } from "clsx";

type ButtonTone = "primary" | "secondary" | "ghost" | "quiet";
type ButtonSize = "sm" | "md";

export function buttonStyles({
  tone = "primary",
  size = "md",
  className,
}: {
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string;
}) {
  return clsx(
    "inline-flex min-h-11 items-center justify-center rounded-full font-semibold cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]",
    size === "sm" ? "px-4 text-sm" : "px-5 text-sm",
    tone === "primary" &&
      "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[0_10px_24px_rgba(59,99,61,0.16)] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_14px_32px_rgba(59,99,61,0.24)] hover:bg-[color-mix(in_srgb,var(--accent)_92%,black_8%)] active:scale-[0.98]",
    tone === "secondary" &&
      "bg-[rgba(255,255,255,0.42)] text-[var(--foreground)] backdrop-blur-xl border border-white/20 hover:bg-[rgba(255,255,255,0.62)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shadow-sm",
    tone === "ghost" && "bg-transparent text-[var(--foreground)] hover:bg-[var(--accent-soft)] hover:scale-[1.02] active:scale-[0.98]",
    tone === "quiet" &&
      "bg-[color-mix(in_srgb,var(--surface)_84%,transparent)] text-[var(--foreground)] backdrop-blur-xl hover:bg-[color-mix(in_srgb,var(--accent-soft)_80%,var(--surface-strong))] hover:scale-[1.02] active:scale-[0.98]",
    className,
  );
}

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: ButtonTone;
    size?: ButtonSize;
  }
>;

export function Button({ tone, size, className, children, ...props }: ButtonProps) {
  return (
    <button className={buttonStyles({ tone, size, className })} {...props}>
      {children}
    </button>
  );
}
