import { redirect } from "next/navigation";

export default function OwnerPageRedirect() {
  redirect("/app/business");
}

