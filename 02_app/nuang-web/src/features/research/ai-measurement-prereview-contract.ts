import type { CandidateCodeScheme } from "@/features/nuang-code/next-code-scheme";

export const aiMeasurementPrereviewProtocolVersion =
  "NUANG-AI-MEASUREMENT-PREREVIEW-1.0";

export const aiMeasurementPrereviewStatuses = [
  "not_started",
  "inputs_locked",
  "running",
  "completed_with_blockers",
  "completed_no_blockers",
  "superseded",
] as const;

export type AiMeasurementPrereviewStatus =
  (typeof aiMeasurementPrereviewStatuses)[number];

export type AiMeasurementPrereviewTrackId =
  | "cognitive_review"
  | "fairness_and_invariance"
  | "quantitative_pilot"
  | "reliability_and_structure";

export type AiMeasurementPrereviewRecord = {
  artifactManifestSha256: string | null;
  completedAt: string | null;
  issueCount: number;
  protocolVersion: string;
  runIds: readonly string[];
  status: AiMeasurementPrereviewStatus;
  trackId: AiMeasurementPrereviewTrackId;
};

type AiMeasurementPrereviewTrack = {
  artifactFiles: readonly string[];
  checklistFields: readonly string[];
  humanGate: keyof CandidateCodeScheme["validationGates"];
  id: AiMeasurementPrereviewTrackId;
  label: string;
  limitation: string;
};

export const aiMeasurementPrereviewTracks = [
  {
    id: "cognitive_review",
    humanGate: "cognitiveReview",
    label: "인지·내용 사전검토",
    checklistFields: [
      "blind_primary_construct",
      "blind_secondary_construct",
      "keyed_direction",
      "clarity_rating",
      "single_response_rating",
      "response_scale_fit",
      "intended_meaning_paraphrase",
      "likely_recalled_context",
      "social_desirability_signal",
      "adjacent_construct_overlap",
      "risk_codes",
      "evidence_note",
      "revision_recommendation",
    ],
    artifactFiles: [
      "packet_manifest.json",
      "blind_role_responses.csv",
      "item_metrics.csv",
      "qualitative_evidence.csv",
      "issue_ledger.csv",
      "human_handoff.md",
    ],
    limitation:
      "실제 사용자가 문항을 어떻게 이해하고 답하는지 확인할 수 없으며 M04·M05를 대신하지 않습니다.",
  },
  {
    id: "fairness_and_invariance",
    humanGate: "fairnessAndInvariance",
    label: "공정성·불변성 사전검토",
    checklistFields: [
      "culture_exposure_risk",
      "gender_stereotype_risk",
      "occupation_or_student_access_risk",
      "relationship_status_risk",
      "disability_and_device_access_risk",
      "literacy_and_language_load",
      "clinical_or_stigma_risk",
      "privacy_sensitivity",
      "subgroup_hypothesis",
      "planned_dif_test",
      "planned_invariance_test",
      "minority_risk_evidence",
      "mitigation_recommendation",
    ],
    artifactFiles: [
      "packet_manifest.json",
      "risk_hypothesis_register.csv",
      "subgroup_coverage_matrix.csv",
      "dif_invariance_analysis_plan.md",
      "minority_risk_ledger.csv",
      "human_handoff.md",
    ],
    limitation:
      "집단별 실제 응답 데이터가 없으면 DIF나 측정불변성을 판정할 수 없고 위험 가설만 만들 수 있습니다.",
  },
  {
    id: "quantitative_pilot",
    humanGate: "quantitativePilot",
    label: "정량 파일럿 사전점검",
    checklistFields: [
      "target_population_definition",
      "sample_size_rationale",
      "development_confirmation_split",
      "retest_sample_and_interval",
      "exclusion_rules",
      "missing_and_unsure_policy",
      "speeding_and_straightlining_policy",
      "external_measure_rights",
      "analysis_freeze_hash",
      "synthetic_pipeline_dry_run",
      "failure_recovery_test",
      "data_minimization_check",
    ],
    artifactFiles: [
      "packet_manifest.json",
      "preregistered_analysis_plan.md",
      "sample_size_inputs.json",
      "synthetic_pipeline_report.json",
      "data_quality_rulebook.csv",
      "human_handoff.md",
    ],
    limitation:
      "합성 데이터 dry-run은 실제 효과크기·응답분포·탈락·표본 대표성을 증명하지 않습니다.",
  },
  {
    id: "reliability_and_structure",
    humanGate: "reliabilityAndStructure",
    label: "신뢰도·구조 사전점검",
    checklistFields: [
      "distribution_diagnostics",
      "corrected_item_total_plan",
      "target_and_cross_loading_plan",
      "efa_model_comparison_plan",
      "independent_cfa_plan",
      "hierarchical_model_plan",
      "omega_and_uncertainty_plan",
      "retest_reliability_plan",
      "convergent_discriminant_plan",
      "boundary_stability_simulation",
      "quick_full_authority_contract",
      "score_to_copy_traceability",
    ],
    artifactFiles: [
      "packet_manifest.json",
      "analysis_notebook_lock.json",
      "model_comparison_template.csv",
      "reliability_template.csv",
      "score_copy_traceability.csv",
      "human_handoff.md",
    ],
    limitation:
      "실제 독립 표본 없이 신뢰도·요인구조·수렴 및 변별 타당성을 통과 판정할 수 없습니다.",
  },
] as const satisfies readonly AiMeasurementPrereviewTrack[];

