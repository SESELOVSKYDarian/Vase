import AdmZip from "adm-zip";
import { PDFParse } from "pdf-parse";

function xmlText(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  return zip.getEntries().filter((entry) => /\.(xml|txt)$/i.test(entry.entryName))
    .map((entry) => entry.getData().toString("utf8").replace(/<[^>]+>/g, " "))
    .join(" ").replace(/\s+/g, " ").trim();
}

export async function extractKnowledgeFile(buffer: Buffer, mimeType: string) {
  if (mimeType.startsWith("text/")) return buffer.toString("utf8");
  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try { return (await parser.getText()).text; } finally { await parser.destroy(); }
  }
  if (/wordprocessingml|spreadsheetml|presentationml|msword|ms-excel|ms-powerpoint/.test(mimeType)) return xmlText(buffer);
  throw new Error("KNOWLEDGE_FILE_TYPE_UNSUPPORTED");
}
