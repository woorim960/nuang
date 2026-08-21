import { NextResponse } from "next/server";
import { profileFollowRequestSchema } from "@/features/feed/community-social-contract";
import { writeProfileFollow } from "@/features/feed/server-community-social";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { readValidatedJson } from "@/lib/api/request";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return NextResponse.json(
      { message: "요청 출처를 확인하지 못했어요.", ok: false },
      { status: 403 },
    );
  }

  const payload = await readValidatedJson(request, profileFollowRequestSchema);
  if (!payload.ok) return payload.response;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const result = await writeProfileFollow({
    action: payload.data.action,
    client,
    ...(payload.data.communityProfileId
      ? { communityProfileId: payload.data.communityProfileId }
      : {}),
    publicSnapshotId: payload.data.publicSnapshotId,
    user: auth.user,
  });

  if (!result.ok) {
    const status = result.code === "profile_not_found" ? 404 : 409;
    return NextResponse.json(
      {
        code: result.code,
        message:
          result.code === "cannot_follow_self"
            ? "내 프로필은 팔로우할 수 없어요."
            : result.code === "profile_not_found"
              ? "공개 프로필을 찾을 수 없어요."
              : result.code === "profile_action_unavailable"
                ? "이 일반 프로필에서는 아직 팔로우 기능을 사용할 수 없어요."
                : "팔로우 상태를 저장하지 못했어요.",
        ok: false,
      },
      { status },
    );
  }

  return NextResponse.json({ ok: true, ...result.data });
}
