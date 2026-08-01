import { NextResponse } from "next/server";
import { z } from "zod";
import { advertisingPlacementKeys } from "@/features/advertising/delivery/advertising-delivery-contract";
import {
  advertisingSessionCookieName,
  resolveAdvertisingServerSession,
} from "@/features/advertising/server-advertising-event-security";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const feedbackSchema = z
  .object({
    campaignId: z.uuid().nullable().optional(),
    creativeId: z.uuid().nullable().optional(),
    placementKey: z.enum(advertisingPlacementKeys),
    provider: z.enum(["adsense", "coupang"]),
    reason: z.enum([
      "not_interested",
      "too_repetitive",
      "uncomfortable",
      "seems_wrong",
    ]),
    viewportBucket: z
      .enum(["mobile", "tablet", "desktop"])
      .optional()
      .default("mobile"),
  })
  .strict();

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) return json({ ok: false }, 403);
  const text = await request.text().catch(() => "");
  if (Buffer.byteLength(text, "utf8") > 4_096) return json({ ok: false }, 413);
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return json({ ok: false }, 400);
  }
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return json({ ok: false }, 422);
  if (
    (parsed.data.placementKey === "HOME_INLINE_01" &&
      parsed.data.provider !== "adsense") ||
    (parsed.data.placementKey === "FEED_COMMERCE_01" &&
      parsed.data.provider !== "coupang")
  ) {
    return json({ ok: false }, 422);
  }
  const client = createSupabaseServiceClient();
  if (!client) return json({ ok: false }, 503);
  let session;
  try {
    session = resolveAdvertisingServerSession(request);
  } catch {
    return json({ ok: false }, 503);
  }
  const result = await client.rpc("submit_advertising_feedback_atomic", {
    target_campaign_id: parsed.data.campaignId ?? null,
    target_creative_id: parsed.data.creativeId ?? null,
    target_ephemeral_session_hash: session.hash,
    target_placement_key: parsed.data.placementKey,
    target_provider: parsed.data.provider,
    target_reason: parsed.data.reason,
    target_viewport_bucket: parsed.data.viewportBucket,
  });
  if (result.error) return json({ ok: false }, 503);
  const rpcResult = result.data as { code?: unknown; ok?: unknown } | null;
  if (rpcResult?.ok !== true) {
    return json({ ok: false }, rpcResult?.code === "rate_limited" ? 429 : 422);
  }
  const response = json({ ok: true }, 201);
  response.cookies.set(advertisingSessionCookieName, session.sessionId, {
    httpOnly: true,
    maxAge: 30 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    headers: { "cache-control": "private, no-store" },
    status,
  });
}
