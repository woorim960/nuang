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
import { listPublicComparisonsForUser } from "@/features/together/server-public-comparisons";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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

  const auth = await requireAuthenticatedUser();

  if (!auth.ok) {
    return auth.response;
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return createApiClosedResponse("supabase_env_missing");
  }

  const [result, comparisonReports] = await Promise.all([
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
  ]);

  if (!result.ok) {
    return NextResponse.json(createAccountResultsFailurePayload(result.code), {
      status: 500,
    });
  }

  if (!comparisonReports.ok) {
    return NextResponse.json(
      createAccountResultsFailurePayload("account_results_read_failed"),
      { status: 500 },
    );
  }

  return NextResponse.json(
    createAccountResultsPayload(result.data, [...comparisonReports.data]),
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

  const auth = await requireAuthenticatedUser();

  if (!auth.ok) {
    return auth.response;
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
      createDeleteAccountResultFailurePayload(result.code),
      { status: 500 },
    );
  }

  return NextResponse.json(createDeleteAccountResultPayload(result.data));
}
