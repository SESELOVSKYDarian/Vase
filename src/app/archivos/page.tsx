import { redirect } from "next/navigation";
import type { Route } from "next";

export default function ArchivosRedirectPage() {
  redirect("/app/archivos" as Route);
}
