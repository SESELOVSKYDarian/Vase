import { redirect } from "next/navigation";

import { productOrigins } from "@/config/origins";

export default function LabsChannelsLaunchPage() {
  redirect(new URL("/app/owner/labs", productOrigins.labs).toString());
}
