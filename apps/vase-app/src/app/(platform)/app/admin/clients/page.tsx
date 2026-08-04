import type { Route } from "next";
import { redirect } from "next/navigation";

export default function AdminClientsPage() {
  redirect("/users" as Route);
}
