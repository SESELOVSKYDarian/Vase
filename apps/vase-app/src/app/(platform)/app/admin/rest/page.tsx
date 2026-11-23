import { redirectAdmin } from "@/lib/navigation/admin-redirect";

/** Rest ahora está en Productos. */
export default async function Page() {
  await redirectAdmin("/app/admin/modules/rest");
}
