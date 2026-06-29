import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  addWikiDiscussionAction,
  addWikiSectionAction,
  addWikiStepAction,
  updateWikiDocumentMetaAction,
} from "@/app/(platform)/app/admin/actions";
import { PanelCard } from "@/components/ui/panel-card";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminWikiPage() {
  try {
    await requireAdminPermission(adminPermissions.WIKI);
  } catch {
    forbidden();
  }

  const docs = await prisma.wikiDocument.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          steps: { orderBy: { sortOrder: "asc" } },
          discussions: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      },
      revisions: {
        orderBy: { createdAt: "desc" },
        include: {
          changedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        take: 6,
      },
    },
    take: 20,
  });

  async function handleUpdateWikiDocumentMeta(formData: FormData) {
    "use server";
    await updateWikiDocumentMetaAction({}, formData);
  }
  async function handleAddWikiSection(formData: FormData) {
    "use server";
    await addWikiSectionAction({}, formData);
  }
  async function handleAddWikiStep(formData: FormData) {
    "use server";
    await addWikiStepAction({}, formData);
  }
  async function handleAddWikiDiscussion(formData: FormData) {
    "use server";
    await addWikiDiscussionAction({}, formData);
  }

  return (
    <AppShell
      title="Wiki y documentación"
      subtitle="Edita documentación pública: metadatos, secciones, pasos y discusiones."
      tenantLabel="Master Admin"
    >
      <section className="grid gap-6">
        {docs.map((doc) => (
          <PanelCard
            key={doc.id}
            title={doc.title}
            description={`Slug: ${doc.slug} · Estado: ${doc.status}`}
          >
            <form action={handleUpdateWikiDocumentMeta} className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] p-4">
              <input type="hidden" name="documentId" value={doc.id} />
              <input name="title" defaultValue={doc.title} className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2" />
              <input name="slug" defaultValue={doc.slug} className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2" />
              <textarea name="summary" defaultValue={doc.summary ?? ""} className="min-h-16 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2" />
              <select name="status" defaultValue={doc.status} className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2">
                <option value="DRAFT">Borrador</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="ARCHIVED">Archivado</option>
              </select>
              <button className="w-fit rounded-xl bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)]">Guardar metadatos</button>
            </form>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <form action={handleAddWikiSection} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] p-4">
                <input type="hidden" name="documentId" value={doc.id} />
                <p className="text-sm font-semibold">Nueva sección</p>
                <input name="title" placeholder="Título de sección" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2" />
                <textarea name="body" placeholder="Contenido de sección" className="min-h-20 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2" />
                <button className="w-fit rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold">Agregar sección</button>
              </form>

              <div className="rounded-2xl border border-[var(--border-subtle)] p-4">
                <p className="text-sm text-[var(--muted)]">
                  Las discusiones se agregan por sección para mantener cada tutorial ordenado por tema.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {doc.sections.map((section) => (
                <div key={section.id} className="rounded-2xl border border-[var(--border-subtle)] p-4">
                  <p className="font-semibold">{section.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{section.body}</p>
                  <form action={handleAddWikiStep} className="mt-3 grid gap-2">
                    <input type="hidden" name="sectionId" value={section.id} />
                    <input name="title" placeholder="Título del paso" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2" />
                    <textarea name="content" placeholder="Detalle del paso" className="min-h-16 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2" />
                    <button className="w-fit rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold">Agregar paso</button>
                  </form>
                  <form action={handleAddWikiDiscussion} className="mt-3 grid gap-2">
                    <input type="hidden" name="sectionId" value={section.id} />
                    <textarea name="content" placeholder="Agregar discusión o aclaración de esta sección" className="min-h-16 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2" />
                    <button className="w-fit rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold">Agregar discusión</button>
                  </form>
                  {section.steps.length > 0 ? (
                    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
                      {section.steps.map((step) => (
                        <li key={step.id}>
                          <span className="font-medium text-[var(--foreground)]">{step.title}:</span> {step.content}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {section.discussions.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {section.discussions.map((discussion) => (
                        <p key={discussion.id} className="rounded-xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 py-2 text-xs text-[var(--muted)]">
                          <span className="font-semibold text-[var(--foreground)]">{discussion.authorName}:</span> {discussion.content}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Historial de revisiones</p>
              <div className="mt-3 grid gap-2">
                {doc.revisions.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">Sin revisiones todavía.</p>
                ) : (
                  doc.revisions.map((revision) => (
                    <div key={revision.id} className="rounded-xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 py-2 text-xs text-[var(--muted)]">
                      <span className="font-semibold text-[var(--foreground)]">{revision.summary}</span>{" "}
                      · {revision.changedByUser?.name ?? revision.changedByUser?.email ?? "Sistema"} ·{" "}
                      {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(revision.createdAt)}
                    </div>
                  ))
                )}
              </div>
            </div>
          </PanelCard>
        ))}
      </section>
    </AppShell>
  );
}
