import type { ReactNode } from "react";
import { SectionHeading } from "@/components/marketing/section-heading";

export type LegalSection = {
  title: string;
  body: readonly string[];
  items?: readonly string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: readonly LegalSection[];
  footer?: ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
  footer,
}: LegalPageProps) {
  return (
    <>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
      />

      <section className="grid gap-6">
        <article className="rounded-[2rem] border border-[rgba(108,123,112,0.12)] bg-white/80 p-6 shadow-[0_24px_70px_rgba(47,48,48,0.04)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#739374]">
            Última actualización
          </p>
          <p className="mt-2 text-lg text-[#191c1b]">{updatedAt}</p>
        </article>

        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-[2rem] border border-[rgba(108,123,112,0.12)] bg-white/80 p-6 shadow-[0_24px_70px_rgba(47,48,48,0.04)] backdrop-blur-xl"
          >
            <h2 className="text-2xl tracking-[-0.04em] text-[#191c1b]">{section.title}</h2>
            <div className="mt-4 space-y-4 text-[0.98rem] leading-8 text-[#3c4a40]">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {section.items?.length ? (
              <ul className="mt-5 space-y-3 text-[0.96rem] leading-7 text-[#3c4a40]">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#18c37e]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>

      {footer ? <section>{footer}</section> : null}
    </>
  );
}
