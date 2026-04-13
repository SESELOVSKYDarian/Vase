import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const url = new URL("/admin", req.url);
    url.hash = "bloqueos";
    url.searchParams.set(
      "error",
      "Faltan variables de entorno de Supabase para guardar bloqueos."
    );
    return NextResponse.redirect(url);
  }

  const form = await req.formData();
  const start_at_raw = String(form.get("start_at") || "");
  const end_at_raw = String(form.get("end_at") || "");
  const reason = String(form.get("reason") || "");

  if (!start_at_raw || !end_at_raw) {
    const url = new URL("/admin", req.url);
    url.hash = "bloqueos";
    url.searchParams.set("error", "Completa fechas de inicio y fin.");
    return NextResponse.redirect(url);
  }

  const toTimestamp = (value: string, isEnd: boolean) => {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return isEnd ? `${trimmed}T23:59:59Z` : `${trimmed}T00:00:00Z`;
    }
    return trimmed;
  };

  const start_at = toTimestamp(start_at_raw, false);
  const end_at = toTimestamp(end_at_raw, true);

  const sb = supabaseAdmin;
  const { data: trainer } = await sb
    .from("trainers")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!trainer) {
    const url = new URL("/admin", req.url);
    url.hash = "bloqueos";
    url.searchParams.set(
      "error",
      "No hay entrenador configurado para guardar bloqueos."
    );
    return NextResponse.redirect(url);
  }

  const { error } = await sb
    .from("blocks")
    .insert({ trainer_id: trainer.id, start_at, end_at, reason });

  const url = new URL("/admin", req.url);
  url.hash = "bloqueos";
  if (error) {
    url.searchParams.set(
      "error",
      `No se pudo guardar el bloqueo. ${error.message}`
    );
  } else {
    url.searchParams.set("notice", "Bloqueo guardado correctamente.");
  }
  return NextResponse.redirect(url);
}
