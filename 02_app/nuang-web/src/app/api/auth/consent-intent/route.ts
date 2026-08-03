import { NextResponse } from "next/server";
import {
  consentDraftSchema,
  consentIntentCookieName,
} from "@/features/consent/consent-draft";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return NextResponse.json(
      { error: "cross_site_request", message: "요청을 확인하지 못했어요." },
      {
        headers: { "cache-control": "private, no-store" },
        status: 403,
      },
    );
  }

  const payload = await readValidatedJson(request, consentDraftSchema);

  if (!payload.ok) {
    return payload.response;
  }

  const response = NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
  response.cookies.set({
    httpOnly: true,
    maxAge: 10 * 60,
    name: consentIntentCookieName,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: encodeURIComponent(JSON.stringify(payload.data)),
  });
  return response;
}
