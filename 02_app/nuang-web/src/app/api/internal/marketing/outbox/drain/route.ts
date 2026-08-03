import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { drainMarketingEmailOutbox } from "@/features/marketing/server-marketing-email-outbox";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { message: "인증되지 않은 요청입니다.", ok: false },
      { headers: noStoreHeaders, status: 401 },
    );
  }
  const result = await drainMarketingEmailOutbox({ limit: 20 });
  return NextResponse.json(result, {
    headers: noStoreHeaders,
    status: result.ok || result.locked ? 200 : 503,
  });
}

export const GET = POST;

function isAuthorized(request: Request) {
  const secret = process.env.AD_OUTBOX_CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization")?.trim();
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const provided = authorization.slice("Bearer ".length).trim();
  const expectedDigest = createHash("sha256").update(secret).digest();
  const providedDigest = createHash("sha256").update(provided).digest();
  return timingSafeEqual(expectedDigest, providedDigest);
}

const noStoreHeaders = { "cache-control": "private, no-store" };
