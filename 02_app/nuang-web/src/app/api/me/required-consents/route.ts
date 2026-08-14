import { NextResponse } from "next/server";
import {
  ensureAccountForUser,
  persistAccountConsent,
} from "@/features/account/server-writes";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { requiredConsentRenewalSchema } from "@/features/consent/required-consent-contract";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("cross_site_request", "요청을 확인하지 못했어요.", 403);
  }

  const payload = await readValidatedJson(
    request,
    requiredConsentRenewalSchema,
    { maxBytes: 4 * 1024 },
  );
  if (!payload.ok) return payload.response;

  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return auth.response;

  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const account = await ensureAccountForUser(client, auth.user);
  if (!account.ok) {
    return failure(
      "account_unavailable",
      "계정 정보를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      account.code === "account_conflict" ? 409 : 503,
    );
  }

  const persisted = await persistAccountConsent(client, account.accountId, {
    analytics: false,
    is14OrOlder: payload.data.is14OrOlder,
    marketing: false,
    privacy: payload.data.privacy,
    terms: payload.data.terms,
  });
  if (!persisted.ok) {
    return failure(
      "required_consent_write_failed",
      "필수 동의를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      503,
    );
  }

  return NextResponse.json(
    { accountId: account.accountId, ok: true },
    { headers: privateNoStoreHeaders },
  );
}

function failure(code: string, message: string, status: number) {
  return NextResponse.json(
    { code, message, ok: false },
    { headers: privateNoStoreHeaders, status },
  );
}

const privateNoStoreHeaders = { "cache-control": "private, no-store" };
