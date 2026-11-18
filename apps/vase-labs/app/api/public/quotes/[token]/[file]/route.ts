import { labsPrisma } from "../../../../../lib/db";
import { fetchBusinessProfile } from "../../../../../lib/business-profile";
import { verifyQuoteToken } from "../../../../../lib/conversation-quote";
import { renderQuotePdf } from "../../../../../lib/quote-pdf";

export const dynamic = "force-dynamic";

/**
 * PDF del presupuesto que la IA le mandó al cliente por el chat. Es público porque lo abre el cliente
 * (y Meta para adjuntarlo), pero solo con el link firmado: sin la firma, 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; file: string }> },
) {
  const { token, file } = await params;
  const id = verifyQuoteToken(token);
  if (!id || !file.endsWith(".pdf")) return new Response("No encontrado", { status: 404 });

  const quote = await labsPrisma.conversationQuote.findUnique({ where: { id } });
  if (!quote) return new Response("No encontrado", { status: 404 });

  const [profile, assistant] = await Promise.all([
    fetchBusinessProfile(quote.globalTenantId).catch(() => null),
    labsPrisma.assistant.findUnique({ where: { id: quote.assistantId }, select: { name: true } }),
  ]);
  const clean = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
  const mainBranch = profile?.branches?.find((branch) => branch.isMain) ?? profile?.branches?.[0];
  const contact = [
    [clean(profile?.whatsapp) && `WhatsApp ${clean(profile?.whatsapp)}`, clean(profile?.phone) && `Tel. ${clean(profile?.phone)}`].filter(Boolean).join(" · "),
    [clean(profile?.email), clean(profile?.website)].filter(Boolean).join(" · "),
    clean(mainBranch?.address) ?? "",
  ].filter((line): line is string => Boolean(line));

  const items = Array.isArray(quote.items) ? quote.items as Array<Record<string, unknown>> : [];
  const pdf = renderQuotePdf({
    businessName: clean(profile?.name) ?? clean(profile?.fiscal?.legalName) ?? assistant?.name ?? "Presupuesto",
    businessContact: contact,
    number: quote.number,
    createdAt: quote.createdAt,
    validUntil: quote.validUntil,
    customerName: quote.customerName,
    currency: quote.currency,
    lines: items.flatMap((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const total = Number(item.total);
      if (typeof item.name !== "string" || ![quantity, unitPrice, total].every(Number.isFinite)) return [];
      return [{ name: item.name, sku: typeof item.sku === "string" ? item.sku : null, quantity, unitPrice, total }];
    }),
    subtotal: Number(quote.subtotal),
    total: Number(quote.total),
    notes: quote.notes,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="presupuesto-${String(quote.number).padStart(4, "0")}.pdf"`,
      "cache-control": "private, max-age=300",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
