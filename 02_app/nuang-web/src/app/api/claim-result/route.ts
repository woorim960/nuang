import {
  claimResultRequestSchema,
  resultAccountStatusQuerySchema,
} from "@/features/account/api-schemas";
import {
  claimResultWriteFailures,
  createClaimResultWriteFailurePayload,
  createClaimResultWriteSuccessPayload,
} from "@/features/account/claim-write-contract";
import {
  createResultAccountStatusFailurePayload,
  createResultAccountStatusPayload,
} from "@/features/account/result-account-status";
import { readResultAccountStatus } from "@/features/account/server-reads";
import { claimResultToAccount } from "@/features/account/server-writes";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import {
  apiClosedStates,
  createApiClosedPayload,
} from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const parsedQuery = resultAccountStatusQuerySchema.safeParse({
    localResultId: new URL(request.url).searchParams.get("localResultId"),
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "validation_error",
        issues: parsedQuery.error.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          path: issue.path,
        })),
      },
      { status: 422 },
    );
  }

  const auth = await requireAuthenticatedUser(request, {
    expectedSupabaseUserId: request.headers.get("x-nuang-auth-user-id"),
  });

  if (!auth.ok) {
    return auth.response;
  }
  if (!hasMatchingRequestAuthScope(request, auth.user.id)) {
    return createAuthScopeChangedResponse(auth.user.id);
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return createAuthenticatedApiClosedResponse(auth.user.id);
  }

  const result = await readResultAccountStatus({
    client: serviceClient,
    localResultId: parsedQuery.data.localResultId,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(
      createResultAccountStatusFailurePayload(result.code, auth.user.id),
      { status: 500 },
    );
  }

  return NextResponse.json(
    createResultAccountStatusPayload(result.data, auth.user.id),
  );
}

export async function POST(request: Request) {
  const payload = await readValidatedJson(request, claimResultRequestSchema);

  if (!payload.ok) {
    return payload.response;
  }

  const auth = await requireAuthenticatedUser(request, {
    expectedSupabaseUserId: request.headers.get("x-nuang-auth-user-id"),
  });

  if (!auth.ok) {
    return auth.response;
  }
  if (!hasMatchingRequestAuthScope(request, auth.user.id)) {
    return createAuthScopeChangedResponse(auth.user.id);
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return createAuthenticatedApiClosedResponse(auth.user.id);
  }

  const result = await claimResultToAccount({
    client: serviceClient,
    payload: payload.data,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ...createClaimResultWriteFailurePayload(result.code),
        authUserId: auth.user.id,
      },
      {
        status: claimResultWriteFailures[result.code].httpStatus,
      },
    );
  }

  return NextResponse.json({
    ...createClaimResultWriteSuccessPayload(result.data),
    authUserId: auth.user.id,
  });
}

function createAuthenticatedApiClosedResponse(authUserId: string) {
  return NextResponse.json(
    {
      ...createApiClosedPayload("supabase_env_missing"),
      authUserId,
    },
    { status: apiClosedStates.supabase_env_missing.httpStatus },
  );
}

function hasMatchingRequestAuthScope(request: Request, authUserId: string) {
  return request.headers.get("x-nuang-auth-user-id") === authUserId;
}

function createAuthScopeChangedResponse(authUserId: string) {
  return NextResponse.json(
    {
      authUserId,
      error: "auth_scope_changed",
      message: "로그인 계정이 변경되어 요청을 중단했어요. 다시 시도해 주세요.",
      ok: false,
    },
    {
      headers: { "cache-control": "private, no-store" },
      status: 409,
    },
  );
}
