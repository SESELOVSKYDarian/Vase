import { redirectAdmin } from "@/lib/navigation/admin-redirect";

/** Accesos y cobros se reemplazó por la ficha de cada cliente. */
export default async function Page() {
  await redirectAdmin("/app/admin/clients");
}
