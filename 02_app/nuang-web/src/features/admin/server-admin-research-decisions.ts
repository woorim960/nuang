import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ResearchDecisionState = "exclude" | "keep" | "revise" | "reviewing";

export type ResearchDecision = {
  key: string;
  note: string | null;
  state: ResearchDecisionState;
  updatedAt: string;
};

type GateCDecisionRow = {
  candidate_set_id: string;
  decision_state: ResearchDecisionState;
  note: string | null;
  protocol_version: string;
  study_item_id: string;
  updated_at: string;
};

type TraitMapDecisionRow = {
  chapter_id: string;
  decision_state: Exclude<ResearchDecisionState, "exclude">;
  guide_version: string;
  note: string | null;
  profile_code: string;
  section_key: string;
  updated_at: string;
};

export async function readAdminResearchDecisions(client: SupabaseClient) {
  const [gateCResponse, traitMapResponse] = await Promise.all([
    client
      .from("research_gate_c_item_decision")
      .select(
        "protocol_version,candidate_set_id,study_item_id,decision_state,note,updated_at",
      )
      .limit(500),
    client
      .from("research_trait_map_section_decision")
      .select(
        "guide_version,profile_code,chapter_id,section_key,decision_state,note,updated_at",
      )
      .limit(500),
  ]);

  return {
    available: !gateCResponse.error && !traitMapResponse.error,
    gateC: gateCResponse.error
      ? []
      : ((gateCResponse.data ?? []) as GateCDecisionRow[]).map((row) => ({
          key: gateCDecisionKey(row),
          note: row.note,
          state: row.decision_state,
          updatedAt: row.updated_at,
        })),
    traitMap: traitMapResponse.error
      ? []
      : ((traitMapResponse.data ?? []) as TraitMapDecisionRow[]).map((row) => ({
          key: traitMapDecisionKey(row),
          note: row.note,
          state: row.decision_state,
          updatedAt: row.updated_at,
        })),
  };
}

export function gateCDecisionKey(input: {
  candidate_set_id?: string;
  candidateSetId?: string;
  protocol_version?: string;
  protocolVersion?: string;
  study_item_id?: string;
  studyItemId?: string;
}) {
  return [
    input.protocol_version ?? input.protocolVersion,
    input.candidate_set_id ?? input.candidateSetId,
    input.study_item_id ?? input.studyItemId,
  ].join("::");
}

export function traitMapDecisionKey(input: {
  chapter_id?: string;
  chapterId?: string;
  guide_version?: string;
  guideVersion?: string;
  profile_code?: string;
  profileCode?: string;
  section_key?: string;
  sectionKey?: string;
}) {
  return [
    input.guide_version ?? input.guideVersion,
    input.profile_code ?? input.profileCode,
    input.chapter_id ?? input.chapterId,
    input.section_key ?? input.sectionKey,
  ].join("::");
}
