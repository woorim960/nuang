import { NextResponse } from "next/server";

const maximumReportBytes = 16 * 1024;

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > maximumReportBytes) {
    return new NextResponse(null, { status: 413 });
  }

  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > maximumReportBytes) {
      return new NextResponse(null, { status: 413 });
    }

    // Report-only telemetry is intentionally not persisted yet. Browser CSP
    // reports can contain document URLs, so the launch gate relies on provider
    // dashboard review without copying them into NUANG product analytics.
    JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  return new NextResponse(null, {
    headers: { "cache-control": "no-store" },
    status: 204,
  });
}
