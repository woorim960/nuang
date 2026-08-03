import { NextResponse } from "next/server";
import {
  exactOAuthCallbackUrl,
  isAllowedOAuthOrigin,
  signInIntentCookieName,
  signInIntentRequestSchema,
  signInIntentTtlSeconds,
} from "@/features/auth/sign-in-intent-contract";
import { createSignInIntent } from "@/features/auth/sign-in-intent-security";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const browserOrigin = request.headers.get("origin");
  if (
    !browserOrigin ||
    !isSameOriginBrowserRequest(request) ||
    browserOrigin !== requestOrigin ||
    !isAllowedOAuthOrigin(requestOrigin)
  ) {
    return failure(
      "origin_not_allowed",
      "로그인 주소를 확인하지 못했어요.",
      403,
    );
  }

  const parsed = signInIntentRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return failure(
      "intent_request_invalid",
      "로그인 방법을 확인해 주세요.",
      422,
    );
  }

  const callbackUrl = exactOAuthCallbackUrl(requestOrigin);
  if (!callbackUrl) {
    return failure(
      "callback_not_allowed",
      "로그인 주소를 확인하지 못했어요.",
      403,
    );
  }
  let created: ReturnType<typeof createSignInIntent>;
  try {
    created = createSignInIntent({
      initiatingOrigin: requestOrigin,
      provider: parsed.data.provider,
      returnPath: parsed.data.returnPath,
    });
  } catch {
    return failure(
      "intent_signing_unavailable",
      "로그인 연결을 시작하지 못했어요.",
      503,
    );
  }
  const response = NextResponse.json(
    {
      intent: {
        callbackUrl,
        expiresAt: new Date(created.payload.expiresAt).toISOString(),
        provider: created.payload.provider,
      },
      ok: true,
    },
    { headers: privateNoStoreHeaders },
  );
  response.cookies.set(signInIntentCookieName, created.token, {
    httpOnly: true,
    maxAge: signInIntentTtlSeconds,
    path: "/auth/callback",
    sameSite: "lax",
    secure: requestOrigin.startsWith("https://"),
  });
  return response;
}

function failure(code: string, message: string, status: number) {
  return NextResponse.json(
    { code, message, ok: false },
    { headers: privateNoStoreHeaders, status },
  );
}

const privateNoStoreHeaders = { "cache-control": "private, no-store" };
