import { z } from "zod";

export const traitMapKnowledgeContractVersion =
  "nuang-trait-map-knowledge.v0.1";
export const comparisonKnowledgeContractVersion =
  "nuang-comparison-knowledge.v0.1";

export const nuangCodeSchema = z
  .string()
  .regex(/^[EI][RN][GA][KM][CQ]$/, "현재 뉴앙 5자리 코드 형식이 아니에요.");

export const relationshipContextSchema = z.enum([
  "general",
  "family",
  "friend",
  "partner",
  "person_of_interest",
  "work",
]);

export const knowledgeEvidenceSchema = z.object({
  evidenceId: z.string().min(1),
  locator: z.string().min(1),
  note: z.string().min(1),
  sourceType: z.enum([
    "meta_analysis",
    "systematic_review",
    "peer_reviewed_study",
    "instrument_manual",
    "measurement_analysis",
    "expert_review",
    "nuang_observation",
  ]),
});

export const traitKnowledgeClaimSchema = z.object({
  claimId: z.string().min(1),
  claimKind: z.enum([
    "definition",
    "inner_thought",
    "observable_response",
    "strength",
    "friction",
    "possible_misread",
    "support_preference",
    "conversation_prompt",
    "growth_practice",
    "boundary",
  ]),
  confidence: z.enum([
    "theory_informed",
    "preliminary",
    "supported",
    "validated",
  ]),
  contentKey: z.string().min(1),
  contexts: z.array(relationshipContextSchema).min(1),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  longCopy: z.string().min(1),
  shortCopy: z.string().min(1),
});

const traitMapReviewSchema = z.object({
  contradictionAudit: z.enum(["not_started", "in_review", "passed"]),
  deduplication: z.enum(["not_started", "in_review", "passed"]),
  measurement: z.enum(["not_started", "in_review", "passed"]),
  plainLanguage: z.enum(["not_started", "in_review", "passed"]),
  productSafety: z.enum(["not_started", "in_review", "passed"]),
  psychology: z.enum(["not_started", "in_review", "passed"]),
});

const traitMapSectionSchema = z.object({
  body: z.string().min(1),
  claimRefs: z.array(z.string().min(1)),
  sectionId: z.enum([
    "overview",
    "role_name",
    "five_code_positions",
    "code_interactions",
    "inner_thought_and_response",
    "daily_life",
    "family",
    "friend",
    "partner",
    "person_of_interest",
    "work",
    "stress_and_recovery",
    "strengths_and_growth",
    "misunderstandings",
    "communication_guide",
    "limitations_and_evidence",
  ]),
  title: z.string().min(1),
});

export const traitMapEntrySchema = z
  .object({
    claims: z.array(traitKnowledgeClaimSchema).min(1),
    code: nuangCodeSchema,
    contractVersion: z.literal(traitMapKnowledgeContractVersion),
    evidence: z.array(knowledgeEvidenceSchema).min(1),
    longFormCharacterTarget: z.literal(50_000),
    mapVersion: z.string().min(1),
    profileName: z.string().min(1),
    reviews: traitMapReviewSchema,
    sections: z.array(traitMapSectionSchema).min(1),
    status: z.enum(["draft", "in_review", "approved", "published"]),
    updatedAt: z.string().datetime(),
  })
  .superRefine((entry, context) => {
    addDuplicateIssues(
      entry.claims.map((claim) => claim.claimId),
      "claims",
      "claimId",
      context,
    );
    addDuplicateIssues(
      entry.claims.map((claim) => claim.contentKey),
      "claims",
      "contentKey",
      context,
    );
    addDuplicateIssues(
      entry.evidence.map((evidence) => evidence.evidenceId),
      "evidence",
      "evidenceId",
      context,
    );
    addDuplicateIssues(
      entry.sections.map((section) => section.sectionId),
      "sections",
      "sectionId",
      context,
    );

    const claimIds = new Set(entry.claims.map((claim) => claim.claimId));
    const evidenceIds = new Set(
      entry.evidence.map((evidence) => evidence.evidenceId),
    );
    entry.claims.forEach((claim, claimIndex) => {
      claim.evidenceRefs.forEach((evidenceRef) => {
        if (!evidenceIds.has(evidenceRef)) {
          context.addIssue({
            code: "custom",
            message: `claim이 존재하지 않는 evidence ${evidenceRef}을 참조해요.`,
            path: ["claims", claimIndex, "evidenceRefs"],
          });
        }
      });
    });
    entry.sections.forEach((section, sectionIndex) => {
      section.claimRefs.forEach((claimRef) => {
        if (!claimIds.has(claimRef)) {
          context.addIssue({
            code: "custom",
            message: `성향지도 섹션이 존재하지 않는 claim ${claimRef}을 참조해요.`,
            path: ["sections", sectionIndex, "claimRefs"],
          });
        }
      });
    });

    if (entry.status === "approved" || entry.status === "published") {
      const characterCount = entry.sections.reduce(
        (total, section) => total + section.body.replace(/\s/g, "").length,
        0,
      );
      if (characterCount < 45_000 || characterCount > 60_000) {
        context.addIssue({
          code: "custom",
          message:
            "승인된 성향지도 원문은 공백 제외 45,000~60,000자여야 해요.",
          path: ["sections"],
        });
      }

      const reviewsPassed = Object.values(entry.reviews).every(
        (review) => review === "passed",
      );
      if (!reviewsPassed) {
        context.addIssue({
          code: "custom",
          message: "모든 전문 검토를 통과해야 성향지도를 승인할 수 있어요.",
          path: ["reviews"],
        });
      }
    }
  });

export const pairInteractionRuleSchema = z
  .object({
    comparisonContractVersion: z.literal(comparisonKnowledgeContractVersion),
    contexts: z.array(relationshipContextSchema).min(1),
    derivedFromMapVersions: z.array(z.string().min(1)).min(2),
    frictionClaimRefs: z.array(z.string().min(1)),
    interactionVersion: z.string().min(1),
    promptClaimRefs: z.array(z.string().min(1)),
    ruleId: z.string().min(1),
    strengthClaimRefs: z.array(z.string().min(1)),
    targetCode: nuangCodeSchema,
    viewerCode: nuangCodeSchema,
  })
  .superRefine((rule, context) => {
    const claimRefs = [
      ...rule.strengthClaimRefs,
      ...rule.frictionClaimRefs,
      ...rule.promptClaimRefs,
    ];
    addDuplicateIssues(claimRefs, "claimRefs", "claimRef", context);
  });

function addDuplicateIssues(
  values: string[],
  path: string,
  label: string,
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      context.addIssue({
        code: "custom",
        message: `중복 ${label}: ${value}`,
        path: [path, index],
      });
    }
    seen.add(value);
  });
}

export type TraitMapEntry = z.infer<typeof traitMapEntrySchema>;
export type PairInteractionRule = z.infer<typeof pairInteractionRuleSchema>;
