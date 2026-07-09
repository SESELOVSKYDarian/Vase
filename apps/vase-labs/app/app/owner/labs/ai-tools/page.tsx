import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LabsAiToolsPage() {
  redirect("/app/owner/labs/settings");
}
