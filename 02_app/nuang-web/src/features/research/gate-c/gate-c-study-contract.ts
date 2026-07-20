import type { gateCIssueCodes } from "@/features/nuang-code/gate-c-cognitive-protocol";

export const gateCFormIds = [
  "FORM_A",
  "FORM_B",
  "FORM_C",
  "FORM_D",
  "FORM_E",
] as const;

export type GateCFormId = (typeof gateCFormIds)[number];
export type GateCScaleValue = 1 | 2 | 3 | 4 | 5;
export type GateCSeverity = "S0" | "S1" | "S2" | "S3";
export type GateCIssueCode = (typeof gateCIssueCodes)[number];
export type GateCUnsureReason =
  | "NO_EXPERIENCE"
  | "CONTEXT_VARIES"
  | "WORDING_UNCLEAR"
  | "PREFER_NOT_TO_ANSWER";

export type GateCResponseChoice =
  | { kind: "scale"; value: GateCScaleValue }
  | { kind: "unsure"; reason: GateCUnsureReason };

export type GateCItemProbes = {
  comprehension: string;
  recall: string;
  judgment: string;
  responseSelection: string;
  desirability: string;
  access: string;
  seam: string;
};

export type GateCParticipantItem = {
  studyItemId: string;
  orderIndex: number;
  contextLabel: string;
  promptText: string;
  probes: GateCItemProbes;
};

export type GateCParticipantDefinition = {
  protocolVersion: string;
  candidateSetId: string;
  formId: GateCFormId;
  responseFormatId: string;
  status: "PREPARED_NOT_RUN_NOT_EXTERNAL_VALIDATION";
  items: GateCParticipantItem[];
};

export type GateCNaturalResponseRecord = {
  firstChoice: GateCResponseChoice;
  currentChoice: GateCResponseChoice;
  responseChanged: boolean;
  firstAnsweredElapsedMs: number;
};

export type GateCProbeRecord = {
  comprehensionSummary: string;
  recallSummary: string;
  judgmentSummary: string;
  responseSelectionSummary: string;
  desirabilitySummary: string;
  accessSummary: string;
  seamSummary: string;
  issueCodes: GateCIssueCode[];
  highestSeverity: GateCSeverity | "";
  moderatorNote: string;
};

export type GateCStudySession = {
  protocolVersion: string;
  candidateSetId: string;
  sessionId: string;
  sessionSlotId: string;
  participantIdPseudonymous: string;
  consentRecordId: string;
  formId: GateCFormId;
  consentConfirmed: true;
  startedAt: string;
  completedAt: string;
  storageStatus: "LOCAL_EXPORT_NOT_UPLOADED";
  naturalResponses: Record<string, GateCNaturalResponseRecord>;
  probeRecords: Record<string, GateCProbeRecord>;
};

export function isGateCFormId(value: string): value is GateCFormId {
  return gateCFormIds.includes(value as GateCFormId);
}

export function createEmptyGateCProbeRecord(): GateCProbeRecord {
  return {
    comprehensionSummary: "",
    recallSummary: "",
    judgmentSummary: "",
    responseSelectionSummary: "",
    desirabilitySummary: "",
    accessSummary: "",
    seamSummary: "",
    issueCodes: [],
    highestSeverity: "",
    moderatorNote: "",
  };
}

export function hasMandatoryGateCProbeEvidence(record: GateCProbeRecord) {
  return [
    record.comprehensionSummary,
    record.recallSummary,
    record.judgmentSummary,
    record.responseSelectionSummary,
  ].every((value) => value.trim().length > 0);
}

export function canExportGateCSession(
  definition: GateCParticipantDefinition,
  naturalResponses: Record<string, GateCNaturalResponseRecord>,
  probeRecords: Record<string, GateCProbeRecord>,
) {
  return definition.items.every(
    (item) =>
      Boolean(naturalResponses[item.studyItemId]) &&
      hasMandatoryGateCProbeEvidence(
        probeRecords[item.studyItemId] ?? createEmptyGateCProbeRecord(),
      ),
  );
}
