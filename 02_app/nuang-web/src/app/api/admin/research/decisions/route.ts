import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

const gateCIdentitySchema = z.object({
  candidateSetId: z.string().min(1).max(180),
  protocolVersion: z.string().min(1).max(100),
  studyItemId: z.string().min(1).max(180),
});

const traitMapIdentitySchema = z.object({
  chapterId: z.string().regex(/^chapter-[0-9]{2}$/),
  guideVersion: z.string().min(1).max(100),
  profileCode: z.string().regex(/^[EI][RN][GA][KM][CQ]$/),
  sectionKey: z.string().regex(/^section-[0-9]{2}$/),
});

const requestSchema = z.discriminatedUnion("scope", [
  z.object({
    action: z.enum(["exclude", "keep", "revise", "start_review"]),
    identity: gateCIdentitySchema,
    note: z.string().trim().max(1000).optional(),
    scope: z.literal("gate_c_item"),
  }),
  z.object({
    action: z.enum(["keep", "revise", "start_review"]),
    identity: traitMapIdentitySchema,
    note: z.string().trim().max(1000).optional(),
    scope: z.literal("trait_map_section"),
  }),
]);

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failure("검토 대상과 결정을 확인해 주세요.", 422);
  }

  const result = await context.client.rpc("admin_manage_research_decision", {
    target_action: parsed.data.action,
    target_admin_account_id: context.accountId,
    target_identity: parsed.data.identity,
    target_note: parsed.data.note ?? null,
    target_scope: parsed.data.scope,
  });

  if (result.error) {
    const unavailable = ["42883", "PGRST202"].includes(result.error.code ?? "");
    return failure(
      unavailable
        ? "연구 결정 저장소를 준비해야 합니다. 최신 DB 마이그레이션을 확인해 주세요."
        : "검토 결정을 저장하지 못했습니다. 대상이 현재 대기열에 있는지 확인해 주세요.",
      unavailable ? 503 : 409,
    );
  }

  return NextResponse.json({ ok: true });
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}
