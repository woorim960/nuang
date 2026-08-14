import { NextResponse } from "next/server";
import {
  accountResultsQuerySchema,
  createAccountResultsFailurePayload,
  createAccountResultsPayload,
  createDeleteAccountResultFailurePayload,
  createDeleteAccountResultPayload,
  deleteAccountResultRequestSchema,
} from "@/features/account/account-result-contract";
import { readAccountResults } from "@/features/account/server-reads";
import { deleteResultForAccount } from "@/features/account/server-writes";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { rebuildAccountTraitProfile } from "@/features/assessment/server-account-trait-profile";
import { listPublicComparisonsForUser } from "@/features/together/server-public-comparisons";
import {
  apiClosedStates,
  createApiClosedPayload,
  createApiClosedResponse,
} from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const privateNoStoreHeaders = {
  "cache-control": "private, no-store, max-age=0",
};

export async function GET(request: Request) {
  const resultReportId =
    new URL(request.url).searchParams.get("resultReportId") ?? undefined;
  const parsedQuery = accountResultsQuerySchema.safeParse({ resultReportId });

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

  const expectedSupabaseUserId = request.headers.get("x-nuang-auth-user-id");
  const auth = await requireAuthenticatedUser(request, {
    expectedSupabaseUserId,
  });

  if (!auth.ok) {
    return auth.response;
  }
  if (expectedSupabaseUserId !== auth.user.id) {
    return NextResponse.json(
      {
        authUserId: auth.user.id,
        error: "auth_scope_changed",
        message:
          "로그인 계정이 변경되어 요청을 중단했어요. 다시 시도해 주세요.",
        ok: false,
      },
      { headers: privateNoStoreHeaders, status: 409 },
    );
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return NextResponse.json(
      {
        ...createApiClosedPayload("supabase_env_missing"),
        authUserId: auth.user.id,
      },
      {
        headers: privateNoStoreHeaders,
        status: apiClosedStates.supabase_env_missing.httpStatus,
      },
    );
  }

  let accountResponse;
  try {
    accountResponse = await serviceClient
      .schema("identity")
      .from("auth_identity")
      .select("account_id")
      .eq("supabase_user_id", auth.user.id)
      .is("revoked_at", null)
      .order("provider_linked_at", { ascending: true })
      .limit(1)
      .maybeSingle();
  } catch {
    return createScopedReadFailure(auth.user.id);
  }

  if (accountResponse.error) {
    return createScopedReadFailure(auth.user.id);
  }

  const accountId = accountResponse.data
    ? (accountResponse.data as { account_id: string }).account_id
    : null;
  let accountRead;
  try {
    accountRead = await Promise.all([
      readAccountResults({
        client: serviceClient,
        resultReportId: parsedQuery.data.resultReportId,
        user: auth.user,
      }),
      parsedQuery.data.resultReportId
        ? Promise.resolve({ data: [], ok: true } as const)
        : listPublicComparisonsForUser({
            client: serviceClient,
            user: auth.user,
          }),
      accountId && !parsedQuery.data.resultReportId
        ? rebuildAccountTraitProfile({ accountId, client: serviceClient })
        : Promise.resolve(null),
    ]);
  } catch {
    return createScopedReadFailure(auth.user.id);
  }
  const [result, comparisonReports, currentTraitProfile] = accountRead;

  if (!result.ok) {
    return createScopedReadFailure(auth.user.id, result.code);
  }

  if (!comparisonReports.ok) {
    return createScopedReadFailure(auth.user.id);
  }

  return NextResponse.json(
    {
      ...createAccountResultsPayload(
        result.data,
        [...comparisonReports.data],
        currentTraitProfile,
      ),
      authUserId: auth.user.id,
    },
    { headers: privateNoStoreHeaders },
  );
}

function createScopedReadFailure(
  authUserId: string,
  code: Parameters<
    typeof createAccountResultsFailurePayload
  >[0] = "account_results_read_failed",
) {
  return NextResponse.json(
    {
      ...createAccountResultsFailurePayload(code),
      authUserId,
    },
    { headers: privateNoStoreHeaders, status: 500 },
  );
}

export async function DELETE(request: Request) {
  const parsedBody = deleteAccountResultRequestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "validation_error",
        issues: parsedBody.error.issues.map((issue) => ({
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
  if (request.headers.get("x-nuang-auth-user-id") !== auth.user.id) {
    return NextResponse.json(
      {
        authUserId: auth.user.id,
        error: "auth_scope_changed",
        message:
          "로그인 계정이 변경되어 요청을 중단했어요. 다시 시도해 주세요.",
        ok: false,
      },
      { headers: privateNoStoreHeaders, status: 409 },
    );
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return createApiClosedResponse("supabase_env_missing");
  }

  const result = await deleteResultForAccount({
    client: serviceClient,
    payload: parsedBody.data,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ...createDeleteAccountResultFailurePayload(result.code),
        authUserId: auth.user.id,
      },
      { headers: privateNoStoreHeaders, status: 500 },
    );
  }

  return NextResponse.json(
    {
      ...createDeleteAccountResultPayload(result.data),
      authUserId: auth.user.id,
    },
    { headers: privateNoStoreHeaders },
  );
}
