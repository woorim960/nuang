import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import {
  assessmentStudioActionSchema,
  assessmentStudioReorderSchema,
  assessmentStudioWriteSchema,
} from "@/features/admin/assessment-studio-contract";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { getBuiltinAssessmentStudioEntries } from "@/features/admin/assessment-studio-sources";
import {
  hasAssessmentStudioBlockers,
  validateAssessmentStudioDocument,
} from "@/features/admin/assessment-studio-validation";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { readAdminAssessmentStudioDashboard } from "@/features/admin/server-admin-assessment-studio";

export const runtime = "nodejs";

const runtimeAssessmentCatalogTag = "runtime-assessment-catalog";
const publicBalancePacksTag = "public-balance-packs";

export async function GET() {
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const dashboard = await readAdminAssessmentStudioDashboard(context.client);
  return NextResponse.json({ dashboard, ok: true });
}

export async function PUT(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(request, assessmentStudioWriteSchema);
  if (!payload.ok) {
    return failure("검사 기본 정보와 문항 데이터 형식을 확인해 주세요.", 422);
  }
  const value = payload.data;
  const issues = validateAssessmentStudioDocument(value.document);
  if (
    value.sourceOrigin === "builtin" &&
    value.entryId === null &&
    !getBuiltinAssessmentStudioEntries().some(
      (entry) => entry.sourceKey === `${value.document.category}:${value.document.slug}`,
    )
  ) {
    return failure("기본 제공 검사로 등록할 수 없는 항목입니다.", 422);
  }

  const response = await context.client.rpc("admin_upsert_assessment_content", {
    target_admin_account_id: context.accountId,
    target_category: value.document.category,
    target_display_order: value.displayOrder,
    target_document: value.document,
    target_entry_id: value.entryId,
    target_expected_revision: value.expectedRevision,
    target_slug: value.document.slug,
    target_source_origin: value.sourceOrigin,
    target_subtype: value.document.subtype,
    target_summary: value.document.description,
    target_title: value.document.title,
  });
  if (response.error) return databaseFailure(response.error.message, response.error.code);

  revalidateRuntimeAssessmentContent();
  return NextResponse.json({ data: response.data, issues, ok: true });
}

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(request, assessmentStudioActionSchema);
  if (!payload.ok) return failure("작업 사유를 5자 이상 입력해 주세요.", 422);
  const value = payload.data;

  if (value.action === "rollback") {
    const response = await context.client.rpc(
      "admin_rollback_assessment_content",
      {
        target_admin_account_id: context.accountId,
        target_entry_id: value.entryId,
        target_note: value.note,
        target_release_id: value.releaseId,
      },
    );
    if (response.error) {
      return databaseFailure(response.error.message, response.error.code, 409);
    }
    revalidateRuntimeAssessmentContent();
    return NextResponse.json({ data: response.data, ok: true });
  }

  if (value.action === "submit_review" || value.action === "publish") {
    const current = await context.client
      .from("assessment_content_entry")
      .select("document")
      .eq("id", value.entryId)
      .maybeSingle();
    if (current.error || !current.data) {
      return failure("검사 작업본을 찾지 못했습니다.", 404);
    }
    const issues = validateAssessmentStudioDocument(current.data.document);
    if (hasAssessmentStudioBlockers(issues)) {
      return NextResponse.json(
        {
          issues,
          message: "발행 차단 항목을 먼저 해결해 주세요.",
          ok: false,
        },
        { status: 409 },
      );
    }
  }

  const response = await context.client.rpc("admin_manage_assessment_content", {
    target_action: value.action,
    target_admin_account_id: context.accountId,
    target_entry_id: value.entryId,
    target_note: value.note,
  });
  if (response.error) {
    return databaseFailure(response.error.message, response.error.code, 409);
  }
  revalidateRuntimeAssessmentContent();
  return NextResponse.json({ data: response.data, ok: true });
}

export async function PATCH(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(request, assessmentStudioReorderSchema);
  if (!payload.ok) return failure("정렬할 검사와 변경 사유를 확인해 주세요.", 422);
  const response = await context.client.rpc("admin_reorder_assessment_content", {
    target_admin_account_id: context.accountId,
    target_ordered_entry_ids: payload.data.entryIds,
    target_reason: payload.data.reason,
  });
  if (response.error) {
    return databaseFailure(response.error.message, response.error.code, 409);
  }
  revalidateRuntimeAssessmentContent();
  return NextResponse.json({ data: response.data, ok: true });
}

function revalidateRuntimeAssessmentContent() {
  revalidateTag(runtimeAssessmentCatalogTag, { expire: 0 });
  revalidateTag(publicBalancePacksTag, { expire: 0 });
}

function databaseFailure(message: string, code?: string, fallback = 503) {
  const missing = ["42P01", "42883", "PGRST202", "PGRST204", "PGRST205"].includes(
    code ?? "",
  );
  if (missing) return failure("검사 스튜디오 데이터베이스를 먼저 연결해 주세요.", 503);
  if (message.includes("revision_conflict")) {
    return failure("다른 운영자가 먼저 수정했습니다. 새로고침 후 다시 반영해 주세요.", 409);
  }
  if (message.includes("identity_locked")) {
    return failure("한 번 공개한 검사의 유형과 주소는 변경할 수 없습니다.", 409);
  }
  if (message.includes("slug") || message.includes("duplicate")) {
    return failure("같은 주소를 사용하는 검사가 이미 있어요.", 409);
  }
  return failure("현재 상태에서는 처리할 수 없습니다. 새로고침 후 다시 시도해 주세요.", fallback);
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}
