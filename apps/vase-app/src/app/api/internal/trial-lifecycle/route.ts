import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/security/safe-compare";
import { runTrialLifecycle } from "@/server/services/trial-lifecycle";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!safeEqual(secret, process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await runTrialLifecycle();
  return NextResponse.json({ ok: true });
}
