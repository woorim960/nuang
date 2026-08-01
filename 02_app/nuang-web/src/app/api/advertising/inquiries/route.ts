import { after, NextResponse } from "next/server";
import { advertisingInquiryWriteSchema } from "@/features/advertising/advertising-inquiry-contract";
import { createHoneypotPublicReference } from "@/features/advertising/server-advertising-inquiry-security";
import { submitAdvertisingInquiry } from "@/features/advertising/server-advertising-inquiries";
import { drainAdvertisingMailOutbox } from "@/features/advertising/server-advertising-mail-outbox";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_BODY_BYTES = 20_000;

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure(
      "요청 출처를 확인하지 못했어요. 뉴앙에서 다시 시도해 주세요.",
      403,
    );
  }

  const payload = await readInquiryPayload(request);
  if (!payload.ok) return payload.response;

  if (payload.data.website.trim()) {
    return NextResponse.json(
      {
        message: "문의가 접수됐습니다.",
        ok: true,
        publicReference: createHoneypotPublicReference(request),
      },
      { headers: noStoreHeaders, status: 201 },
    );
  }

  const client = createSupabaseServiceClient();
  if (!client) {
    return failure(
      "지금은 문의 접수 시스템을 준비하고 있어요. 잠시 뒤 다시 시도해 주세요.",
      503,
    );
  }

  let result;
  try {
    result = await submitAdvertisingInquiry({
      client,
      input: payload.data,
      request,
    });
  } catch (error) {
    console.error("Advertising inquiry preparation failed", {
      code: error instanceof Error ? error.name : "unknown_error",
    });
    return failure(
      "문의 내용을 안전하게 저장하지 못했어요. 작성한 내용은 그대로 두고 잠시 뒤 다시 시도해 주세요.",
      503,
    );
  }

  if (!result.ok) {
    if (result.code === "rate_limited") {
      return failure(
        "문의가 연속으로 접수됐어요. 잠시 뒤 다시 시도해 주세요.",
        429,
      );
    }
    return failure(
      "문의 저장소에 연결하지 못했어요. 작성한 내용은 그대로 두고 잠시 뒤 다시 시도해 주세요.",
      503,
    );
  }

  const inquiryId = result.inquiryId;
  after(async () => {
    await drainAdvertisingMailOutbox({ inquiryId, limit: 2 }).catch((error) => {
      console.error("Advertising inquiry outbox immediate drain failed", {
        code: error instanceof Error ? error.name : "unknown_error",
        inquiryId,
      });
    });
  });

  return NextResponse.json(
    {
      createdAt: result.createdAt,
      inquiryId: result.inquiryId,
      message: result.duplicate
        ? "같은 내용의 문의가 이미 접수되어 기존 접수번호를 안내합니다."
        : "문의가 접수됐습니다.",
      ok: true,
      publicReference: result.publicReference,
    },
    { headers: noStoreHeaders, status: 201 },
  );
}

async function readInquiryPayload(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return {
      ok: false as const,
      response: failure("문의 내용이 너무 길어요.", 413),
    };
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return {
      ok: false as const,
      response: failure("문의 내용을 읽지 못했어요.", 400),
    };
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return {
      ok: false as const,
      response: failure("문의 내용이 너무 길어요.", 413),
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return {
      ok: false as const,
      response: failure("문의 내용을 다시 확인해 주세요.", 400),
    };
  }

  const parsed = advertisingInquiryWriteSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          issues: parsed.error.issues.map((issue) => ({
            code: issue.code,
            message: issue.message,
            path: issue.path,
          })),
          message: "입력한 내용을 확인해 주세요.",
          ok: false,
        },
        { headers: noStoreHeaders, status: 422 },
      ),
    };
  }

  return { data: parsed.data, ok: true as const };
}

const noStoreHeaders = { "cache-control": "private, no-store" };

function failure(message: string, status: number) {
  return NextResponse.json(
    { message, ok: false },
    { headers: noStoreHeaders, status },
  );
}
