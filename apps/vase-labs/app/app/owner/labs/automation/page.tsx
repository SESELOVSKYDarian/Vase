import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LabsAutomationPage() {
  redirect("/app/owner/labs/activity");
}
