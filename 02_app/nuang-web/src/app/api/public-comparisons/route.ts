import { NextResponse } from "next/server";
import { createPublicComparisonRequestSchema } from "@/features/together/api-schemas";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import {
  createPublicComparisonFailurePayload,
  publicComparisonFailures,
} from "@/features/together/public-comparison-contract";
import { createPublicComparisonForUser } from "@/features/together/server-public-comparisons";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const payload = await readValidatedJson(
    request,
    createPublicComparisonRequestSchema,
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

  const result = await createPublicComparisonForUser({
    client: serviceClient,
    targetPublicSnapshotId: payload.data.target.publicSnapshotId,
    user: auth.user,
    viewerResultReportId: payload.data.viewerResultReportId,
  });

  if (!result.ok) {
    return NextResponse.json(createPublicComparisonFailurePayload(result.code), {
      status: publicComparisonFailures[result.code].httpStatus,
    });
  }

  return NextResponse.json({
    ok: true,
    comparisonReportId: result.data.comparisonReportId,
    report: result.data.report,
  });
}
