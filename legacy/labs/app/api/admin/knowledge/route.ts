import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const url = new URL("/admin", req.url);
    url.hash = "ia";
    url.searchParams.set(
      "error",
      "Faltan variables de entorno de Supabase para subir archivos."
    );
    return NextResponse.redirect(url);
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    const url = new URL("/admin", req.url);
    url.hash = "ia";
    url.searchParams.set("error", "Seleccioná un archivo válido.");
    return NextResponse.redirect(url);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}-${file.name}`;
  const sb = supabaseAdmin;
  const { error } = await sb.storage
    .from("brand-knowledge")
    .upload(fileName, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  const url = new URL("/admin", req.url);
  url.hash = "ia";
  if (error) {
    const message =
      error.message.includes("Bucket")
        ? "No se encontró el bucket 'brand-knowledge'. Crealo en Supabase Storage."
        : `No se pudo subir el archivo. ${error.message}`;
    url.searchParams.set("error", message);
  } else {
    url.searchParams.set("notice", "Archivo subido correctamente.");
  }
  return NextResponse.redirect(url);
}
