import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { profileSafetyActionRequestSchema } from "@/features/feed/community-social-contract";
import { writeProfileSafetyAction } from "@/features/feed/server-community-social";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return NextResponse.json(
      { message: "요청 출처를 확인하지 못했어요.", ok: false },
      { status: 403 },
    );
  }

  const payload = await readValidatedJson(
    request,
    profileSafetyActionRequestSchema,
  );
  if (!payload.ok) return payload.response;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const result = await writeProfileSafetyAction({
    ...payload.data,
    client,
    user: auth.user,
  });

  if (!result.ok) {
    const status =
      result.code === "profile_not_found"
        ? 404
        : result.code === "profile_report_rate_limited"
          ? 429
          : 409;
    return NextResponse.json(
      {
        code: result.code,
        message: getSafetyActionErrorMessage(result.code),
        ok: false,
      },
      { status },
    );
  }

  return NextResponse.json({ ok: true, ...result.data });
}

function getSafetyActionErrorMessage(code: string) {
  if (code === "cannot_target_self") {
    return "내 프로필에는 이 작업을 할 수 없어요.";
  }
  if (code === "profile_not_found") {
    return "공개 프로필을 찾을 수 없어요.";
  }
  if (code === "report_reason_required") {
    return "신고 사유를 선택해 주세요.";
  }
  if (code === "profile_report_rate_limited") {
    return "짧은 시간에 신고가 많았어요. 잠시 뒤 다시 시도해 주세요.";
  }
  if (code === "profile_already_reported") {
    return "이미 신고한 프로필이에요. 운영팀에서 확인하고 있어요.";
  }
  return "요청을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}
