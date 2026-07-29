import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPinAuthService,
  prismaPinAuthRepository,
} from "@/lib/staff/pin-auth";

const inputSchema = z.object({
  globalTenantId: z.string().min(1),
  branchId: z.string().min(1),
  deviceId: z.string().min(1),
  employeeCode: z.string().min(2),
  pin: z.string().regex(/^\d{4,8}$/),
}).strict();

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const result = await createPinAuthService(prismaPinAuthRepository, {
      sessionSecret: process.env.REST_STAFF_SESSION_SECRET ?? "",
    }).authenticate(input);
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_PIN_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("LOCKED") ? 429
        : code.includes("FORBIDDEN") ? 403
          : code.includes("PIN_INVALID") ? 401 : 400,
      headers: { "cache-control": "no-store" },
    });
  }
}
