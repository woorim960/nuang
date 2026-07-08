import { publicProfileResolveRequestSchema } from "@/features/community/public-profile-resolver-contract";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";

export async function POST(request: Request) {
  const payload = await readValidatedJson(
    request,
    publicProfileResolveRequestSchema,
  );

  if (!payload.ok) {
    return payload.response;
  }

  return createApiClosedResponse("public_profile_resolver_lookup_pending");
}
