import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: { code: string; message: string };
};

export function apiError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: { code, message }, ...extra } satisfies ApiErrorBody &
      Record<string, unknown>,
    { status }
  );
}

export function apiOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
