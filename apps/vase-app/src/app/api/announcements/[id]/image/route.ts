import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

/** Imagen de un anuncio. Se guarda achicada en la base; acá se devuelve como archivo y se cachea. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/i.test(id)) return new Response("Not found", { status: 404 });
  const row = await prisma.announcement.findUnique({ where: { id }, select: { imageData: true } });
  const match = row?.imageData?.match(/^data:(image\/(?:webp|png|jpeg));base64,(.+)$/);
  if (!match) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
