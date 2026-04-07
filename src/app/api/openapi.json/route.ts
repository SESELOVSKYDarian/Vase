import { NextResponse } from "next/server";
import { openApiDocument } from "@/config/openapi";

export function GET() {
  return NextResponse.json(openApiDocument);
}
