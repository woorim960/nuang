import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkGateCRequestGuard,
  hashGateCSecret,
  isAllowedGateCRequest,
} from "@/features/research/gate-c/gate-c-server-security";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const withdrawalSchema = z.object({
  publicReceiptId: z.uuid(),
  withdrawalCode: z.string().min(12).max(64),
});

export async function DELETE(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return NextResponse.json({ error: "cross_site_request" }, { status: 403 });
  }

  const parsedBody = withdrawalSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedBody.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) return createApiClosedResponse("supabase_env_missing");
  const guard = await checkGateCRequestGuard({
    action: "withdraw_submission",
    client: serviceClient,
    request,
  });
  if (guard) {
    return NextResponse.json(
      {
        error:
          guard === "rate_limited"
            ? "research_rate_limited"
            : "research_guard_unavailable",
      },
      { status: guard === "rate_limited" ? 429 : 503 },
    );
  }

  const response = await serviceClient.rpc("withdraw_gate_c_public_session", {
    supplied_withdrawal_secret_hash: hashGateCSecret(
      parsedBody.data.withdrawalCode,
    ),
    target_public_receipt_id: parsedBody.data.publicReceiptId,
  });

  if (response.error) {
    return NextResponse.json(
      { error: "research_withdrawal_failed" },
      { status: 503 },
    );
  }
  if (!response.data) {
    return NextResponse.json(
      { error: "research_submission_not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
