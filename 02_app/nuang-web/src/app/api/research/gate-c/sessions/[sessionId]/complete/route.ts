import { NextResponse } from "next/server";
import { z } from "zod";
import { refreshGateCAnalysis } from "@/features/research/gate-c/gate-c-auto-analysis";
import {
  hashGateCSecret,
  isAllowedGateCRequest,
} from "@/features/research/gate-c/gate-c-server-security";
import { isGateCFormId } from "@/features/research/gate-c/gate-c-study-contract";
import { getGateCParticipantDefinition } from "@/features/research/gate-c/gate-c-study-fixture";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const unsureReasonSchema = z.enum([
  "NO_EXPERIENCE",
  "CONTEXT_VARIES",
  "WORDING_UNCLEAR",
  "PREFER_NOT_TO_ANSWER",
]);
const choiceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("scale"), value: z.number().int().min(1).max(5) }),
  z.object({ kind: z.literal("unsure"), reason: unsureReasonSchema }),
]);
const completeSessionSchema = z.object({
  clientDurationMs: z.number().int().min(0).max(7_200_000),
  responses: z
    .array(
      z.object({
        changeCount: z.number().int().min(0).max(20),
        confusionFlag: z.boolean(),
        confusionNote: z.string().trim().max(300),
        finalChoice: choiceSchema,
        firstAnswerElapsedMs: z.number().int().min(0).max(1_800_000),
        firstChoice: choiceSchema,
        orderIndex: z.number().int().min(1).max(12),
        responseChanged: z.boolean(),
        studyItemId: z.string().min(1).max(120),
        unsureReason: unsureReasonSchema.nullable(),
      }),
    )
    .length(12),
  sessionToken: z.string().min(24).max(128),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  if (!isAllowedGateCRequest(request)) {
    return NextResponse.json({ error: "cross_site_request" }, { status: 403 });
  }

  const { sessionId } = await params;
  const parsedSessionId = z.uuid().safeParse(sessionId);
  const parsedBody = completeSessionSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedSessionId.success || !parsedBody.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) return createApiClosedResponse("supabase_env_missing");

  const sessionResponse = await serviceClient
    .from("research_gate_c_session")
    .select("id,form_id,status")
    .eq("id", parsedSessionId.data)
    .maybeSingle();

  if (sessionResponse.error) {
    return NextResponse.json(
      { error: "research_session_read_failed" },
      { status: 503 },
    );
  }
  if (!sessionResponse.data) {
    return NextResponse.json(
      { error: "research_session_not_found" },
      { status: 404 },
    );
  }
  if (sessionResponse.data.status !== "started") {
    return NextResponse.json(
      { error: "research_session_already_completed" },
      { status: 409 },
    );
  }
  if (!isGateCFormId(sessionResponse.data.form_id)) {
    return NextResponse.json(
      { error: "research_form_invalid" },
      { status: 500 },
    );
  }

  const definition = getGateCParticipantDefinition(
    sessionResponse.data.form_id,
  );
  const expectedItemIds = definition.items.map((item) => item.studyItemId);
  const submittedItemIds = parsedBody.data.responses.map(
    (response) => response.studyItemId,
  );
  const hasExactItems = expectedItemIds.every(
    (itemId, index) =>
      submittedItemIds[index] === itemId &&
      parsedBody.data.responses[index].orderIndex === index + 1,
  );

  if (!hasExactItems || new Set(submittedItemIds).size !== 12) {
    return NextResponse.json(
      { error: "research_item_set_mismatch" },
      { status: 422 },
    );
  }

  const rapidResponseCount = parsedBody.data.responses.filter(
    (response) => response.firstAnswerElapsedMs < 500,
  ).length;
  const exclusionReasons = [
    ...(parsedBody.data.clientDurationMs < 36_000
      ? ["COMPLETED_TOO_FAST"]
      : []),
    ...(rapidResponseCount >= 6 ? ["IMPOSSIBLY_FAST_ITEM_RESPONSES"] : []),
  ];
  const qualityStatus = exclusionReasons.length > 0 ? "excluded" : "included";
  const rpcResponse = await serviceClient.rpc(
    "complete_gate_c_public_session",
    {
      supplied_client_duration_ms: parsedBody.data.clientDurationMs,
      supplied_exclusion_reasons: exclusionReasons,
      supplied_quality_status: qualityStatus,
      supplied_responses: parsedBody.data.responses,
      supplied_session_secret_hash: hashGateCSecret(
        parsedBody.data.sessionToken,
      ),
      target_session_id: parsedSessionId.data,
    },
  );

  if (rpcResponse.error || !rpcResponse.data?.[0]) {
    return NextResponse.json(
      { error: "research_submission_failed" },
      { status: 503 },
    );
  }

  let analysisStatus: "refreshed" | "retry_pending" = "refreshed";
  try {
    await refreshGateCAnalysis(serviceClient);
  } catch (error) {
    analysisStatus = "retry_pending";
    console.error("Gate C analysis refresh failed", error);
  }

  return NextResponse.json({
    analysisStatus,
    ok: true,
    participantCode: rpcResponse.data[0].participant_code,
    publicReceiptId: rpcResponse.data[0].public_receipt_id,
    qualityStatus,
  });
}
