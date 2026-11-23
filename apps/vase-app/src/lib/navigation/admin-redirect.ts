import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminHost, toPublicAdminPath } from "@/lib/security/admin-host-routing";

/** Redirige a una pantalla del Admin con la dirección que corresponde al host (admin.vase.ar sin /app/admin). */
export async function redirectAdmin(internalPath: string): Promise<never> {
  const list = await headers();
  const host = (list.get("x-forwarded-host") ?? list.get("host") ?? "").split(",")[0]?.trim() ?? "";
  const target = host && isAdminHost(host) ? (toPublicAdminPath(internalPath) ?? internalPath) : internalPath;
  redirect(target as Route);
}
