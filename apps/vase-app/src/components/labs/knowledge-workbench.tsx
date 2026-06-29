"use client";

import { useState } from "react";
import { FilePlus2, Globe2, MessageCircleQuestion } from "lucide-react";
import { FaqForm } from "@/components/labs/faq-form";
import { KnowledgeFileForm } from "@/components/labs/knowledge-file-form";
import { KnowledgeFilesList } from "@/components/labs/knowledge-files-list";
import { KnowledgeUrlForm } from "@/components/labs/knowledge-url-form";
import { LabsModal, LabsSegmentedControl } from "@/components/labs/labs-overlays";
import { LabsEmptyState, LabsSection, LabsStatusPill } from "@/components/labs/labs-ui";

type Tab = "FAQS" | "FILES" | "URLS";

type FaqRow = {
  id: string;
  faqQuestion: string | null;
  faqAnswer: string | null;
  status: string;
};

type UrlRow = {
  id: string;
  title: string;
  sourceUrl: string | null;
  status: string;
};

type FileRow = {
  id: string;
  title: string;
  fileName: string | null;
  status: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "READY":
      return "success";
    case "FAILED":
      return "danger";
    case "PROCESSING":
    case "QUEUED":
      return "warning";
    default:
      return "neutral";
  }
}

export function KnowledgeWorkbench({ faqs, files, urls }: { faqs: FaqRow[]; files: FileRow[]; urls: UrlRow[] }) {
  const [tab, setTab] = useState<Tab>("FAQS");

  return (
    <div className="space-y-4">
      <LabsSection>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <LabsSegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "FAQS", label: `FAQs ${faqs.length}` },
              { value: "FILES", label: `Archivos ${files.length}` },
              { value: "URLS", label: `URLs ${urls.length}` },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <LabsModal
              title="Nueva FAQ"
              description="Agrega una pregunta y respuesta reutilizable por el asistente."
              trigger={<span className="labs-button labs-button-secondary"><MessageCircleQuestion className="size-4" /> FAQ</span>}
            >
              <FaqForm />
            </LabsModal>
            <LabsModal
              title="Subir documento"
              description="Carga documentos de la empresa para alimentar la base de conocimiento."
              trigger={<span className="labs-button labs-button-secondary"><FilePlus2 className="size-4" /> Archivo</span>}
              size="lg"
            >
              <KnowledgeFileForm />
            </LabsModal>
            <LabsModal
              title="Agregar URL"
              description="Registra paginas publicas para scraping controlado."
              trigger={<span className="labs-button labs-button-secondary"><Globe2 className="size-4" /> URL</span>}
            >
              <KnowledgeUrlForm />
            </LabsModal>
          </div>
        </div>
      </LabsSection>

      {tab === "FAQS" ? (
        <LabsSection title="FAQs cargadas">
          {faqs.length === 0 ? (
            <LabsEmptyState title="Sin FAQs" description="Agrega preguntas frecuentes para respuestas mas consistentes." />
          ) : (
            <div className="grid gap-3">
              {faqs.map((item) => (
                <article key={item.id} className="labs-subpanel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-[var(--foreground)]">{item.faqQuestion}</p>
                    <LabsStatusPill label={item.status} tone={statusTone(item.status)} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.faqAnswer}</p>
                </article>
              ))}
            </div>
          )}
        </LabsSection>
      ) : null}

      {tab === "FILES" ? (
        <LabsSection title="Documentos de empresa">
          <KnowledgeFilesList files={files} />
        </LabsSection>
      ) : null}

      {tab === "URLS" ? (
        <LabsSection title="URLs registradas">
          {urls.length === 0 ? (
            <LabsEmptyState title="Sin URLs" description="Agrega paginas publicas para ampliar la cobertura del asistente." />
          ) : (
            <div className="grid gap-3">
              {urls.map((item) => (
                <article key={item.id} className="labs-subpanel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{item.title}</p>
                      <p className="mt-1 break-all text-sm leading-6 text-[var(--muted)]">{item.sourceUrl}</p>
                    </div>
                    <LabsStatusPill label={item.status} tone={statusTone(item.status)} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </LabsSection>
      ) : null}
    </div>
  );
}
