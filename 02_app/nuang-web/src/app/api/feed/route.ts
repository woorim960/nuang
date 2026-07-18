import {
  feedWriteRequestSchema,
} from "@/features/feed/feed-contract";
import { createServerFeedReadPayload } from "@/features/feed/server-read";
import {
  createFeedWriteFailurePayload,
  createFeedWriteSuccessPayload,
  feedWriteFailures,
} from "@/features/feed/feed-write-contract";
import { writeFeedRequestForAccount } from "@/features/feed/server-writes";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  return Response.json({
    ok: true,
    result: await createServerFeedReadPayload(),
  });
}

export async function POST(request: Request) {
  const payload = await readValidatedJson(request, feedWriteRequestSchema);

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

  const result = await writeFeedRequestForAccount({
    client: serviceClient,
    payload: payload.data,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(createFeedWriteFailurePayload(result.code), {
      status: feedWriteFailures[result.code].httpStatus,
    });
  }

  return NextResponse.json(createFeedWriteSuccessPayload(result.data));
}
