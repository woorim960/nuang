import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum([
    "approve_atom",
    "approve_release",
    "publish_release",
    "request_changes",
    "start_release_review",
    "pass_review",
  ]),
  atomId: z.string().min(1).optional(),
  atomVersion: z.number().int().positive().optional(),
  releaseId: z.string().min(1).max(180),
  reviewRole: z
    .enum(["psychology", "measurement", "product_safety", "plain_language"])
    .optional(),
});

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return failure("콘텐츠 조치를 확인하지 못했습니다.", 422);
  const input = parsed.data;
  if (
    ["approve_atom", "request_changes", "pass_review"].includes(input.action) &&
    (!input.atomId || !input.atomVersion)
  ) {
    return failure("검토할 콘텐츠를 확인하지 못했습니다.", 422);
  }
  if (
    ["request_changes", "pass_review"].includes(input.action) &&
    !input.reviewRole
  ) {
    return failure("검토 분야를 확인하지 못했습니다.", 422);
  }
  const result = await context.client.rpc(
    "admin_manage_trait_map_content_atomic",
    {
      target_admin_account_id: context.accountId,
      target_action: input.action,
      target_atom_id: input.atomId ?? null,
      target_atom_version: input.atomVersion ?? null,
      target_release_id: input.releaseId,
      target_review_role: input.reviewRole ?? null,
      target_reviewer_ref: context.email,
    },
  );
  if (result.error) {
    const unavailable = ["42883", "PGRST202"].includes(
      result.error.code ?? "",
    );
    return failure(
      unavailable
        ? "성향 콘텐츠 운영 기능을 준비해야 합니다. 최신 DB 마이그레이션을 확인해 주세요."
        : actionFailureMessage(input.action),
      unavailable ? 503 : 409,
    );
  }
  return NextResponse.json({ ok: true });
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}

function actionFailureMessage(action: z.infer<typeof actionSchema>["action"]) {
  if (action === "start_release_review") {
    return "초안 상태의 릴리스만 검토를 시작할 수 있습니다.";
  }
  if (action === "approve_atom") {
    return "근거 연결과 네 분야 검토가 모두 통과되어야 콘텐츠를 승인할 수 있습니다.";
  }
  if (action === "approve_release" || action === "publish_release") {
    return "5개 축·10개 세부축·32개 성향과 모든 콘텐츠 승인을 확인해 주세요.";
  }
  return "검토 상태를 저장하지 못했습니다.";
}
