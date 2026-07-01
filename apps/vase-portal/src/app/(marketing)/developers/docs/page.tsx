import Link from "next/link";
import { portalAppClient } from "@/lib/app-client";

export const dynamic = "force-dynamic";

export default async function PublicDocsPage() {
  const docs = await portalAppClient.listDocs().catch(() => []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <h1 className="text-4xl font-semibold text-[var(--foreground)]">Documentacion Vase</h1>
      <p className="mt-2 text-[var(--muted)]">Tutoriales, guias paso a paso y referencias oficiales.</p>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {docs.map((doc) => (
          <article key={doc.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">{doc.title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{doc.summary}</p>
            <Link href={`/developers/docs/${doc.slug}`} className="mt-4 inline-flex text-sm font-semibold text-[var(--accent-strong)]">
              Ver documento
            </Link>
          </article>
        ))}
        {docs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Aun no hay documentos publicados.</p>
        ) : null}
      </section>
    </main>
  );
}
