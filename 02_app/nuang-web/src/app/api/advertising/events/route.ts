import { NextResponse } from "next/server";
import { z } from "zod";
import {
  advertisingPlacementKeys,
  type AdvertisingPlacementKey,
} from "@/features/advertising/delivery/advertising-delivery-contract";
import {
  advertisingSessionCookieName,
  resolveAdvertisingServerSession,
} from "@/features/advertising/server-advertising-event-security";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const eventSchema = z
  .object({
    campaignId: z.uuid().nullable().optional(),
    creativeId: z.uuid().nullable().optional(),
    errorCode: z.string().trim().max(120).nullable().optional(),
    event: z.enum([
      "ad_slot_eligible",
      "ad_render_requested",
      "ad_slot_filled",
      "ad_slot_no_fill",
      "ad_slot_error",
      "ad_slot_viewable",
      "ad_click_out",
      "ad_feedback_submitted",
      "ad_suppressed",
    ]),
    placementKey: z.enum(advertisingPlacementKeys),
    provider: z.enum(["adsense", "coupang"]),
    viewportBucket: z.enum(["mobile", "tablet", "desktop"]),
  })
  .strict();

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) return json({ ok: false }, 403);
  const payload = await parseSmallJson(request, eventSchema);
  if (!payload.ok) return payload.response;
  if (
    !providerMatchesPlacement(payload.data.placementKey, payload.data.provider)
  ) {
    return json({ ok: false }, 422);
  }
  if (
    payload.data.event === "ad_click_out" &&
    payload.data.provider !== "coupang"
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
  const result = await client.rpc("record_advertising_event_atomic", {
    target_app_version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 80) ?? null,
    target_campaign_id: payload.data.campaignId ?? null,
    target_creative_id: payload.data.creativeId ?? null,
    target_ephemeral_session_hash: session.hash,
    target_error_code: payload.data.errorCode ?? null,
    target_event_name: payload.data.event,
    target_page_context:
      payload.data.placementKey === "HOME_INLINE_01"
        ? "home_recommended"
        : "feed_recommended",
    target_placement_key: payload.data.placementKey,
    target_provider: payload.data.provider,
    target_viewport_bucket: payload.data.viewportBucket,
  });
  if (result.error) return json({ ok: false }, 503);
  const rpcResult = result.data as { code?: unknown; ok?: unknown } | null;
  if (rpcResult?.ok !== true) {
    return json({ ok: false }, rpcResult?.code === "rate_limited" ? 429 : 422);
  }
  const response = json({ ok: true }, 202);
  setSessionCookie(response, session.sessionId);
  return response;
}

function providerMatchesPlacement(
  placement: AdvertisingPlacementKey,
  provider: string,
) {
  return (
    (placement === "HOME_INLINE_01" && provider === "adsense") ||
    (placement === "FEED_COMMERCE_01" && provider === "coupang")
  );
}

async function parseSmallJson<T>(request: Request, schema: z.ZodType<T>) {
  const text = await request.text().catch(() => "");
  if (Buffer.byteLength(text, "utf8") > 4_096) {
    return { ok: false as const, response: json({ ok: false }, 413) };
  }
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return { ok: false as const, response: json({ ok: false }, 400) };
  }
  const parsed = schema.safeParse(input);
  return parsed.success
    ? { data: parsed.data, ok: true as const }
    : { ok: false as const, response: json({ ok: false }, 422) };
}

function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(advertisingSessionCookieName, sessionId, {
    httpOnly: true,
    maxAge: 30 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    headers: { "cache-control": "private, no-store" },
    status,
  });
}