export const initialAiMeasurementPrereviewRecords =
  aiMeasurementPrereviewTracks.map(
    (track): AiMeasurementPrereviewRecord => ({
      artifactManifestSha256: null,
      completedAt: null,
      issueCount: 0,
      protocolVersion: aiMeasurementPrereviewProtocolVersion,
      runIds: [],
      status: "not_started",
      trackId: track.id,
    }),
  );

export type AiMeasurementPrereviewSummary = {
  canChangeHumanValidationGate: false;
  humanGateEffect: "none";
  label: "사전검토 전" | "사전검토 중" | "사람 검토 준비" | "차단 항목 확인 필요";
  state: "not_started" | "running" | "human_handoff_ready" | "blocked";
};

export function validateAiMeasurementPrereviewRecord(
  record: AiMeasurementPrereviewRecord,
) {
  const issues: string[] = [];
  const isCompleted =
    record.status === "completed_no_blockers" ||
    record.status === "completed_with_blockers";

  if (record.protocolVersion !== aiMeasurementPrereviewProtocolVersion) {
    issues.push("PROTOCOL_VERSION_MISMATCH");
  }
  if (!Number.isInteger(record.issueCount) || record.issueCount < 0) {
    issues.push("ISSUE_COUNT_INVALID");
  }
  if (isCompleted) {
    if (!record.artifactManifestSha256?.match(/^[a-f0-9]{64}$/)) {
      issues.push("ARTIFACT_MANIFEST_HASH_REQUIRED");
    }
    if (
      !record.completedAt ||
      Number.isNaN(Date.parse(record.completedAt))
    ) {
      issues.push("COMPLETED_AT_REQUIRED");
    }
    if (record.runIds.length === 0) {
      issues.push("RUN_PROVENANCE_REQUIRED");
    }
  }

  return issues;
}

export function summarizeAiMeasurementPrereview(
  records: readonly AiMeasurementPrereviewRecord[],
): AiMeasurementPrereviewSummary {
  const currentByTrack = new Map(records.map((record) => [record.trackId, record]));
  const current = aiMeasurementPrereviewTracks.map((track) =>
    currentByTrack.get(track.id),
  );
  const hasBlockers = current.some(
    (record) => record?.status === "completed_with_blockers",
  );
  const isReady = current.every(
    (record) =>
      record?.status === "completed_no_blockers" &&
      validateAiMeasurementPrereviewRecord(record).length === 0,
  );
  const hasStarted = current.some(
    (record) => record && record.status !== "not_started",
  );

  if (hasBlockers) {
    return {
      canChangeHumanValidationGate: false,
      humanGateEffect: "none",
      label: "차단 항목 확인 필요",
      state: "blocked",
    };
  }
  if (isReady) {
    return {
      canChangeHumanValidationGate: false,
      humanGateEffect: "none",
      label: "사람 검토 준비",
      state: "human_handoff_ready",
    };
  }
  if (hasStarted) {
    return {
      canChangeHumanValidationGate: false,
      humanGateEffect: "none",
      label: "사전검토 중",
      state: "running",
    };
  }
  return {
    canChangeHumanValidationGate: false,
    humanGateEffect: "none",
    label: "사전검토 전",
    state: "not_started",
  };
}
