import { claimResultRequestSchema } from "@/features/account/api-schemas";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";

export async function POST(request: Request) {
  const payload = await readValidatedJson(request, claimResultRequestSchema);

  if (!payload.ok) {
    return payload.response;
  }

  const auth = await requireAuthenticatedUser();

  if (!auth.ok) {
    return auth.response;
  }

  return createApiClosedResponse("result_claim_db_write_pending");
}
