import { NextResponse } from "next/server";
import { z } from "zod";
import {
  gateCAgeBands,
  gateCAssessmentExperiences,
  gateCLifeContexts,
  gateCPublicConsentVersion,
} from "@/features/research/gate-c/gate-c-public-contract";
import {
  createGateCAssignmentProof,
  createGateCIdentifiers,
  createGateCSecret,
  checkGateCRequestGuard,
  hashGateCSecret,
  isAllowedGateCRequest,
} from "@/features/research/gate-c/gate-c-server-security";
import { gateCFormIds } from "@/features/research/gate-c/gate-c-study-contract";
import {
  createUnifiedGateCAssignment,
  gateCCandidateBankId,
  gateCUnifiedPoolVersion,
  gateCUnifiedProtocolVersion,
} from "@/features/research/gate-c/gate-c-unified-item-pool";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const startSessionSchema = z.object({
  ageBand: z.enum(gateCAgeBands),
  assessmentExperience: z.enum(gateCAssessmentExperiences),
  consentAccepted: z.literal(true),
  consentVersion: z.literal(gateCPublicConsentVersion),
  isAdult: z.literal(true),
  lifeContext: z.enum(gateCLifeContexts),
  website: z.string().max(0).optional().default(""),
});

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return NextResponse.json({ error: "cross_site_request" }, { status: 403 });
  }

  const parsedBody = startSessionSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsedBody.error.issues },
      { status: 422 },
    );
  }

  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) return createApiClosedResponse("supabase_env_missing");
  const guard = await checkGateCRequestGuard({
    action: "start_session",
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

  const [assignmentResponse, exposureResponse] = await Promise.all([
    serviceClient
      .from("research_gate_c_session")
      .select("form_id")
      .eq("status", "completed")
      .limit(5000),
    serviceClient
      .from("research_gate_c_item_response")
      .select("study_item_id")
      .limit(5000),
  ]);

  if (assignmentResponse.error || exposureResponse.error) {
    return NextResponse.json(
      { error: "research_storage_unavailable" },
      { status: 503 },
    );
  }

  const formCounts = new Map(gateCFormIds.map((formId) => [formId, 0]));
  for (const row of assignmentResponse.data ?? []) {
    const formId = row.form_id;
    if (formCounts.has(formId)) {
      formCounts.set(formId, (formCounts.get(formId) ?? 0) + 1);
    }
  }
  const minimumCount = Math.min(...formCounts.values());
  const leastUsedForms = gateCFormIds.filter(
    (formId) => formCounts.get(formId) === minimumCount,
  );
  const formId =
    leastUsedForms[Math.floor(Math.random() * leastUsedForms.length)];
  const exposureCounts = new Map<string, number>();
  for (const row of exposureResponse.data ?? []) {
    const itemId = row.study_item_id;
    if (typeof itemId !== "string") continue;
    exposureCounts.set(itemId, (exposureCounts.get(itemId) ?? 0) + 1);
  }
  const assignedItems = await createUnifiedGateCAssignment({
    client: serviceClient,
    exposureCounts,
  });
  const identifiers = createGateCIdentifiers();
  const sessionToken = createGateCSecret();
  const withdrawalCode = createGateCSecret(12);
  const payload = parsedBody.data;

  let insertResponse = await serviceClient
    .from("research_gate_c_session")
    .insert({
      age_band: payload.ageBand,
      assessment_experience: payload.assessmentExperience,
      assignment_strategy: "4_quick_4_full_only_4_candidate_low_exposure",
      candidate_set_id: gateCCandidateBankId,
      consent_version: payload.consentVersion,
      form_id: formId,
      id: identifiers.sessionId,
      item_assignment: assignedItems,
      life_context: payload.lifeContext,
      participant_code: identifiers.participantCode,
      pool_version: gateCUnifiedPoolVersion,
      protocol_version: gateCUnifiedProtocolVersion,
      public_receipt_id: identifiers.publicReceiptId,
      session_secret_hash: hashGateCSecret(sessionToken),
      withdrawal_secret_hash: hashGateCSecret(withdrawalCode),
    });

  if (isMissingUnifiedResearchSchema(insertResponse.error)) {
    insertResponse = await serviceClient
      .from("research_gate_c_session")
      .insert({
        age_band: payload.ageBand,
        assessment_experience: payload.assessmentExperience,
        candidate_set_id: gateCCandidateBankId,
        consent_version: payload.consentVersion,
        form_id: formId,
        id: identifiers.sessionId,
        life_context: payload.lifeContext,
        participant_code: identifiers.participantCode,
        protocol_version: gateCUnifiedProtocolVersion,
        public_receipt_id: identifiers.publicReceiptId,
        session_secret_hash: hashGateCSecret(sessionToken),
        withdrawal_secret_hash: hashGateCSecret(withdrawalCode),
      });
  }

  if (insertResponse.error) {
    return NextResponse.json(
      { error: "research_session_create_failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    assignmentProof: createGateCAssignmentProof({
      items: assignedItems,
      poolVersion: gateCUnifiedPoolVersion,
      sessionId: identifiers.sessionId,
    }),
    formId,
    items: assignedItems,
    participantCode: identifiers.participantCode,
    poolVersion: gateCUnifiedPoolVersion,
    sessionId: identifiers.sessionId,
    sessionToken,
    withdrawalCode,
  });
}

function isMissingUnifiedResearchSchema(error: { code?: string } | null) {
  return error?.code === "42703" || error?.code === "PGRST204";
}
