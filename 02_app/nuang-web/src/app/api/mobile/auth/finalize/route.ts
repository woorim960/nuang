import { z } from "zod";
import { NextResponse } from "next/server";
import {
  ensureAccountForUser,
  persistAccountConsent,
} from "@/features/account/server-writes";
import { ensureCommunityProfile } from "@/features/account/server-community-profile";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { consentDraftSchema } from "@/features/consent/consent-draft";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const requestSchema = z.object({
  consent: consentDraftSchema,
  provider: z.enum(["google", "kakao"]),
});

export async function POST(request: Request) {
  const payload = await readValidatedJson(request, requestSchema, {
    maxBytes: 8 * 1024,
  });
  if (!payload.ok) return payload.response;

  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return auth.response;
  if (!matchesProvider(auth.user, payload.data.provider)) {
    return failure(
      "provider_mismatch",
      "시작한 로그인 방법과 완료된 계정을 확인하지 못했어요.",
      403,
    );
  }

  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) {
    return failure(
      "identity_service_unavailable",
      "계정 연결을 마치지 못했어요.",
      503,
    );
  }

  const account = await ensureAccountForUser(serviceClient, auth.user, {
    auditEvent: true,
  });
  if (!account.ok) {
    const status = account.code === "account_conflict" ? 409 : 403;
    return failure(account.code, "계정 연결 상태를 확인해 주세요.", status);
  }

  const consent = await persistAccountConsent(
    serviceClient,
    account.accountId,
    payload.data.consent,
  );
  if (!consent.ok) {
    return failure(
      "consent_write_failed",
      "동의 내용을 저장하지 못했어요. 다시 시도해 주세요.",
      503,
    );
  }

  try {
    await ensureCommunityProfile({ client: serviceClient, user: auth.user });
  } catch {
    // Profile bootstrap is retryable and must not invalidate a valid account.
  }

  return NextResponse.json(
    { accountId: account.accountId, ok: true },
    { headers: privateNoStoreHeaders },
  );
}

function matchesProvider(
  user: { identities?: Array<{ provider?: string }> | null },
  provider: "google" | "kakao",
) {
  return Boolean(
    user.identities?.some((identity) => identity.provider === provider),
  );
}

function failure(code: string, message: string, status: number) {
  return NextResponse.json(
    { code, message, ok: false },
    { headers: privateNoStoreHeaders, status },
  );
}

const privateNoStoreHeaders = { "cache-control": "private, no-store" };
