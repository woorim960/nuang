import { z } from "zod";

export const gateCProtocolVersion =
  "ENAKQ-GATE-C-COGNITIVE-CONTENT-VALIDITY.v0.1";

export const gateCIssueCodes = [
  "CONTEXT_MISREAD",
  "CONTEXT_PROMPT_DUPLICATION",
  "PROMPT_MISREAD",
  "DOUBLE_RESPONSE",
  "TARGET_SEAM",
  "RESPONSE_LAYER_CONFUSION",
  "ABILITY_INFERENCE",
  "VALUE_INFERENCE",
  "CLINICAL_INFERENCE",
  "RELATIONSHIP_DETERMINISM",
  "RECALL_WINDOW",
  "EXPERIENCE_GAP",
  "RESPONSE_SCALE",
  "NEGATION_DIRECTION",
  "SOCIAL_DESIRABILITY",
  "ACCESS_CONSTRAINT",
  "UI_CONTEXT_LOSS",
  "PRIVACY_DISCOMFORT",
  "OTHER",
] as const;

export const gateCItemDecisions = [
  "KEEP_FOR_PILOT",
  "COPY_REVISE_RETEST",
  "CONSTRUCT_REWRITE",
  "HOLD_FOR_SUBGROUP",
  "EXCLUDE",
] as const;

const gateCProtocolSchema = z
  .object({
    version: z.literal(gateCProtocolVersion),
    status: z.literal("PREPARED_NOT_RUN_NOT_EXTERNAL_VALIDATION"),
    sourceAssessmentReleaseId: z.literal("NUANG-CORE-BETA-1.0"),
    cognitiveCandidateSetId: z.literal(
      "NUANG-CORE-GATE-C-COGNITIVE-CANDIDATE-1.0",
    ),
    representativeFacetIds: z.array(z.string()).length(10),
    forms: z.object({
      count: z.literal(5),
      itemsPerForm: z.literal(12),
      targetKeyVisibleToParticipants: z.literal(false),
      requiredFacetsPerForm: z.literal(10),
      highItemsPerForm: z.literal(6),
      lowItemsPerForm: z.literal(6),
    }),
    rounds: z.object({
      discoveryParticipants: z.literal(20),
      revisionParticipants: z.literal(20),
      participantsPerFormPerRound: z.literal(4),
      targetedRetestParticipants: z.object({
        minimum: z.literal(4),
        maximum: z.literal(10),
      }),
      minimumCompletedRoundsForPassing: z.literal(2),
    }),
    evidence: z.object({
      minimumObservationsPerFinalItem: z.literal(8),
      minimumNewObservationsAfterRevision: z.literal(4),
      naturalResponseBeforeProbing: z.literal(true),
      responseProcessStages: z.tuple([
        z.literal("comprehension"),
        z.literal("recall"),
        z.literal("judgment"),
        z.literal("response_selection"),
      ]),
      issueCodes: z.array(z.enum(gateCIssueCodes)),
    }),
    releaseBoundary: z.object({
      customerScoringAllowed: z.literal(false),
      productionResearchDataStorageAllowed: z.literal(false),
      cognitiveReviewGateStatus: z.literal("not_started"),
      unresolvedMaterialIssuesAllowed: z.literal(false),
      unresolvedCriticalIssuesAllowed: z.literal(false),
    }),
    evidenceSources: z.array(
      z.object({
        role: z.string().min(1),
        title: z.string().min(1),
        url: z.string().url(),
      }),
    ),
  })
  .superRefine((protocol, context) => {
    const facetIds = new Set(protocol.representativeFacetIds);
    if (facetIds.size !== protocol.representativeFacetIds.length) {
      context.addIssue({
        code: "custom",
        message: "Representative facets must be unique.",
        path: ["representativeFacetIds"],
      });
    }

    if (protocol.evidence.issueCodes.length !== gateCIssueCodes.length) {
      context.addIssue({
        code: "custom",
        message: "Every Gate C issue code must be registered.",
        path: ["evidence", "issueCodes"],
      });
    }
  });

