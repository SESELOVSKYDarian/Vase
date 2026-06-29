import { NextResponse } from "next/server";

type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN_SCOPE"
  | "NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
  };
};

export function createRequestId() {
  return crypto.randomUUID();
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  requestId: string,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json<ApiErrorResponse>(
    {
      error: {
        code,
        message,
        requestId,
      },
    },
    {
      status,
      headers: {
        "x-request-id": requestId,
        ...extraHeaders,
      },
    },
  );
}

export function apiSuccess<T>(
  payload: T,
  requestId: string,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(payload, {
    headers: {
      "x-request-id": requestId,
      ...extraHeaders,
    },
  });
}
