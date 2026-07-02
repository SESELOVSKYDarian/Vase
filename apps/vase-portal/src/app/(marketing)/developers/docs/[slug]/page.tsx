import { notFound } from "next/navigation";
import { portalAppClient } from "@/lib/app-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicDocDetailPage({ params }: Props) {
  const { slug } = await params;
  const doc = await portalAppClient.getDoc(slug);

  if (!doc) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="text-4xl font-semibold text-[var(--foreground)]">{doc.title}</h1>
      <p className="mt-2 text-[var(--muted)]">{doc.summary ?? "Guia oficial Vase."}</p>
      <div className="mt-8 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">{section.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{section.body}</p>
            {section.steps.length > 0 ? (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--foreground)]">
                {section.steps.map((step) => (
                  <li key={step.id}>
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-[var(--muted)]">{step.content}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}
