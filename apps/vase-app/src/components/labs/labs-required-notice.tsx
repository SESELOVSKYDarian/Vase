import Link from "next/link";

export function LabsRequiredNotice() {
  return (
    <section
      aria-live="polite"
      className="rounded-3xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-6"
    >
      <p className="vase-kicker">Vase Labs</p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
        Vase Labs no está activo
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
        Este espacio no tiene un plan de Labs habilitado. Revisa la
        facturación para activarlo antes de ingresar.
      </p>
      <Link
        href="/app/billing"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)]"
      >
        Ver planes y facturación
      </Link>
    </section>
  );
}
