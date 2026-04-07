"use client";

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import {
  builderBlockLabels,
  builderButtonStyles,
  builderSectionSpacing,
  builderSurfaceStyles,
  builderTemplateCatalog,
  createBlockFromType,
  type BuilderBlock,
  type BuilderCapabilities,
  type BuilderDocument,
} from "@/lib/business/builder";
import {
  createBuilderVersionAction,
  publishBuilderPageAction,
  saveBuilderDraftAction,
  submitFullCustomizationRequestAction,
} from "@/app/(platform)/app/owner/pages/[pageId]/actions";
import { StorefrontPreview } from "@/components/business/storefront-preview";
import { DomainRequestForm } from "@/components/business/domain-request-form";
import { StatusBadge } from "@/components/business/status-badge";

type BuilderEditorProps = {
  pageId: string;
  pageName: string;
  pageSlug: string;
  pageStatus: string;
  initialDocument: BuilderDocument;
  capabilities: BuilderCapabilities;
  domainConnections: Array<{
    id: string;
    hostname: string;
    status: string;
    verifiedAt: Date | null;
  }>;
  versionHistory: Array<{
    id: string;
    versionNumber: number;
    kind: string;
    changeSummary: string | null;
    createdAt: Date;
  }>;
  requestHistory: Array<{
    id: string;
    status: string;
    requestType: string;
    quotedPriceLabel: string | null;
    createdAt: Date;
  }>;
  initialSavedAt?: string | null;
};

type ViewportMode = "desktop" | "mobile";

const customizationInitialState = {
  businessDescription: "",
  desiredColors: "",
  brandStyle: "",
  desiredFeatures: "",
  visualReferences: "",
  observations: "",
};

function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function versionTone(kind: string) {
  switch (kind) {
    case "PUBLISHED":
      return "success";
    case "MANUAL":
      return "premium";
    default:
      return "neutral";
  }
}

