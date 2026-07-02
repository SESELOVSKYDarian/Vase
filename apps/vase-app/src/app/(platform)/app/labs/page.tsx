import { redirect } from "next/navigation";
import { requireLabsOwnerAccess } from "@/lib/labs/access";

export default async function LabsPage() {
  await requireLabsOwnerAccess();
  redirect("/app/owner/labs");
}
