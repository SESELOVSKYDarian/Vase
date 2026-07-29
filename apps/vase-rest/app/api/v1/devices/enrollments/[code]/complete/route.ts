import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createEnrollmentService,
  prismaEnrollmentRepository,
} from "@/lib/devices/enrollment-service";

const completionSchema = z.object({
  certificateFingerprint: z.string().min(1),
}).strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const input = completionSchema.parse(await request.json());
    const enrollment = await createEnrollmentService(prismaEnrollmentRepository, {
      signingSecret: process.env.REST_ENROLLMENT_SIGNING_SECRET ?? "",
      signingPrivateKey: process.env.REST_EDGE_SIGNING_PRIVATE_KEY_B64
        ? Buffer.from(process.env.REST_EDGE_SIGNING_PRIVATE_KEY_B64, "base64").toString("utf8")
        : undefined,
      syncBaseUrl: process.env.REST_PUBLIC_URL ?? "https://rest.vase.ar",
    }).complete({ code, ...input });
    return NextResponse.json(enrollment, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_ENROLLMENT_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("NOT_FOUND") ? 404
        : code.includes("USED") || code.includes("REVOKED") ? 409
          : code.includes("EXPIRED") ? 410
            : code.includes("LIMIT") ? 403 : 400,
      headers: { "cache-control": "no-store" },
    });
  }
}
