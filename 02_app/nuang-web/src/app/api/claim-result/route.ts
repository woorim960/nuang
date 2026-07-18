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
import { createApiClosedResponse } from "@/lib/api/closed-state";
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

  const auth = await requireAuthenticatedUser();

  if (!auth.ok) {
    return auth.response;
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return createApiClosedResponse("supabase_env_missing");
  }

  const result = await readResultAccountStatus({
    client: serviceClient,
    localResultId: parsedQuery.data.localResultId,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(
      createResultAccountStatusFailurePayload(result.code),
      { status: 500 },
    );
  }

  return NextResponse.json(createResultAccountStatusPayload(result.data));
}

export async function POST(request: Request) {
  const payload = await readValidatedJson(request, claimResultRequestSchema);

  if (!payload.ok) {
    return payload.response;
  }

  const auth = await requireAuthenticatedUser();

  if (!auth.ok) {
    return auth.response;
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return createApiClosedResponse("supabase_env_missing");
  }

  const result = await claimResultToAccount({
    client: serviceClient,
    payload: payload.data,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(createClaimResultWriteFailurePayload(result.code), {
      status: claimResultWriteFailures[result.code].httpStatus,
    });
  }

  return NextResponse.json(createClaimResultWriteSuccessPayload(result.data));
}
