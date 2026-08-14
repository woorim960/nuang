import { NextResponse } from "next/server";
import {
  accountAssessmentProgressPutSchema,
  createAssessmentProgressConflictFailure,
  createAssessmentProgressDeletedFailure,
  createAssessmentProgressReadFailure,
  createAssessmentProgressValidationFailure,
  createAssessmentProgressWriteFailure,
} from "@/features/assessment/account-assessment-progress-contract";
import {
  readAccountAssessmentProgress,
  saveAccountAssessmentProgress,
} from "@/features/assessment/server-account-assessment-progress";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const privateNoStoreHeaders = {
  "cache-control": "private, no-store, max-age=0",
};

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request, {
    expectedSupabaseUserId: request.headers.get("x-nuang-auth-user-id"),
  });
  if (!auth.ok) return auth.response;
  if (request.headers.get("x-nuang-auth-user-id") !== auth.user.id) {
    return authScopeChangedResponse(auth.user.id);
  }

  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const result = await readAccountAssessmentProgress({
    client,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(createAssessmentProgressReadFailure(), {
      headers: privateNoStoreHeaders,
      status: 500,
    });
  }

  return NextResponse.json(
    {
      accountId: result.accountId,
      attempts: result.attempts,
      authUserId: auth.user.id,
      deletedLocalResultIds: result.deletedLocalResultIds,
      ok: true,
    },
    { headers: privateNoStoreHeaders },
  );
}

export async function PUT(request: Request) {
  const payload = await readValidatedJson(
    request,
    accountAssessmentProgressPutSchema,
  );

  if (!payload.ok) {
    return NextResponse.json(createAssessmentProgressValidationFailure(), {
      headers: privateNoStoreHeaders,
      status: 422,
    });
  }

  const auth = await requireAuthenticatedUser(request, {
    expectedSupabaseUserId: request.headers.get("x-nuang-auth-user-id"),
  });
  if (!auth.ok) return auth.response;
  if (request.headers.get("x-nuang-auth-user-id") !== auth.user.id) {
    return authScopeChangedResponse(auth.user.id);
  }

  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const result = await saveAccountAssessmentProgress({
    attempt: payload.data.attempt,
    client,
    expectedRevision: payload.data.expectedRevision,
    user: auth.user,
  });

  if (!result.ok) {
    if (result.code === "assessment_progress_invalid") {
      return NextResponse.json(createAssessmentProgressValidationFailure(), {
        headers: privateNoStoreHeaders,
        status: 422,
      });
    }

    if (result.code === "assessment_progress_conflict") {
      return NextResponse.json(
        {
          ...createAssessmentProgressConflictFailure(
            result.currentRevision ?? null,
          ),
          authUserId: auth.user.id,
        },
        { headers: privateNoStoreHeaders, status: 409 },
      );
    }

    if (result.code === "assessment_progress_deleted") {
      return NextResponse.json(
        {
          ...createAssessmentProgressDeletedFailure(),
          authUserId: auth.user.id,
        },
        { headers: privateNoStoreHeaders, status: 410 },
      );
    }

    return NextResponse.json(createAssessmentProgressWriteFailure(), {
      headers: privateNoStoreHeaders,
      status: 500,
    });
  }

  return NextResponse.json(
    {
      accountId: result.accountId,
      attempt: result.attempt,
      authUserId: auth.user.id,
      ok: true,
      restored: result.restored,
      revision: result.revision,
    },
    { headers: privateNoStoreHeaders },
  );
}

function authScopeChangedResponse(authUserId: string) {
  return NextResponse.json(
    { authUserId, error: "auth_scope_changed", ok: false },
    { headers: privateNoStoreHeaders, status: 409 },
  );
}
