import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import {
  getPublishedTraitMapCustomerGuide,
  getTraitMapBetaAiReleaseSummary,
} from "@/features/nuang-code/trait-map-customer-guide-registry";
import { applyTraitMapGuideTextOverrides } from "@/features/nuang-code/trait-map-guide-text-overrides";
import { reviewTraitMapGuideForBeta } from "@/features/nuang-code/trait-map-guide-review";
import {
  traitMapGuideBetaReleaseId,
  traitMapGuideReviewRoles,
} from "@/features/nuang-code/trait-map-guide-review-contract";
import { readTraitMapGuideActiveEdits } from "@/features/nuang-code/server-trait-map-guide-content";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum([
    "approve_profile",
    "approve_unit",
    "deploy_human_release",
    "hold_unit",
    "request_profile_changes",
    "request_unit_changes",
  ]),
  contentDigest: z.string().regex(/^[a-f0-9]{16}$/),
  contentHash: z
    .string()
    .regex(/^[a-f0-9]{16}$/)
    .optional(),
  expectedProfileCount: z.number().int().positive(),
  expectedReleaseUnitCount: z.number().int().positive(),
  expectedUnitCount: z.number().int().positive(),
  guideVersion: z.string().min(1).max(180),
  note: z.string().trim().max(2_000).optional().default(""),
  profileContentDigest: z.string().regex(/^[a-f0-9]{16}$/),
  profileCode: z
    .string()
    .trim()
    .regex(/^[EIRNAGKMCQ]{5}$/),
  releaseId: z.string().min(1).max(180),
  reviewRole: z.enum(traitMapGuideReviewRoles).optional(),
  unitKey: z.string().min(1).max(500).optional(),
});

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failure("검토 대상과 상태를 다시 확인해 주세요.", 422);
  }

  const input = parsed.data;
  const release = getTraitMapBetaAiReleaseSummary();
  const baseGuide = getPublishedTraitMapCustomerGuide(input.profileCode);
  const editingState = baseGuide
    ? await readTraitMapGuideActiveEdits(context.client, {
        profileCode: baseGuide.code,
        releaseId: release.releaseId,
      })
    : null;
  const guide =
    baseGuide && editingState?.available
      ? applyTraitMapGuideTextOverrides(baseGuide, editingState.edits)
      : baseGuide;
  const profileReview = guide ? reviewTraitMapGuideForBeta(guide) : null;
  if (
    input.releaseId !== traitMapGuideBetaReleaseId ||
    input.releaseId !== release.releaseId ||
    input.contentDigest !== release.contentDigest ||
    input.expectedProfileCount !== release.profileCount ||
    input.expectedReleaseUnitCount !== release.unitCount ||
    !profileReview ||
    input.profileContentDigest !== profileReview.contentDigest ||
    !guide ||
    input.guideVersion !== guide.version ||
    input.expectedUnitCount !== profileReview.unitCount
  ) {
    return failure(
      "화면을 연 뒤 성향지도 원문이 바뀌었습니다. 새로고침 후 다시 검토해 주세요.",
      409,
    );
  }

  const unitAction = [
    "approve_unit",
    "hold_unit",
    "request_unit_changes",
  ].includes(input.action);
  if (
    unitAction &&
    (!input.unitKey || !input.contentHash || !input.reviewRole)
  ) {
    return failure("검토할 문장과 전문 역할을 확인하지 못했습니다.", 422);
  }

  if (unitAction) {
    const detailed = reviewTraitMapGuideForBeta(guide, { includeUnits: true });
    const unit = detailed.units?.find(
      (candidate) => candidate.unitKey === input.unitKey,
    );
    if (!unit || unit.contentHash !== input.contentHash) {
      return failure(
        "검토 중인 문장이 바뀌었습니다. 새 원문을 다시 읽어 주세요.",
        409,
      );
    }
  }

  const result = await context.client.rpc(
    "admin_manage_trait_map_guide_review_atomic",
    {
      target_action: input.action,
      target_admin_account_id: context.accountId,
      target_payload: {
        contentDigest: release.contentDigest,
        contentHash: input.contentHash ?? null,
        expectedProfileCount: release.profileCount,
        expectedReleaseUnitCount: release.unitCount,
        expectedUnitCount: profileReview.unitCount,
        guideVersion: guide.version,
        note: input.note || null,
        profileContentDigest: profileReview.contentDigest,
        profileCode: input.profileCode,
        releaseId: release.releaseId,
        reviewRole: input.reviewRole ?? null,
        unitKey: input.unitKey ?? null,
      },
    },
  );

  if (result.error) {
    const unavailable = ["42883", "PGRST202"].includes(result.error.code ?? "");
    return failure(
      unavailable
        ? "성향지도 사람 검수 DB를 준비해야 합니다. 202608060001 마이그레이션을 먼저 적용해 주세요."
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
  if (action === "approve_profile") {
    return "이 프로필의 모든 문장을 일곱 역할에서 승인해야 최종 승인할 수 있습니다.";
  }
  if (action === "deploy_human_release") {
    return "32개 프로필의 사람 최종 승인이 모두 끝나야 MVP 검수본을 배포할 수 있습니다.";
  }
  return "원문 해시와 검토 상태를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.";
}
