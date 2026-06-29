import { NextResponse } from "next/server";
import { provisionCustomProjectAction } from "@/app/(platform)/app/admin/actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await provisionCustomProjectAction({}, formData);

  return NextResponse.json(result, {
    status: result.error ? 400 : 200,
  });
}
