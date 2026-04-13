import { SupportKnowledgeDeleteForm } from "@/components/support/support-knowledge-delete-form";
import { SupportKnowledgeForm } from "@/components/support/support-knowledge-form";
import { StatusBadge } from "@/components/business/status-badge";
import { PanelCard } from "@/components/ui/panel-card";

type SupportKnowledgeManagerItem = {
  id: string;
  tenantId: string | null;
  question: string;
  answer: string;
  category: string | null;
  tags: unknown;
  isActive: boolean;
  updatedAt: Date;
  tenant: {
    id: string;
    name: string;
    accountName: string;
  } | null;
  createdByUser: {
    id: string;
    name: string | null;
    email: string;
  };
};

type SupportKnowledgeTenant = {
  id: string;
  accountName: string;
  name: string;
};

type SupportKnowledgeManagerProps = {
  items: SupportKnowledgeManagerItem[];
  categories: string[];
  tenants: SupportKnowledgeTenant[];
  currentPath: string;
  currentQuery?: string;
  currentCategory?: string;
  currentTenantId?: string;
  allowTenantInput?: boolean;
  canDeleteGlobal?: boolean;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function normalizeTags(tags: unknown) {
  return Array.isArray(tags)
    ? tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
}

export function SupportKnowledgeManager({
  items,
  categories,
  tenants,
  currentPath,
  currentQuery,
  currentCategory,
  currentTenantId,
  allowTenantInput = false,
  canDeleteGlobal = false,
}: SupportKnowledgeManagerProps) {
  return (
    <div className="grid gap-6">
      <PanelCard
        eyebrow="Base de conocimiento"
        title="FAQs para soporte asistido por IA"
        description="Gestiona respuestas verificadas para que la IA tenga contexto antes de contestar. Puedes combinarlas por tenant o mantenerlas globales."
      >
        <form action={currentPath} className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Buscar</span>
            <input
              name="q"
              defaultValue={currentQuery ?? ""}
              placeholder="Dominio, facturacion, integraciones, onboarding"
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Categoria</span>
            <select
              name="category"
              defaultValue={currentCategory ?? ""}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Tenant</span>
            <select
              name="tenantId"
              defaultValue={currentTenantId ?? ""}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            >
              <option value="">Global + todos los tenants</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.accountName}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="min-h-11 w-full rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              Filtrar
            </button>
          </div>
        </form>
      </PanelCard>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <PanelCard
          eyebrow="Nueva FAQ"
          title="Agregar conocimiento"
          description="Crea respuestas globales o especificas por cliente para mejorar el soporte asistido."
        >
          <SupportKnowledgeForm
            mode="create"
            tenantId={currentTenantId}
            allowTenantInput={allowTenantInput}
          />
        </PanelCard>

        <PanelCard
          eyebrow="Inventario"
          title="FAQs disponibles"
          description="Las FAQs del tenant tienen prioridad sobre las globales cuando la IA arma contexto."
        >
          <div className="grid gap-4">
            {items.length === 0 ? (
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                No encontramos FAQs para este filtro.
              </div>
            ) : (
              items.map((item) => {
                const tags = normalizeTags(item.tags);
                const isGlobal = !item.tenantId;

                return (
                  <div
                    key={item.id}
                    className="grid gap-4 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            tone={item.isActive ? "success" : "warning"}
                            label={item.isActive ? "Activa" : "Inactiva"}
                          />
                          <StatusBadge
                            tone={isGlobal ? "info" : "neutral"}
                            label={isGlobal ? "Global" : item.tenant?.accountName ?? "Tenant"}
                          />
                          {item.category ? (
                            <StatusBadge tone="neutral" label={item.category} />
                          ) : null}
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">
                          {item.question}
                        </h3>
                        <p className="text-sm leading-7 text-[var(--muted)]">{item.answer}</p>
                      </div>
                      <p className="text-xs text-[var(--muted-soft)]">
                        Actualizada {formatDate(item.updatedAt)}
                      </p>
                    </div>

                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <span
                            key={`${item.id}-${tag}`}
                            className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--muted)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                      Creada por {item.createdByUser.name ?? item.createdByUser.email}
                      {item.tenant ? ` para ${item.tenant.accountName}` : " como conocimiento global"}.
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                      <SupportKnowledgeForm
                        mode="update"
                        knowledgeId={item.id}
                        tenantId={item.tenantId}
                        question={item.question}
                        answer={item.answer}
                        category={item.category}
                        tags={tags}
                        isActive={item.isActive}
                        allowTenantInput={allowTenantInput}
                      />
                      <div className="flex items-start justify-end">
                        <SupportKnowledgeDeleteForm
                          knowledgeId={item.id}
                          disabled={isGlobal && !canDeleteGlobal}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