export const gateCCognitiveProtocol = gateCProtocolSchema.parse({
  version: gateCProtocolVersion,
  status: "PREPARED_NOT_RUN_NOT_EXTERNAL_VALIDATION",
  sourceAssessmentReleaseId: "NUANG-CORE-BETA-1.0",
  cognitiveCandidateSetId: "NUANG-CORE-GATE-C-COGNITIVE-CANDIDATE-1.0",
  representativeFacetIds: [
    "SE-RE",
    "SE-AI",
    "OE-AE",
    "OE-CI",
    "OE-IE",
    "RO-EC",
    "SM-EP",
    "SM-OS",
    "ER-IR",
    "ER-WD",
  ],
  forms: {
    count: 5,
    itemsPerForm: 12,
    targetKeyVisibleToParticipants: false,
    requiredFacetsPerForm: 10,
    highItemsPerForm: 6,
    lowItemsPerForm: 6,
  },
  rounds: {
    discoveryParticipants: 20,
    revisionParticipants: 20,
    participantsPerFormPerRound: 4,
    targetedRetestParticipants: { minimum: 4, maximum: 10 },
    minimumCompletedRoundsForPassing: 2,
  },
  evidence: {
    minimumObservationsPerFinalItem: 8,
    minimumNewObservationsAfterRevision: 4,
    naturalResponseBeforeProbing: true,
    responseProcessStages: [
      "comprehension",
      "recall",
      "judgment",
      "response_selection",
    ],
    issueCodes: [...gateCIssueCodes],
  },
  releaseBoundary: {
    customerScoringAllowed: false,
    productionResearchDataStorageAllowed: false,
    cognitiveReviewGateStatus: "not_started",
    unresolvedMaterialIssuesAllowed: false,
    unresolvedCriticalIssuesAllowed: false,
  },
  evidenceSources: [
    {
      role: "cognitive_interview_method",
      title: "CDC CCQDER Cognitive Interviewing",
      url: "https://www.cdc.gov/nchs/ccqder/question-evaluation/cognitive-interviewing.html",
    },
    {
      role: "question_evaluation_quality",
      title: "CDC CCQDER Question Evaluation",
      url: "https://www.cdc.gov/nchs/ccqder/question-evaluation/index.html",
    },
    {
      role: "study_governance",
      title: "OMB Standards and Guidelines for Cognitive Interviews",
      url: "https://wwwn.cdc.gov/qbank/learn/CI-standards.aspx",
    },
    {
      role: "content_validity_framework",
      title: "COSMIN methodology for content validity",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5891557/",
    },
  ],
});

export type GateCItemOutcome = {
  decision: (typeof gateCItemDecisions)[number];
  finalRevisionConfirmed: boolean;
  mandatoryProbesComplete: boolean;
  observationCount: number;
  retestObservationCount: number;
  retestRequired: boolean;
  subgroupGap: boolean;
  unresolvedCriticalIssueCount: number;
  unresolvedMaterialIssueCount: number;
};

export type GateCReviewOutcome = {
  completedRounds: number;
  itemOutcomes: readonly GateCItemOutcome[];
  recruitmentCoverageComplete: boolean;
  unresolvedGlobalUiIssueCount: number;
};

export function canPassGateCCognitiveReview(outcome: GateCReviewOutcome) {
  const protocol = gateCCognitiveProtocol;

  return (
    outcome.completedRounds >=
      protocol.rounds.minimumCompletedRoundsForPassing &&
    outcome.recruitmentCoverageComplete &&
    outcome.unresolvedGlobalUiIssueCount === 0 &&
    outcome.itemOutcomes.length === 60 &&
    outcome.itemOutcomes.every(
      (item) =>
        item.decision === "KEEP_FOR_PILOT" &&
        item.finalRevisionConfirmed &&
        item.mandatoryProbesComplete &&
        item.observationCount >=
          protocol.evidence.minimumObservationsPerFinalItem &&
        (!item.retestRequired ||
          item.retestObservationCount >=
            protocol.evidence.minimumNewObservationsAfterRevision) &&
        !item.subgroupGap &&
        item.unresolvedMaterialIssueCount === 0 &&
        item.unresolvedCriticalIssueCount === 0,
    )
  );
}