export function BuilderEditor({
  pageId,
  pageName,
  pageSlug,
  pageStatus,
  initialDocument,
  capabilities,
  domainConnections,
  versionHistory,
  requestHistory,
  initialSavedAt,
}: BuilderEditorProps) {
  const [document, setDocument] = useState(initialDocument);
  const [selectedBlockId, setSelectedBlockId] = useState(initialDocument.blocks[0]?.id ?? "");
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [saveMessage, setSaveMessage] = useState(
    initialSavedAt ? `Ultimo guardado ${formatDate(initialSavedAt)}.` : "Listo para editar.",
  );
  const [versionSummary, setVersionSummary] = useState("");
  const [customizationForm, setCustomizationForm] = useState(customizationInitialState);
  const [customizationMessage, setCustomizationMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastSerializedRef = useRef(JSON.stringify(initialDocument));

  const selectedBlock =
    document.blocks.find((block) => block.id === selectedBlockId) ?? document.blocks[0] ?? null;

  useEffect(() => {
    const serialized = JSON.stringify(document);

    if (serialized === lastSerializedRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveMessage("Guardando automaticamente...");
      startTransition(() => {
        void saveBuilderDraftAction({ pageId, document }).then((result) => {
          if (result.error) {
            setSaveMessage(result.error);
            return;
          }

          lastSerializedRef.current = serialized;
          setSaveMessage(
            result.savedAt
              ? `Ultimo guardado ${formatDate(result.savedAt)}.`
              : "Cambios guardados automaticamente.",
          );
        });
      });
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [document, pageId]);

  function updateDocument(nextDocument: BuilderDocument) {
    setDocument(nextDocument);
  }

  function updateBlock(nextBlock: BuilderBlock) {
    updateDocument({
      ...document,
      blocks: document.blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block)),
    });
  }

  function moveSelectedBlock(direction: -1 | 1) {
    if (!selectedBlock) {
      return;
    }

    const index = document.blocks.findIndex((block) => block.id === selectedBlock.id);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= document.blocks.length) {
      return;
    }

    const nextBlocks = [...document.blocks];
    const [current] = nextBlocks.splice(index, 1);
    nextBlocks.splice(targetIndex, 0, current);
    updateDocument({
      ...document,
      blocks: nextBlocks,
    });
  }

  function removeSelectedBlock() {
    if (!selectedBlock || document.blocks.length === 1) {
      return;
    }

    const nextBlocks = document.blocks.filter((block) => block.id !== selectedBlock.id);
    updateDocument({
      ...document,
      blocks: nextBlocks,
    });
    setSelectedBlockId(nextBlocks[0]?.id ?? "");
  }

  function addBlock(type: BuilderCapabilities["availableBlockTypes"][number]) {
    const block = createBlockFromType(type);

    updateDocument({
      ...document,
      blocks: [...document.blocks, block],
    });
    setSelectedBlockId(block.id);
  }

  function updateCustomizationField(
    field: keyof typeof customizationInitialState,
    value: string,
  ) {
    setCustomizationForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleCreateVersion() {
    startTransition(() => {
      void createBuilderVersionAction({
        pageId,
        changeSummary: versionSummary,
      }).then((result) => {
        setSaveMessage(result.error ?? result.success ?? "Version registrada.");
        if (result.success) {
          setVersionSummary("");
        }
      });
    });
  }

  function handlePublish() {
    startTransition(() => {
      void publishBuilderPageAction({ pageId }).then((result) => {
        setSaveMessage(result.error ?? result.success ?? "Pagina publicada.");
      });
    });
  }

  function handleCustomizationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomizationMessage("Enviando solicitud...");

    startTransition(() => {
      void submitFullCustomizationRequestAction({
        pageId,
        ...customizationForm,
      }).then((result) => {
        setCustomizationMessage(result.error ?? result.success ?? "Solicitud enviada.");

        if (result.success) {
          setCustomizationForm(customizationInitialState);
        }
      });
    });
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[0_24px_48px_rgba(25,28,27,0.06)]">
        <div className="flex flex-col gap-5 border-b border-[var(--border-subtle)] bg-white/80 px-6 py-5 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-9 items-center rounded-full bg-[color-mix(in_srgb,var(--surface-strong)_90%,white)] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Vase Business
              </span>
              <StatusBadge tone="info" label={`Pagina ${pageStatus}`} />
              <StatusBadge
                tone={capabilities.canUseAdvancedLayout ? "premium" : "warning"}
                label={capabilities.canUseAdvancedLayout ? "Editor avanzado" : "Editor temporal"}
              />
            </div>
            <div>
              <h2 className="font-serif text-3xl tracking-[-0.04em] text-[var(--foreground)] lg:text-4xl">
                Editor visual de {pageName}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                {capabilities.helperText}
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,white)] p-4 xl:min-w-[420px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--foreground)]">{saveMessage}</p>
              <div className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--surface-strong)_88%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Draft activo
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                value={versionSummary}
                onChange={(event) => setVersionSummary(event.target.value)}
                placeholder="Resumen de la version"
                className="min-h-11 flex-1 rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_94%,transparent)] px-4 text-sm text-[var(--foreground)]"
              />
              <button
                type="button"
                onClick={handleCreateVersion}
                disabled={isPending || versionSummary.trim().length < 3}
                className="min-h-11 rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)] disabled:opacity-50"
              >
                Guardar version
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPending}
                className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-50"
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="grid gap-6 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] p-5 shadow-[0_18px_36px_rgba(25,28,27,0.05)]">
            <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted-soft)] uppercase">
              Secciones
            </p>
            <div className="mt-4 grid gap-3">
              {document.blocks.map((block, index) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`cursor-pointer rounded-[22px] border p-4 text-left ${
                    selectedBlockId === block.id
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,white)] shadow-[inset_4px_0_0_var(--accent)]"
                      : "border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_96%,white)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--foreground)]">
                      {index + 1}. {builderBlockLabels[block.type]}
                    </p>
                    <StatusBadge
                      tone={block.enabled ? "success" : "neutral"}
                      label={block.enabled ? "Activo" : "Oculto"}
                    />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{block.title}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] p-5 shadow-[0_18px_36px_rgba(25,28,27,0.05)]">
            <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted-soft)] uppercase">
              Agregar bloque
            </p>
            <div className="mt-4 grid gap-3">
              {capabilities.availableBlockTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="cursor-pointer rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_96%,white)] px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--surface-strong)_80%,white)]"
                >
                  {builderBlockLabels[type]}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] px-4 py-3 shadow-[0_18px_36px_rgba(25,28,27,0.05)]">
            <div>
              <p className="font-semibold text-[var(--foreground)]">Preview responsive</p>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Cambia de desktop a mobile para revisar legibilidad y jerarquia.
              </p>
            </div>
            <div className="flex gap-2 rounded-full bg-[color-mix(in_srgb,var(--surface-strong)_78%,white)] p-1">
              {(["desktop", "mobile"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewport(mode)}
                  className={`min-h-10 rounded-full px-4 text-sm font-semibold ${
                    viewport === mode ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]" : "text-[var(--muted)]"
                  }`}
                >
                  {mode === "desktop" ? "Desktop" : "Mobile"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_60%,white)] p-4 shadow-[0_24px_48px_rgba(25,28,27,0.06)]">
            <StorefrontPreview document={document} viewport={viewport} />
          </div>
          
          <section className="grid gap-4 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] p-5 shadow-[0_18px_36px_rgba(25,28,27,0.05)] md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted-soft)] uppercase">
                Versionado simple
              </p>
              <div className="mt-4 grid gap-3">
                {versionHistory.length === 0 ? (
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    Aun no hay versiones registradas para esta pagina.
                  </p>
                ) : (
                  versionHistory.map((version) => (
                    <div
                      key={version.id}
                      className="rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_96%,white)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">
                          Version {version.versionNumber}
                        </p>
                        <StatusBadge tone={versionTone(version.kind)} label={version.kind} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {version.changeSummary ?? "Sin resumen adicional."}
                      </p>
                      <p className="mt-2 text-xs text-[var(--muted-soft)]">{formatDate(version.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted-soft)] uppercase">
                Solicitar personalizacion completa
              </p>
              <form onSubmit={handleCustomizationSubmit} className="mt-4 grid gap-3">
                <TextAreaField
                  label="Descripcion del negocio"
                  value={customizationForm.businessDescription}
                  onChange={(value) => updateCustomizationField("businessDescription", value)}
                />
                <InputField
                  label="Colores deseados"
                  value={customizationForm.desiredColors}
                  onChange={(value) => updateCustomizationField("desiredColors", value)}
                />
                <InputField
                  label="Estilo de marca"
                  value={customizationForm.brandStyle}
                  onChange={(value) => updateCustomizationField("brandStyle", value)}
                />
                <TextAreaField
                  label="Funcionalidades deseadas"
                  value={customizationForm.desiredFeatures}
                  onChange={(value) => updateCustomizationField("desiredFeatures", value)}
                />
                <InputField
                  label="Referencias visuales"
                  value={customizationForm.visualReferences}
                  onChange={(value) => updateCustomizationField("visualReferences", value)}
                />
                <TextAreaField
                  label="Observaciones"
                  value={customizationForm.observations}
                  onChange={(value) => updateCustomizationField("observations", value)}
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-50"
                >
                  Enviar a Vase
                </button>
                {customizationMessage ? (
                  <p className="text-sm leading-6 text-[var(--muted)]">{customizationMessage}</p>
                ) : null}
              </form>
            </div>
          </section>
        </section>

        <aside className="grid gap-6 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] p-5 shadow-[0_18px_36px_rgba(25,28,27,0.05)]">
            <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted-soft)] uppercase">
              Configuracion general
            </p>
            <div className="mt-4 grid gap-3">
              <SelectField
                label="Plantilla base"
                value={document.templateKey}
                onChange={(value) =>
                  updateDocument({
                    ...document,
                    templateKey: value as BuilderDocument["templateKey"],
                  })
                }
                options={capabilities.availableTemplates.map((templateKey) => ({
                  value: templateKey,
                  label: builderTemplateCatalog[templateKey].label,
                }))}
              />
              <SelectField
                label="Paleta"
                value={document.theme.palette}
                onChange={(value) =>
                  updateDocument({
                    ...document,
                    theme: {
                      ...document.theme,
                      palette: value as BuilderDocument["theme"]["palette"],
                    },
                  })
                }
                options={capabilities.availablePalettes.map((palette) => ({
                  value: palette,
                  label: palette,
                }))}
              />
              <SelectField
                label="Botones"
                value={document.theme.buttonStyle}
                onChange={(value) =>
                  updateDocument({
                    ...document,
                    theme: {
                      ...document.theme,
                      buttonStyle: value as BuilderDocument["theme"]["buttonStyle"],
                    },
                  })
                }
                options={builderButtonStyles.map((value) => ({ value, label: value }))}
              />
              <SelectField
                label="Superficie"
                value={document.theme.surfaceStyle}
                onChange={(value) =>
                  updateDocument({
                    ...document,
                    theme: {
                      ...document.theme,
                      surfaceStyle: value as BuilderDocument["theme"]["surfaceStyle"],
                    },
                  })
                }
                options={builderSurfaceStyles.map((value) => ({ value, label: value }))}
              />
              <SelectField
                label="Espaciado"
                value={document.theme.sectionSpacing}
                onChange={(value) =>
                  updateDocument({
                    ...document,
                    theme: {
                      ...document.theme,
                      sectionSpacing: value as BuilderDocument["theme"]["sectionSpacing"],
                    },
                  })
                }
                options={builderSectionSpacing.map((value) => ({ value, label: value }))}
              />
              <InputField
                label="SEO title"
                value={document.seo.title}
                onChange={(value) =>
                  updateDocument({
                    ...document,
                    seo: {
                      ...document.seo,
                      title: value,
                    },
                  })
                }
              />
              <TextAreaField
                label="SEO description"
                value={document.seo.description ?? ""}
                onChange={(value) =>
                  updateDocument({
                    ...document,
                    seo: {
                      ...document.seo,
                      description: value,
                    },
                  })
                }
              />
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] p-5 shadow-[0_18px_36px_rgba(25,28,27,0.05)]">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted-soft)] uppercase">
                Sitio y dominio
              </p>
              <h3 className="font-serif text-2xl tracking-[-0.04em] text-[var(--foreground)]">
                {pageName}
              </h3>
              <p className="text-sm leading-7 text-[var(--muted)]">
                Este editor pertenece al sitio <span className="font-semibold text-[var(--foreground)]">/{pageSlug}</span>.
                Desde aqui puedes asociar su dominio propio y dejar lista su operacion.
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              {domainConnections.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_96%,white)] p-4 text-sm leading-7 text-[var(--muted)]">
                  Este sitio aun no tiene dominios asociados.
                </div>
              ) : (
                domainConnections.map((domain) => (
                  <div
                    key={domain.id}
                    className="rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_96%,white)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{domain.hostname}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {domain.verifiedAt ? "Dominio verificado." : "Dominio pendiente de verificacion."}
                        </p>
                      </div>
                      <StatusBadge tone="info" label={domain.status} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4">
              <DomainRequestForm disabled={!capabilities.canUseAdvancedLayout} defaultPageId={pageId} />
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] p-5 shadow-[0_18px_36px_rgba(25,28,27,0.05)]">
            <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted-soft)] uppercase">
              Sistema de gestion
            </p>
            <div className="mt-3 grid gap-3">
              <div className="rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_96%,white)] p-4">
                <p className="font-semibold text-[var(--foreground)]">Conexion operativa por sitio</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Define para este sitio como vas a sincronizar catalogo, stock, pedidos y clientes con tu sistema de gestion.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <a
                  href={`/app/owner/integrations/api?site=${pageId}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
                >
                  Abrir integraciones del sitio
                </a>
                <a
                  href="/developers/api"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)]"
                >
                  Ver API Docs
                </a>
              </div>
            </div>
          </section>

          {selectedBlock ? (
            <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,white)] p-5 shadow-[0_18px_36px_rgba(25,28,27,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted-soft)] uppercase">
                    Bloque seleccionado
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {builderBlockLabels[selectedBlock.type]}
                  </h3>
                </div>
                <StatusBadge
                  tone={selectedBlock.enabled ? "success" : "neutral"}
                  label={selectedBlock.enabled ? "Visible" : "Oculto"}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateBlock({ ...selectedBlock, enabled: !selectedBlock.enabled })}
                  className="min-h-10 rounded-full border border-black/10 px-4 text-sm font-semibold text-[var(--foreground)]"
                >
                  {selectedBlock.enabled ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => moveSelectedBlock(-1)}
                  className="min-h-10 rounded-full border border-black/10 px-4 text-sm font-semibold text-[var(--foreground)]"
                >
                  Subir
                </button>
                <button
                  type="button"
                  onClick={() => moveSelectedBlock(1)}
                  className="min-h-10 rounded-full border border-black/10 px-4 text-sm font-semibold text-[var(--foreground)]"
                >
                  Bajar
                </button>
                <button
                  type="button"
                  onClick={removeSelectedBlock}
                  disabled={document.blocks.length === 1}
                  className="min-h-10 rounded-full border border-[#E7C7C1] px-4 text-sm font-semibold text-[var(--danger)] disabled:opacity-40"
                >
                  Eliminar
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <InputField
                  label="Titulo del bloque"
                  value={selectedBlock.title}
                  onChange={(value) => updateBlock({ ...selectedBlock, title: value })}
                />

                {selectedBlock.type === "hero" ? (
                  <>
                    <InputField
                      label="Eyebrow"
                      value={selectedBlock.eyebrow ?? ""}
                      onChange={(value) => updateBlock({ ...selectedBlock, eyebrow: value })}
                    />
                    <TextAreaField
                      label="Descripcion"
                      value={selectedBlock.description ?? ""}
                      onChange={(value) => updateBlock({ ...selectedBlock, description: value })}
                    />
                    <InputField
                      label="CTA label"
                      value={selectedBlock.ctaLabel ?? ""}
                      onChange={(value) => updateBlock({ ...selectedBlock, ctaLabel: value })}
                    />
                    <InputField
                      label="CTA href"
                      value={selectedBlock.ctaHref ?? ""}
                      onChange={(value) => updateBlock({ ...selectedBlock, ctaHref: value })}
                    />
                    <InputField
                      label="URL de imagen"
                      value={selectedBlock.imageUrl ?? ""}
                      onChange={(value) => updateBlock({ ...selectedBlock, imageUrl: value })}
                    />
                  </>
                ) : null}

                {selectedBlock.type === "rich-text" ? (
                  <TextAreaField
                    label="Texto"
                    value={selectedBlock.body}
                    onChange={(value) => updateBlock({ ...selectedBlock, body: value })}
                  />
                ) : null}

                {selectedBlock.type === "feature-list" ? (
                  <TextAreaField
                    label="Items"
                    value={selectedBlock.items.join("\n")}
                    onChange={(value) =>
                      updateBlock({
                        ...selectedBlock,
                        items: value
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    hint="Un beneficio por linea."
                  />
                ) : null}

                {selectedBlock.type === "gallery" ? (
                  <>
                    <TextAreaField
                      label="URLs de imagen"
                      value={selectedBlock.images.map((image) => image.src).join("\n")}
                      onChange={(value) =>
                        updateBlock({
                          ...selectedBlock,
                          images: value
                            .split("\n")
                            .map((src, index) => ({
                              src: src.trim(),
                              alt:
                                selectedBlock.images[index]?.alt ??
                                `Imagen ${index + 1} de ${selectedBlock.title}`,
                            }))
                            .filter((image) => image.src.length > 0),
                        })
                      }
                      hint="Una URL por linea."
                    />
                    <TextAreaField
                      label="Textos alternativos"
                      value={selectedBlock.images.map((image) => image.alt).join("\n")}
                      onChange={(value) => {
                        const alts = value.split("\n");
                        updateBlock({
                          ...selectedBlock,
                          images: selectedBlock.images.map((image, index) => ({
                            ...image,
                            alt: alts[index]?.trim() || image.alt,
                          })),
                        });
                      }}
                      hint="Un alt por linea, en el mismo orden."
                    />
                  </>
                ) : null}

                {selectedBlock.type === "faq" ? (
                  <TextAreaField
                    label="Preguntas y respuestas"
                    value={selectedBlock.items
                      .map((item) => `${item.question} | ${item.answer}`)
                      .join("\n")}
                    onChange={(value) =>
                      updateBlock({
                        ...selectedBlock,
                        items: value
                          .split("\n")
                          .map((row) => row.split("|"))
                          .map(([question, answer]) => ({
                            question: question?.trim() ?? "",
                            answer: answer?.trim() ?? "",
                          }))
                          .filter((item) => item.question && item.answer),
                      })
                    }
                    hint="Usa el formato pregunta | respuesta."
                  />
                ) : null}

                {selectedBlock.type === "cta" ? (
                  <>
                    <TextAreaField
                      label="Descripcion"
                      value={selectedBlock.description ?? ""}
                      onChange={(value) => updateBlock({ ...selectedBlock, description: value })}
                    />
                    <InputField
                      label="CTA label"
                      value={selectedBlock.ctaLabel}
                      onChange={(value) => updateBlock({ ...selectedBlock, ctaLabel: value })}
                    />
                    <InputField
                      label="CTA href"
                      value={selectedBlock.ctaHref}
                      onChange={(value) => updateBlock({ ...selectedBlock, ctaHref: value })}
                    />
                  </>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_72%,transparent)]5 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted-soft)] uppercase">
              Estado de personalizaciones
            </p>
            <div className="mt-4 grid gap-3">
              {requestHistory.length === 0 ? (
                <p className="text-sm leading-7 text-[var(--muted)]">
                  Aun no enviaste pedidos avanzados al equipo Vase.
                </p>
              ) : (
                requestHistory.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{request.requestType}</p>
                      <StatusBadge tone="premium" label={request.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {request.quotedPriceLabel
                        ? `Cotizacion de referencia: ${request.quotedPriceLabel}`
                        : "Aun sin cotizacion visible."}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted-soft)]">{formatDate(request.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function InputField({ label, value, onChange }: InputFieldProps) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-[var(--foreground)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
      />
    </label>
  );
}

type TextAreaFieldProps = InputFieldProps & {
  hint?: string;
};

function TextAreaField({ label, value, onChange, hint }: TextAreaFieldProps) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-[var(--foreground)]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="min-h-28 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
      />
      {hint ? <span className="text-xs leading-5 text-[var(--muted-soft)]">{hint}</span> : null}
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-[var(--foreground)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
