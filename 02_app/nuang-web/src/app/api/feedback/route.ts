import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureAccountForUser } from "@/features/account/server-writes";
import { sendAdminReviewNotification } from "@/features/admin/server-admin-review-notification";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { productFeedbackWriteSchema } from "@/features/feedback/product-feedback-contract";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createSupabaseServiceClient,
  getSupabaseServiceEnv,
} from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure(
      "요청 출처를 확인하지 못했어요. 앱에서 다시 시도해 주세요.",
      403,
    );
  }

  const payload = await readValidatedJson(request, productFeedbackWriteSchema);
  if (!payload.ok) {
    return failure("의견을 조금만 더 자세히 적어 주세요.", 422);
  }

  const serviceClient = createSupabaseServiceClient();
  const serviceEnv = getSupabaseServiceEnv();
  if (!serviceClient || !serviceEnv) {
    return createApiClosedResponse("supabase_env_missing");
  }

  const serverClient = await createServerSupabaseClient();
  const { data } = serverClient
    ? await serverClient.auth.getUser()
    : { data: { user: null } };
  let accountId: string | null = null;

  if (data.user) {
    const auth = await requireAuthenticatedUser();
    if (!auth.ok) return auth.response;
    const account = await ensureAccountForUser(serviceClient, auth.user);
    if (!account.ok) {
      return failure("계정 정보를 확인하지 못했어요. 다시 시도해 주세요.", 503);
    }
    accountId = account.accountId;
  }

  const requestFingerprint = createRequestFingerprint({
    clientSessionId: payload.data.clientSessionId,
    pepper: serviceEnv.shareTokenPepper,
    request,
  });
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1_000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();

  const [recent, daily, duplicate] = await Promise.all([
    serviceClient
      .from("product_feedback")
      .select("id", { count: "exact", head: true })
      .eq("request_fingerprint", requestFingerprint)
      .gte("created_at", tenMinutesAgo),
    serviceClient
      .from("product_feedback")
      .select("id", { count: "exact", head: true })
      .eq("request_fingerprint", requestFingerprint)
      .gte("created_at", oneDayAgo),
    serviceClient
      .from("product_feedback")
      .select("id")
      .eq("request_fingerprint", requestFingerprint)
      .eq("kind", payload.data.kind)
      .eq("body", payload.data.body)
      .gte("created_at", tenMinutesAgo)
      .limit(1)
      .maybeSingle(),
  ]);

  if (recent.error || daily.error || duplicate.error) {
    return failure(
      "지금은 의견 저장소에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
      503,
    );
  }
  if (duplicate.data) {
    return failure("같은 의견이 이미 전달됐어요. 개발팀이 확인할게요.", 409);
  }
  if ((recent.count ?? 0) >= 5 || (daily.count ?? 0) >= 20) {
    return failure(
      "의견을 연속으로 많이 보내고 있어요. 잠시 뒤 다시 시도해 주세요.",
      429,
    );
  }

  const inserted = await serviceClient
    .from("product_feedback")
    .insert({
      account_id: accountId,
      area: payload.data.area,
      body: payload.data.body,
      kind: payload.data.kind,
      request_fingerprint: requestFingerprint,
      source_path: payload.data.sourcePath,
      technical_context: payload.data.technicalContext,
    })
    .select("id,created_at,status")
    .single();

  if (inserted.error || !inserted.data) {
    return failure(
      "의견을 보내지 못했어요. 작성한 내용은 그대로 두었어요.",
      503,
    );
  }

  await sendAdminReviewNotification({
    id: inserted.data.id,
    kind: "product_feedback",
    occurredAt: inserted.data.created_at,
  });

  return NextResponse.json(
    {
      createdAt: inserted.data.created_at,
      feedbackId: inserted.data.id,
      ok: true,
      status: inserted.data.status,
    },
    {
      headers: { "cache-control": "private, no-store" },
      status: 201,
    },
  );
}

function createRequestFingerprint({
  clientSessionId,
  pepper,
  request,
}: {
  clientSessionId: string;
  pepper: string;
  request: Request;
}) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 240) ?? "";

  return createHmac("sha256", pepper)
    .update(`product-feedback:${clientSessionId}:${ip}:${userAgent}`)
    .digest("hex");
}

function failure(message: string, status: number) {
  return NextResponse.json(
    { message, ok: false },
    { headers: { "cache-control": "private, no-store" }, status },
  );
}
