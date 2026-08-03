import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAccountForUser } from "@/features/account/server-writes";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import {
  readAccountOnboardingState,
  saveAccountOnboardingState,
  type AccountOnboardingState,
} from "@/features/onboarding/server-onboarding";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const onboardingStateWriteSchema = z.object({
  state: z.enum(["seen", "completed"]),
});

const emptyState: AccountOnboardingState = {
  completedAt: null,
  firstSeenAt: null,
  guideVersion: 0,
  seen: false,
};

export async function GET() {
  const context = await getOnboardingContext();
  if (!context.ok) {
    return context.unauthenticated
      ? success(emptyState, false)
      : context.response;
  }

  const state = await readAccountOnboardingState(context);
  if (!state.ok) {
    return failure(
      "onboarding_state_read_failed",
      "첫 이용 상태를 확인하지 못했어요.",
      503,
    );
  }

  return success(state.data, true);
}

export async function PATCH(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("cross_site_request", "요청을 확인하지 못했어요.", 403);
  }

  const payload = await readValidatedJson(request, onboardingStateWriteSchema);
  if (!payload.ok) return payload.response;

  const context = await getOnboardingContext();
  if (!context.ok) {
    return context.unauthenticated
      ? success(emptyState, false)
      : context.response;
  }

  const state = await saveAccountOnboardingState({
    accountId: context.accountId,
    client: context.client,
    state: payload.data.state,
  });
  if (!state.ok) {
    return failure(
      "onboarding_state_write_failed",
      "첫 이용 상태를 저장하지 못했어요.",
      503,
    );
  }

  return success(state.data, true);
}

async function getOnboardingContext() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return { ok: false as const, unauthenticated: true as const };
  }

  const client = createSupabaseServiceClient();
  if (!client) {
    return {
      ok: false as const,
      response: createApiClosedResponse("supabase_env_missing"),
      unauthenticated: false as const,
    };
  }

  const account = await ensureAccountForUser(client, auth.user);
  if (!account.ok) {
    return {
      ok: false as const,
      response: failure(
        "account_unavailable",
        "계정 정보를 확인하지 못했어요.",
        503,
      ),
      unauthenticated: false as const,
    };
  }

  return {
    accountId: account.accountId,
    client,
    ok: true as const,
  };
}

function success(state: AccountOnboardingState, authenticated: boolean) {
  return NextResponse.json(
    { authenticated, ok: true, state },
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
