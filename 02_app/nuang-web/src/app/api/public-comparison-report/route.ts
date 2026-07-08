import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { publicComparisonLookupRequestSchema } from "@/features/together/public-comparison-lookup-contract";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";

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

  return createApiClosedResponse("public_comparison_lookup_pending");
}
