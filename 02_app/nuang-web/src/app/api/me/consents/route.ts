import { NextResponse } from "next/server";
import { ensureAccountForUser } from "@/features/account/server-writes";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import {
  type OptionalConsentPreferences,
  optionalConsentPreferenceWriteSchema,
} from "@/features/consent/optional-consent-contract";
import {
  readOptionalConsentPreferences,
  saveOptionalConsentPreference,
} from "@/features/consent/server-optional-consent";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  const context = await getConsentContext();
  if (!context.ok) return context.response;

  const preferences = await readOptionalConsentPreferences({
    accountId: context.accountId,
    client: context.client,
  });
  if (!preferences.ok) {
    return failure(
      "preference_read_failed",
      "동의 설정을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      503,
    );
  }

  return success(preferences.data);
}

export async function PATCH(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("cross_site_request", "요청을 확인하지 못했어요.", 403);
  }

  const payload = await readValidatedJson(
    request,
    optionalConsentPreferenceWriteSchema,
  );
  if (!payload.ok) return payload.response;

  const context = await getConsentContext();
  if (!context.ok) return context.response;

  const preferences = await saveOptionalConsentPreference({
    accountId: context.accountId,
    client: context.client,
    enabled: payload.data.enabled,
    preference: payload.data.preference,
    source: "my_settings",
  });
  if (!preferences.ok) {
    return failure(
      "preference_write_failed",
      "동의 설정을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      503,
    );
  }

  return success(preferences.data);
}

async function getConsentContext() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth;

  const client = createSupabaseServiceClient();
  if (!client) {
    return {
      ok: false as const,
      response: createApiClosedResponse("supabase_env_missing"),
    };
  }

  const account = await ensureAccountForUser(client, auth.user);
  if (!account.ok) {
    return {
      ok: false as const,
      response: failure(
        "account_unavailable",
        "계정 정보를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        503,
      ),
    };
  }

  return {
    accountId: account.accountId,
    client,
    ok: true as const,
  };
}

function success(preferences: OptionalConsentPreferences) {
  return NextResponse.json(
    { ok: true, preferences },
    { headers: { "cache-control": "private, no-store" } },
  );
}

function failure(code: string, message: string, status: number) {
  return NextResponse.json(
    { code, message, ok: false },
    {
      headers: { "cache-control": "private, no-store" },
      status,
    },
  );
}
