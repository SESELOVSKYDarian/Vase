import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  addWikiDiscussionAction,
  addWikiSectionAction,
  addWikiStepAction,
  updateWikiDocumentMetaAction,
} from "@/app/(platform)/app/admin/actions";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "Borrador", tone: "y" },
  PUBLISHED: { label: "Publicado", tone: "g" },
  ARCHIVED: { label: "Archivado", tone: "" },
};

const AREA = { height: "auto", padding: "10px 12px" } as const;

function when(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

/** Ayuda y wiki: cada guía es una fila que se abre para editarla. */
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
        include: { changedByUser: { select: { name: true, email: true } } },
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
    <AppShell title="Ayuda y wiki" subtitle="Las guías que leen los clientes" tenantLabel="Admin">
      {docs.length === 0 ? <div className="vpa-empty">Todavía no hay guías.</div> : null}
      <div className="vpa-stack">
        {docs.map((doc) => (
          <details key={doc.id} className="vpa-card" style={{ padding: 0 }}>
            <summary style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", cursor: "pointer", listStyle: "none" }}>
              <div className="vpa-g1">
                <b>{doc.title}</b>
                <span>
                  /{doc.slug} · {doc.sections.length} {doc.sections.length === 1 ? "parte" : "partes"} · cambiada el {when(doc.updatedAt)}
                </span>
              </div>
              <span className={`vpa-tag ${STATUS[doc.status]?.tone ?? ""}`}>
                <i />
                {STATUS[doc.status]?.label ?? doc.status}
              </span>
            </summary>

            <div className="vpa-stack" style={{ padding: "0 20px 20px" }}>
              <form action={handleUpdateWikiDocumentMeta} className="vpa-form">
                <input type="hidden" name="documentId" value={doc.id} />
                <label className="vpa-fld">
                  <span>Título</span>
                  <input className="vpa-inp" name="title" defaultValue={doc.title} />
                </label>
                <label className="vpa-fld">
                  <span>Dirección</span>
                  <input className="vpa-inp" name="slug" defaultValue={doc.slug} />
                </label>
                <label className="vpa-fld vpa-span2">
                  <span>Resumen</span>
                  <textarea className="vpa-inp" name="summary" defaultValue={doc.summary ?? ""} rows={2} style={AREA} />
                </label>
                <label className="vpa-fld">
                  <span>Estado</span>
                  <select className="vpa-inp" name="status" defaultValue={doc.status}>
                    <option value="DRAFT">Borrador</option>
                    <option value="PUBLISHED">Publicado</option>
                    <option value="ARCHIVED">Archivado</option>
                  </select>
                </label>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button className="vpa-btn acc">Guardar</button>
                </div>
              </form>

              {doc.sections.map((section) => (
                <div key={section.id} className="vpa-card stack" style={{ background: "var(--soft)", border: 0 }}>
                  <div>
                    <b>{section.title}</b>
                    {section.body ? (
                      <p className="vpa-mut" style={{ marginTop: 4, fontSize: 12.5 }}>
                        {section.body}
                      </p>
                    ) : null}
                  </div>
                  {section.steps.length > 0 ? (
                    <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4, fontSize: 12.5 }}>
                      {section.steps.map((step) => (
                        <li key={step.id}>
                          <b>{step.title}:</b> <span className="vpa-mut">{step.content}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {section.discussions.length > 0 ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      {section.discussions.map((discussion) => (
                        <p key={discussion.id} className="vpa-mut" style={{ margin: 0, fontSize: 12 }}>
                          <b style={{ color: "var(--tx)" }}>{discussion.authorName}:</b> {discussion.content}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <div className="vpa-two">
                    <form action={handleAddWikiStep} className="vpa-fld" style={{ gap: 8 }}>
                      <input type="hidden" name="sectionId" value={section.id} />
                      <input className="vpa-inp" name="title" placeholder="Paso nuevo" />
                      <textarea className="vpa-inp" name="content" placeholder="Qué hay que hacer" rows={2} style={AREA} />
                      <button className="vpa-btn line sm" style={{ alignSelf: "flex-start" }}>
                        Agregar paso
                      </button>
                    </form>
                    <form action={handleAddWikiDiscussion} className="vpa-fld" style={{ gap: 8 }}>
                      <input type="hidden" name="sectionId" value={section.id} />
                      <textarea className="vpa-inp" name="content" placeholder="Una aclaración para esta parte" rows={4} style={AREA} />
                      <button className="vpa-btn line sm" style={{ alignSelf: "flex-start" }}>
                        Agregar aclaración
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              <form action={handleAddWikiSection} className="vpa-fld" style={{ gap: 8 }}>
                <input type="hidden" name="documentId" value={doc.id} />
                <span>Parte nueva</span>
                <input className="vpa-inp" name="title" placeholder="Título" />
                <textarea className="vpa-inp" name="body" placeholder="Contenido" rows={3} style={AREA} />
                <button className="vpa-btn line sm" style={{ alignSelf: "flex-start" }}>
                  Agregar parte
                </button>
              </form>

              {doc.revisions.length > 0 ? (
                <div>
                  <div className="vpa-lab">Últimos cambios</div>
                  <ul className="vpa-mut" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4, fontSize: 12 }}>
                    {doc.revisions.map((revision) => (
                      <li key={revision.id}>
                        <b style={{ color: "var(--tx)" }}>{revision.summary}</b> ·{" "}
                        {revision.changedByUser?.name ?? revision.changedByUser?.email ?? "Sistema"} · {when(revision.createdAt)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </AppShell>
  );
}
