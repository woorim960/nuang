import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import {
  getCustomerApprovedTraitMapGuide,
  getTraitMapBetaAiReleaseSummary,
} from "@/features/nuang-code/trait-map-customer-guide-registry";
import { applyTraitMapGuideTextOverrides } from "@/features/nuang-code/trait-map-guide-text-overrides";
import {
  createTraitMapGuideReviewUnits,
  reviewTraitMapGuideForBeta,
} from "@/features/nuang-code/trait-map-guide-review";
import { traitMapGuideBetaReleaseId } from "@/features/nuang-code/trait-map-guide-review-contract";
import { readTraitMapGuideActiveEdits } from "@/features/nuang-code/server-trait-map-guide-content";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

const editSchema = z.object({
  expectedContentHash: z.string().regex(/^[a-f0-9]{16}$/),
  profileCode: z
    .string()
    .trim()
    .regex(/^[EIRNAGKMCQ]{5}$/),
  releaseId: z.string().min(1).max(180),
  text: z.string().trim().min(2).max(2_000),
  unitKey: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);

  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failure("수정할 문장과 내용을 다시 확인해 주세요.", 422);
  }

  const input = parsed.data;
  const release = getTraitMapBetaAiReleaseSummary();
  const baseGuide = getCustomerApprovedTraitMapGuide(input.profileCode);
  if (
    !baseGuide ||
    input.releaseId !== traitMapGuideBetaReleaseId ||
    input.releaseId !== release.releaseId
  ) {
    return failure("현재 베타 성향지도 릴리스를 찾지 못했습니다.", 409);
  }

  const editingState = await readTraitMapGuideActiveEdits(context.client, {
    profileCode: baseGuide.code,
    releaseId: release.releaseId,
  });
  if (!editingState.available) {
    return failure(
      "인라인 편집 DB를 준비해야 합니다. 202608060001과 202608060002 마이그레이션을 순서대로 적용해 주세요.",
      503,
    );
  }

  let currentGuide;
  try {
    currentGuide = applyTraitMapGuideTextOverrides(
      baseGuide,
      editingState.edits,
    );
  } catch {
    return failure(
      "저장된 수정본을 현재 원고에 안전하게 연결하지 못했습니다. 운영 기록을 확인해 주세요.",
      409,
    );
  }

  const currentUnit = createTraitMapGuideReviewUnits(currentGuide).find(
    (unit) => unit.unitKey === input.unitKey,
  );
  if (!currentUnit || currentUnit.contentHash !== input.expectedContentHash) {
    return failure(
      "다른 화면에서 문장이 먼저 수정됐습니다. 새로고침 후 최신 문장을 다시 편집해 주세요.",
      409,
    );
  }

  const normalizedText = input.text
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
  if (normalizedText === currentUnit.text) {
    return failure("바뀐 내용이 없습니다.", 422);
  }

  let candidateGuide;
  try {
    candidateGuide = applyTraitMapGuideTextOverrides(currentGuide, [
      { text: normalizedText, unitKey: input.unitKey },
    ]);
  } catch (error) {
    return failure(editContractMessage(error), 422);
  }

  const candidateReview = reviewTraitMapGuideForBeta(candidateGuide, {
    includeUnits: true,
  });
  const candidateUnit = candidateReview.units?.find(
    (unit) => unit.unitKey === input.unitKey,
  );
  if (!candidateUnit) {
    return failure(
      "수정 후 문장 위치가 달라졌습니다. 한 번에 한 문장만 수정해 주세요.",
      422,
    );
  }
  const blockedDecisions = candidateUnit.reviewDecisions.filter(
    (decision) => decision.decision !== "approve",
  );
  if (!candidateReview.approved || blockedDecisions.length > 0) {
    return NextResponse.json(
      {
        issues: blockedDecisions.flatMap((decision) =>
          decision.issueCodes.map((code) => ({
            code,
            rationale: decision.rationale,
            role: decision.role,
          })),
        ),
        message:
          "수정 문장이 베타 안전 기준을 통과하지 못했습니다. 아래 검토 이유를 반영한 뒤 다시 저장해 주세요.",
        ok: false,
      },
      { status: 422 },
    );
  }

  const rpcResult = await context.client.rpc(
    "admin_publish_trait_map_guide_edit_atomic",
    {
      target_admin_account_id: context.accountId,
      target_payload: {
        aiReviewSummary: {
          approved: true,
          decisions: candidateUnit.reviewDecisions.map((decision) => ({
            issueCodes: decision.issueCodes,
            role: decision.role,
            score: decision.score,
          })),
        },
        contentHash: candidateUnit.contentHash,
        expectedProfileCount: release.profileCount,
        expectedProfileUnitCount: candidateReview.unitCount,
        expectedReleaseUnitCount: release.unitCount,
        guideVersion: candidateGuide.version,
        previousContentHash: currentUnit.contentHash,
        profileCode: candidateGuide.code,
        profileContentDigest: candidateReview.contentDigest,
        releaseContentDigest: release.contentDigest,
        releaseId: release.releaseId,
        text: candidateUnit.text,
        unitKey: candidateUnit.unitKey,
      },
    },
  );

  if (rpcResult.error) {
    const unavailable = ["42883", "PGRST202"].includes(
      rpcResult.error.code ?? "",
    );
    return failure(
      unavailable
        ? "인라인 편집 DB를 준비해야 합니다. 202608060002 마이그레이션을 적용해 주세요."
        : "수정본을 저장하지 못했습니다. 최신 문장을 확인한 뒤 다시 시도해 주세요.",
      unavailable ? 503 : 409,
    );
  }

  revalidatePath(`/map/${candidateGuide.code}`);
  revalidatePath("/admin/content/trait-map");
  return NextResponse.json({
    appliedToBeta: true,
    contentHash: candidateUnit.contentHash,
    invalidatedHumanReviewRoles: 7,
    message: "저장했고 뉴앙 베타 성향지도에 바로 반영했습니다.",
    ok: true,
    profileContentDigest: candidateReview.contentDigest,
    text: candidateUnit.text,
  });
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}

function editContractMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "TRAIT_MAP_GUIDE_SINGLE_SENTENCE_REQUIRED") {
      return "본문은 한 번에 한 문장씩 수정해 주세요. 문장을 추가하거나 나누는 편집은 다음 문장 블록에서 따로 진행할 수 있어요.";
    }
    if (error.message.includes("too_small")) {
      return "해당 화면에서 뜻이 충분히 전달되도록 문장을 조금 더 구체적으로 적어 주세요.";
    }
  }
  return "현재 화면의 문장 길이와 구조에 맞지 않습니다. 내용을 다듬어 다시 저장해 주세요.";
}
