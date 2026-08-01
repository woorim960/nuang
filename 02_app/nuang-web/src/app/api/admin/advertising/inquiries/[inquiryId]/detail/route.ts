import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdvertisingInquiryDetail } from "@/features/advertising/server-advertising-inquiries";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> },
) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);

  const parsed = z.uuid().safeParse((await params).inquiryId);
  if (!parsed.success) return failure("문의 번호를 확인해 주세요.", 422);

  try {
    const response = await getAdvertisingInquiryDetail({
      adminAccountId: context.accountId,
      client: context.client,
      inquiryId: parsed.data,
    });
    if (response.error || !response.data) {
      return failure("문의 상세 정보를 불러오지 못했습니다.", 404);
    }
    const row = response.data as Record<string, unknown>;
    return NextResponse.json(
      {
        detail: {
          contactEmail: text(row.contact_email),
          contactName: text(row.contact_name),
          contactPhone: text(row.contact_phone),
          details: text(row.details),
          promotedOffering: text(row.promoted_offering),
        },
        ok: true,
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return failure("민감정보 보호 설정을 확인해 주세요.", 503);
  }
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function failure(message: string, status: number) {
  return NextResponse.json(
    { message, ok: false },
    { headers: { "cache-control": "private, no-store" }, status },
  );
}
