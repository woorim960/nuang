import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { issuePublicProfileCodeRequestSchema } from "@/features/community/public-profile-code-api";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";

export async function POST(request: Request) {
  const payload = await readValidatedJson(
    request,
    issuePublicProfileCodeRequestSchema,
  );

  if (!payload.ok) {
    return payload.response;
  }

  const auth = await requireAuthenticatedUser();

  if (!auth.ok) {
    return auth.response;
  }

  return createApiClosedResponse("public_profile_code_issue_db_write_pending");
}
