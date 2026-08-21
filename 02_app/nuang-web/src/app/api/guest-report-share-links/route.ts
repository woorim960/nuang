import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isLegacyCoreShareContent,
  legacyCoreContainmentPolicyReleaseId,
  legacyCorePublicDenyReason,
  legacyCorePublicSharingMessage,
} from "@/features/assessment/legacy-core-containment-policy";
import { reportShareContentSchema } from "@/features/share/report-share-contract";
import { createGuestReportShareToken } from "@/features/share/server-guest-report-share-token";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";
import { getAppOrigin } from "@/lib/supabase/env";

const MAX_BODY_BYTES = 8_192;
const requestSchema = z.object({
  content: reportShareContentSchema,
});

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return NextResponse.json(
      { error: "invalid_request_origin", ok: false },
      { status: 403 },
    );
  }

  const parsed = await readValidatedJson(request, requestSchema, {
    maxBytes: MAX_BODY_BYTES,
  });
  if (!parsed.ok) return parsed.response;

  if (isLegacyCoreShareContent(parsed.data.content)) {
    return NextResponse.json(
      {
        error: legacyCorePublicDenyReason,
        message: legacyCorePublicSharingMessage,
        ok: false,
        policyReleaseId: legacyCoreContainmentPolicyReleaseId,
      },
      { status: 409 },
    );
  }

  const token = createGuestReportShareToken(parsed.data.content);
  if (!token) {
    return NextResponse.json(
      { error: "share_service_unavailable", ok: false },
      { status: 503 },
    );
  }

  return NextResponse.json({
    expiresInDays: 180,
    ok: true,
    persistent: false,
    url: new URL(`/share/${token}`, getAppOrigin()).toString(),
  });
}
