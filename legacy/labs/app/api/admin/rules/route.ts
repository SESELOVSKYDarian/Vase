import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const url = new URL("/admin", req.url);
    url.hash = "horarios";
    url.searchParams.set(
      "error",
      "Faltan variables de entorno de Supabase para guardar horarios."
    );
    return NextResponse.redirect(url);
  }

  const form = await req.formData();
  const day_of_week = Number(form.get("day_of_week"));
  const start_time_raw = String(form.get("start_time") || "");
  const end_time_raw = String(form.get("end_time") || "");

  const normalizeTime = (value: string) => {
    const trimmed = value.trim();
    if (/^\d{1,2}$/.test(trimmed)) {
      return `${trimmed.padStart(2, "0")}:00`;
    }
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    return trimmed;
  };

  const start_time = normalizeTime(start_time_raw);
  const end_time = normalizeTime(end_time_raw);

  if (!day_of_week || !start_time || !end_time) {
    const url = new URL("/admin", req.url);
    url.hash = "horarios";
    url.searchParams.set("error", "Completa todos los campos del horario.");
    return NextResponse.redirect(url);
  }
  if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
    const url = new URL("/admin", req.url);
    url.hash = "horarios";
    url.searchParams.set(
      "error",
      "Ingresá horarios válidos en formato HH:MM (ej: 09:00)."
    );
    return NextResponse.redirect(url);
  }

  const sb = supabaseAdmin;
  const { data: trainer } = await sb
    .from("trainers")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!trainer) {
    const url = new URL("/admin", req.url);
    url.hash = "horarios";
    url.searchParams.set(
      "error",
      "No hay entrenador configurado para guardar horarios."
    );
    return NextResponse.redirect(url);
  }

  const { error } = await sb.from("availability_rules").insert({
    trainer_id: trainer.id,
    day_of_week,
    start_time,
    end_time,
  });

  const url = new URL("/admin", req.url);
  url.hash = "horarios";
  if (error) {
    url.searchParams.set(
      "error",
      `No se pudo guardar el horario. ${error.message}`
    );
  } else {
    url.searchParams.set("notice", "Horario guardado correctamente.");
  }
  return NextResponse.redirect(url);
}
