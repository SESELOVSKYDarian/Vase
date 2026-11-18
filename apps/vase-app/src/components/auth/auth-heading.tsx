import type { ReactNode } from "react";

/** Título de cada pantalla de acceso. */
export function AuthHeading({ title, description, eyebrow }: { title: ReactNode; description?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-8">
      {eyebrow ? <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#3B633D]">{eyebrow}</p> : null}
      <h1 className="font-[family-name:var(--font-newsreader)] text-[2rem] font-medium leading-[1.1] tracking-[-0.03em] text-[#191c1b] sm:text-[2.5rem]">
        {title}
      </h1>
      {description ? <p className="mt-3 text-[15px] leading-7 text-[#5b6660]">{description}</p> : null}
    </header>
  );
}
