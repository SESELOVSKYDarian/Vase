import { NextResponse } from "next/server";
import { runCustomProjectMeetingReminders } from "@/server/services/custom-project-meeting-reminders";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await runCustomProjectMeetingReminders();
  return NextResponse.json({ ok: true });
}

