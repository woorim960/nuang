import { revokeShareLinkRequestSchema } from "@/features/account/api-schemas";
import {
  createRevokeShareLinkSuccessPayload,
  createShareLinkFailurePayload,
  shareLinkFailures,
} from "@/features/account/share-link-contract";
import { revokeShareLinkForAccount } from "@/features/account/server-writes";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await readValidatedJson(request, revokeShareLinkRequestSchema);

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

  const result = await revokeShareLinkForAccount({
    client: serviceClient,
    payload: payload.data,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(createShareLinkFailurePayload(result.code), {
      status: shareLinkFailures[result.code].httpStatus,
    });
  }

  return NextResponse.json(createRevokeShareLinkSuccessPayload(result.data));
}
