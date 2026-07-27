import { NextResponse } from "next/server";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { refreshGateCAnalysis } from "@/features/research/gate-c/gate-c-auto-analysis";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return NextResponse.json(
      { message: "요청 출처를 확인하지 못했습니다.", ok: false },
      { status: 403 },
    );
  }

  const context = await resolveAdminContext();
  if (!context.ok) {
    return NextResponse.json(
      { message: "관리자 권한이 필요합니다.", ok: false },
      { status: 403 },
    );
  }

  try {
    const analysis = await refreshGateCAnalysis(context.client);
    return NextResponse.json({
      completedSessionCount: analysis.completedSessionCount,
      generatedAt: new Date().toISOString(),
      ok: true,
    });
  } catch (error) {
    console.error("[admin-research] analysis refresh failed", error);
    return NextResponse.json(
      {
        message: "분석을 갱신하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
        ok: false,
      },
      { status: 503 },
    );
  }
}
