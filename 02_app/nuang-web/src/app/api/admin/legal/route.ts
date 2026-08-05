import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { legalReviewStatuses } from "@/features/admin/legal-review-contract";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum([
    "approve_release",
    "reopen",
    "request_changes",
    "start_review",
    "update_item",
    "update_release",
  ]),
  itemKey: z.string().trim().min(3).max(120).optional(),
  payload: z
    .object({
      approvalConfirmed: z.boolean().optional(),
      approvalEvidenceRef: z.string().trim().max(500).optional(),
      approvedByLabel: z.string().trim().max(160).optional(),
      changeSummary: z.string().trim().max(2000).optional(),
      evidenceRef: z.string().trim().max(500).optional(),
      note: z.string().trim().max(1500).optional(),
      ownerLabel: z.string().trim().max(120).optional(),
      reviewerLabel: z.string().trim().max(160).optional(),
      sourceCommitSha: z.string().trim().max(80).optional(),
      status: z.enum(legalReviewStatuses).optional(),
    })
    .default({}),
  releaseId: z.string().uuid(),
});

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failure("법률 검토 조치의 입력값을 확인해 주세요.", 422);
  }
  const input = parsed.data;
  if (input.action === "update_item" && !input.itemKey) {
    return failure("저장할 검토 항목을 확인하지 못했습니다.", 422);
  }
  if (input.action === "update_item" && !input.payload.status) {
    return failure("검토 항목의 상태를 선택해 주세요.", 422);
  }

  const result = await context.client.rpc("admin_manage_legal_review", {
    target_action: input.action,
    target_admin_account_id: context.accountId,
    target_item_key: input.itemKey ?? null,
    target_payload: input.payload,
    target_release_id: input.releaseId,
  });
  if (result.error) {
    const unavailable = ["42883", "PGRST202"].includes(result.error.code ?? "");
    return failure(
      unavailable
        ? "법률 검토 저장 기능을 준비해야 합니다. 최신 DB 마이그레이션을 적용해 주세요."
        : legalActionFailure(result.error.message),
      unavailable ? 503 : 409,
    );
  }

  return NextResponse.json({ ok: true });
}

function legalActionFailure(message: string) {
  if (message.includes("approved_legal_item_evidence_required")) {
    return "검토 완료 항목에는 외부 검토 의견이나 내부 증빙의 보관 위치가 필요합니다.";
  }
  if (message.includes("not_applicable_legal_item_note_required")) {
    return "해당 없음으로 처리한 이유를 메모에 남겨 주세요.";
  }
  if (message.includes("legal_review_items_not_ready")) {
    return "모든 항목을 자문 전달 준비·검토 완료·해당 없음 중 하나로 정리한 뒤 외부 검토를 시작하세요.";
  }
  if (message.includes("legal_review_metadata_required")) {
    return "내부 책임자, 외부 검토자와 검토할 코드 버전을 먼저 저장해 주세요.";
  }
  if (message.includes("legal_review_items_not_approved")) {
    return "모든 항목의 외부 검토 결과를 검토 완료 또는 해당 없음으로 정리해야 최종 승인할 수 있습니다.";
  }
  if (
    message.includes("legal_approval_evidence_required") ||
    message.includes("legal_approval_attestation_required")
  ) {
    return "외부 승인자와 승인 증빙을 기록하고 최종 승인 확인란을 선택해 주세요.";
  }
  if (message.includes("locked_legal_release")) {
    return "승인된 버전은 바로 수정할 수 없습니다. 변경 검토로 다시 연 뒤 새 증빙을 남겨 주세요.";
  }
  return "법률 검토 상태를 저장하지 못했습니다. 현재 단계와 필수 입력을 다시 확인해 주세요.";
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}
