import { redirectAdmin } from "@/lib/navigation/admin-redirect";

/** Los valores ahora están en cada producto (Productos). */
export default async function Page() {
  await redirectAdmin("/app/admin/modules");
}
