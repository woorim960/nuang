import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import {
  createPublicComparisonLookupFailurePayload,
  createPublicComparisonLookupSuccessPayload,
  publicComparisonLookupFailures,
  publicComparisonLookupRequestSchema,
} from "@/features/together/public-comparison-lookup-contract";
import {
  deletePublicComparisonForUser,
  readPublicComparisonForUser,
} from "@/features/together/server-public-comparisons";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const payload = await readValidatedJson(
    request,
    publicComparisonLookupRequestSchema,
  );

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

  const result = await readPublicComparisonForUser({
    client: serviceClient,
    comparisonReportId: payload.data.comparisonReportId,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(createPublicComparisonLookupFailurePayload(result.code), {
      status: publicComparisonLookupFailures[result.code].httpStatus,
    });
  }

  return NextResponse.json(createPublicComparisonLookupSuccessPayload(result.data));
}

export async function DELETE(request: Request) {
  const payload = await readValidatedJson(
    request,
    publicComparisonLookupRequestSchema,
  );

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

  const result = await deletePublicComparisonForUser({
    client: serviceClient,
    comparisonReportId: payload.data.comparisonReportId,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(createPublicComparisonLookupFailurePayload(result.code), {
      status: publicComparisonLookupFailures[result.code].httpStatus,
    });
  }

  return NextResponse.json({
    ok: true,
    result: result.data,
  });
}
