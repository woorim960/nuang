import { NextResponse } from "next/server";
import { ensureAccountForUser } from "@/features/account/server-writes";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { productAnalyticsEventSchema } from "@/features/consent/optional-consent-contract";
import { recordProductScreenView } from "@/features/consent/server-optional-consent";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const noStoreHeaders = { "cache-control": "private, no-store" };

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return NextResponse.json(
      { code: "cross_site_request", ok: false },
      { headers: noStoreHeaders, status: 403 },
    );
  }

  const payload = await readValidatedJson(request, productAnalyticsEventSchema);
  if (!payload.ok) return payload.response;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return quietNoContent();

  const client = createSupabaseServiceClient();
  if (!client) return quietNoContent();

  const account = await ensureAccountForUser(client, auth.user);
  if (!account.ok) return quietNoContent();

  const recorded = await recordProductScreenView({
    accountId: account.accountId,
    area: payload.data.area,
    client,
  });
  if (!recorded.ok || recorded.status !== "recorded") {
    return quietNoContent();
  }

  return NextResponse.json(
    { accepted: true, ok: true },
    { headers: noStoreHeaders, status: 201 },
  );
}

function quietNoContent() {
  return new NextResponse(null, { headers: noStoreHeaders, status: 204 });
}
