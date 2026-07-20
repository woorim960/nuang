import { NextResponse } from "next/server";
import { z } from "zod";
import { refreshGateCAnalysis } from "@/features/research/gate-c/gate-c-auto-analysis";
import {
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

  try {
    await refreshGateCAnalysis(serviceClient);
  } catch (error) {
    console.error("Gate C analysis refresh after withdrawal failed", error);
  }

  return NextResponse.json({ ok: true });
}
