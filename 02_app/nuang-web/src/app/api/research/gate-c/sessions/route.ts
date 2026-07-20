import { NextResponse } from "next/server";
import { z } from "zod";
import {
  gateCAgeBands,
  gateCAssessmentExperiences,
  gateCLifeContexts,
  gateCPublicConsentVersion,
} from "@/features/research/gate-c/gate-c-public-contract";
import {
  createGateCIdentifiers,
  createGateCSecret,
  hashGateCSecret,
  isAllowedGateCRequest,
} from "@/features/research/gate-c/gate-c-server-security";
import { gateCFormIds } from "@/features/research/gate-c/gate-c-study-contract";
import { getGateCParticipantDefinition } from "@/features/research/gate-c/gate-c-study-fixture";
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

  const assignmentResponse = await serviceClient
    .from("research_gate_c_session")
    .select("form_id")
    .eq("status", "completed")
    .limit(5000);

  if (assignmentResponse.error) {
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
  const definition = getGateCParticipantDefinition(formId);
  const identifiers = createGateCIdentifiers();
  const sessionToken = createGateCSecret();
  const withdrawalCode = createGateCSecret(12);
  const payload = parsedBody.data;

  const insertResponse = await serviceClient
    .from("research_gate_c_session")
    .insert({
      age_band: payload.ageBand,
      assessment_experience: payload.assessmentExperience,
      candidate_set_id: definition.candidateSetId,
      consent_version: payload.consentVersion,
      form_id: formId,
      id: identifiers.sessionId,
      life_context: payload.lifeContext,
      participant_code: identifiers.participantCode,
      protocol_version: definition.protocolVersion,
      public_receipt_id: identifiers.publicReceiptId,
      session_secret_hash: hashGateCSecret(sessionToken),
      withdrawal_secret_hash: hashGateCSecret(withdrawalCode),
    });

  if (insertResponse.error) {
    return NextResponse.json(
      { error: "research_session_create_failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    formId,
    participantCode: identifiers.participantCode,
    sessionId: identifiers.sessionId,
    sessionToken,
    withdrawalCode,
  });
}
