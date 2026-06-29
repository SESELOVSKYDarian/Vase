import { PDFParse } from "pdf-parse";

export const PDF_KNOWLEDGE_TEXT_MAX_LENGTH = 12000;

type PdfKnowledgeSnippetInput = {
  fileName: string;
  text: string;
};

export function normalizeExtractedPdfText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function limitPdfKnowledgeText(text: string) {
  if (text.length <= PDF_KNOWLEDGE_TEXT_MAX_LENGTH) {
    return text;
  }

  return `${text.slice(0, PDF_KNOWLEDGE_TEXT_MAX_LENGTH).trim()}\n\n[Contenido truncado automaticamente para entrenamiento.]`;
}

export function buildPdfKnowledgeSnippet({ fileName, text }: PdfKnowledgeSnippetInput) {
  const normalizedText = limitPdfKnowledgeText(normalizeExtractedPdfText(text));

  if (!normalizedText) {
    return [
      `PDF cargado: ${fileName}.`,
      "No se pudo extraer texto seleccionable del PDF. Si es un documento escaneado o una imagen, requiere OCR antes de entrenar al asistente.",
    ].join(" ");
  }

  return [`Contenido extraido del PDF ${fileName}:`, normalizedText].join("\n\n");
}

export async function extractPdfTextFromBuffer(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return normalizeExtractedPdfText(result.text || "");
  } finally {
    await parser.destroy();
  }
}

export async function extractPdfKnowledgeSnippetFromFile(file: File, fileName: string) {
  if (file.type !== "application/pdf") {
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractPdfTextFromBuffer(buffer);

  return buildPdfKnowledgeSnippet({
    fileName,
    text,
  });
}
