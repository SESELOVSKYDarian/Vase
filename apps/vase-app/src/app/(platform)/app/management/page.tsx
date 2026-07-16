import { redirect } from "next/navigation";

export default function ManagementEntryPage() {
  redirect("/api/management/sso/start");
}
