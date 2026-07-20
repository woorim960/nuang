import { z } from "zod";
import { candidateRoleNames } from "@/features/nuang-code/candidate-profile-names";
import {
  nuangCodeSchema,
  relationshipContextSchema,
  traitRequiredSignalSchema,
} from "@/features/nuang-code/trait-map-knowledge-contract";

export const traitMapContentContractVersion = "nuang-trait-map-content.v1";
export const traitMapContentReleaseId = "NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT";

export const traitMapAxisIds = ["SE", "OE", "RO", "SM", "ER"] as const;
export const traitMapFacetIds = [
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
] as const;

export const traitMapContentSurfaces = [
  "map_explorer",
  "personal_report",
  "comparison_report",
  "public_profile",
  "evidence_page",
] as const;

export const traitMapContentSlots = [
  "summary",
  "measured_definition",
  "not_measured_boundary",
  "role_name_meaning",
  "five_axis_breakdown",
  "facet_breakdown",
  "inner_thought",
  "observable_response",
  "daily_life",
  "family",
  "friend",
  "partner",
  "person_of_interest",
  "work",
  "strength",
  "friction",
  "possible_misread",
  "support_preference",
  "conversation_prompt",
  "growth_practice",
  "limitation",
  "evidence_note",
] as const;

const traitMapAxisIdSchema = z.enum(traitMapAxisIds);
const traitMapFacetIdSchema = z.enum(traitMapFacetIds);
const traitMapContentSurfaceSchema = z.enum(traitMapContentSurfaces);
const traitMapContentSlotSchema = z.enum(traitMapContentSlots);

const reviewStateSchema = z.enum(["not_started", "in_review", "passed"]);
const publicationStateSchema = z.enum([
  "research_only",
  "review_candidate",
  "approved",
  "published",
  "retired",
]);

export const traitMapAxisDefinitionSchema = z.object({
  axisId: traitMapAxisIdSchema,
  codePosition: z.number().int().min(1).max(5),
  displayLabel: z.string().min(1),
  facetIds: z.array(traitMapFacetIdSchema).min(1),
  leftSymbol: z.enum(["E", "R", "G", "K", "C"]),
  measurementStatus: z.literal("research_candidate_not_validated"),
  rightSymbol: z.enum(["I", "N", "A", "M", "Q"]),
  scoringHighSymbol: z.enum(["E", "N", "A", "K", "Q"]),
  scoringLowSymbol: z.enum(["I", "R", "G", "M", "C"]),
});

export const traitMapFacetDefinitionSchema = z.object({
  axisId: traitMapAxisIdSchema,
  excludedMeanings: z.array(z.string().min(1)).min(1),
  facetId: traitMapFacetIdSchema,
  includedMeaning: z.string().min(1),
  label: z.string().min(1),
  measurementStatus: z.literal("research_candidate_not_validated"),
});

export const traitMapRoleProfileSchema = z.object({
  code: nuangCodeSchema,
  namePurpose: z.literal("memory_aid_not_scoring_evidence"),
  profileName: z.string().min(1),
  publicationState: z.literal("research_only"),
});

export const traitMapContentAtomSchema = z
  .object({
    atomId: z
      .string()
      .regex(/^tmc\.v1\.[a-z0-9._-]+$/, "성향지도 콘텐츠 ID 형식이 아니에요."),
    claimRefs: z.array(z.string().min(1)),
    context: relationshipContextSchema,
    copy: z.object({
      long: z.string().min(1).optional(),
      short: z.string().min(1),
      standard: z.string().min(1).optional(),
    }),
    entity: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("axis"), ref: traitMapAxisIdSchema }),
      z.object({ kind: z.literal("facet"), ref: traitMapFacetIdSchema }),
      z.object({ kind: z.literal("role_profile"), ref: nuangCodeSchema }),
    ]),
    evidenceRefs: z.array(z.string().min(1)),
    privacyScope: z.enum(["self_only", "comparison_safe", "public_safe"]),
    publicationState: publicationStateSchema,
    requiredSignals: z.array(traitRequiredSignalSchema),
    reviews: z.object({
      measurement: reviewStateSchema,
      plainLanguage: reviewStateSchema,
      productSafety: reviewStateSchema,
      psychology: reviewStateSchema,
    }),
    slot: traitMapContentSlotSchema,
    surfaces: z.array(traitMapContentSurfaceSchema).min(1),
    version: z.number().int().min(1),
  })
  .superRefine((atom, context) => {
    const customerVisible =
      atom.publicationState === "approved" ||
      atom.publicationState === "published";
    if (customerVisible && atom.claimRefs.length === 0) {
      context.addIssue({
        code: "custom",
        message: "고객에게 보이는 문구에는 승인 근거 claim이 필요해요.",
        path: ["claimRefs"],
      });
    }
    if (customerVisible && atom.evidenceRefs.length === 0) {
      context.addIssue({
        code: "custom",
        message: "고객에게 보이는 문구에는 추적 가능한 근거가 필요해요.",
        path: ["evidenceRefs"],
      });
    }
    if (
      atom.publicationState === "published" &&
      Object.values(atom.reviews).some((review) => review !== "passed")
    ) {
      context.addIssue({
        code: "custom",
        message: "모든 필수 검토를 통과한 콘텐츠만 게시할 수 있어요.",
        path: ["reviews"],
      });
    }
    if (
      atom.privacyScope === "self_only" &&
      atom.surfaces.some(
        (surface) =>
          surface === "comparison_report" || surface === "public_profile",
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "본인 전용 정보는 비교 리포트나 공개 프로필에 노출할 수 없어요.",
        path: ["surfaces"],
      });
    }
    if (
      (atom.slot === "inner_thought" || atom.slot === "observable_response") &&
      atom.privacyScope !== "self_only"
    ) {
      context.addIssue({
        code: "custom",
        message:
          "처음 드는 생각과 실제 나타나는 반응은 본인 전용으로 시작해요.",
        path: ["privacyScope"],
      });
    }
    if (
      atom.context !== "general" &&
      !atom.requiredSignals.includes("relationship_context")
    ) {
      context.addIssue({
        code: "custom",
        message: "관계별 문구에는 관계 맥락 신호가 필요해요.",
        path: ["requiredSignals"],
      });
    }
  });

export const traitMapContentManifestSchema = z
  .object({
    axes: z.array(traitMapAxisDefinitionSchema).length(5),
    contentAtoms: z.array(traitMapContentAtomSchema),
    contractVersion: z.literal(traitMapContentContractVersion),
    facets: z.array(traitMapFacetDefinitionSchema).length(10),
    releaseId: z.string().min(1),
    roleProfiles: z.array(traitMapRoleProfileSchema).length(32),
    status: z.literal("design_contract_not_customer_content"),
  })
  .superRefine((manifest, context) => {
    addExactInventoryIssues(
      manifest.axes.map((axis) => axis.axisId),
      traitMapAxisIds,
      "axes",
      context,
    );
    addExactInventoryIssues(
      manifest.facets.map((facet) => facet.facetId),
      traitMapFacetIds,
      "facets",
      context,
    );
    addExactInventoryIssues(
      manifest.roleProfiles.map((profile) => profile.code),
      expectedRoleCodes,
      "roleProfiles",
      context,
    );
    addDuplicateIssues(
      manifest.contentAtoms.map((atom) => atom.atomId),
      "contentAtoms",
      context,
    );

    const axes = new Map(manifest.axes.map((axis) => [axis.axisId, axis]));
    manifest.facets.forEach((facet, index) => {
      if (!axes.get(facet.axisId)?.facetIds.includes(facet.facetId)) {
        context.addIssue({
          code: "custom",
          message: `${facet.facetId}이 ${facet.axisId} 축에 연결되지 않았어요.`,
          path: ["facets", index, "axisId"],
        });
      }
    });
  });

export const expectedRoleCodes = Object.keys(candidateRoleNames).sort();

export const traitMapContentManifestV1 = {
  axes: [
    axis("SE", 1, "사람 사이 에너지", ["SE-RE", "SE-AI"], "E", "I", "E", "I"),
    axis(
      "OE",
      2,
      "생각과 탐색",
      ["OE-AE", "OE-CI", "OE-IE"],
      "R",
      "N",
      "N",
      "R",
    ),
    axis("RO", 3, "관계에서 관심이 가는 곳", ["RO-EC"], "G", "A", "A", "G"),
    axis("SM", 4, "일상을 꾸리는 방식", ["SM-EP", "SM-OS"], "K", "M", "K", "M"),
    axis("ER", 5, "걱정과 감정 반응", ["ER-IR", "ER-WD"], "C", "Q", "Q", "C"),
  ],
  contentAtoms: [],
  contractVersion: traitMapContentContractVersion,
  facets: [
    facet(
      "SE-RE",
      "SE",
      "함께할 때의 에너지",
      "교류 중·후의 활력 변화와 관여",
      ["친구 수", "인기", "사교 능력"],
    ),
    facet(
      "SE-AI",
      "SE",
      "먼저 표현하기",
      "필요한 의견·요청·선택지를 먼저 꺼내는 경향",
      ["발표 능력", "리더십 능력", "설득력"],
    ),
    facet(
      "OE-AE",
      "OE",
      "미적 경험",
      "분위기·음악·장면의 미적 인상에 관심을 두는 정도",
      ["예술 능력", "감각의 정확도"],
    ),
    facet(
      "OE-CI",
      "OE",
      "상상 확장",
      "현재 정보 너머의 장면·이야기·가능성을 펼치는 정도",
      ["창의적 성과", "아이디어 품질"],
    ),
    facet(
      "OE-IE",
      "OE",
      "지적 탐구",
      "필요한 답을 넘어 원리·배경·다른 설명을 탐색하는 정도",
      ["지능", "학업 성취", "이해 속도"],
    ),
    facet(
      "RO-EC",
      "RO",
      "관계 주의 방향",
      "관계 장면에서 원인·해결과 상대 감정·필요 중 관심이 가는 방향",
      ["착함", "공감 능력", "문제 해결 능력"],
    ),
    facet("SM-EP", "SM", "실행·지속", "착수, 중단 뒤 복귀, 지속의 경향", [
      "책임감",
      "도덕성",
      "성과",
    ]),
    facet(
      "SM-OS",
      "SM",
      "질서·구조",
      "물건·시간·절차를 정돈하고 미리 구조화하는 경향",
      ["완성 능력", "유연성의 우열"],
    ),
    facet(
      "ER-IR",
      "ER",
      "감정 동요",
      "일상적 불편 정서가 활성화되는 속도와 크기",
      ["정신건강 진단", "회복력", "감정조절 능력"],
    ),
    facet(
      "ER-WD",
      "ER",
      "걱정·주저",
      "부정적 가능성이 반복되고 선택 전에 주저하는 정도",
      ["위험 탐지 능력", "신중함의 우열"],
    ),
  ],
  releaseId: traitMapContentReleaseId,
  roleProfiles: expectedRoleCodes.map((code) => ({
    code,
    namePurpose: "memory_aid_not_scoring_evidence" as const,
    profileName: candidateRoleNames[code],
    publicationState: "research_only" as const,
  })),
  status: "design_contract_not_customer_content" as const,
};

function axis(
  axisId: (typeof traitMapAxisIds)[number],
  codePosition: number,
  displayLabel: string,
  facetIds: (typeof traitMapFacetIds)[number][],
  leftSymbol: "E" | "R" | "G" | "K" | "C",
  rightSymbol: "I" | "N" | "A" | "M" | "Q",
  scoringHighSymbol: "E" | "N" | "A" | "K" | "Q",
  scoringLowSymbol: "I" | "R" | "G" | "M" | "C",
) {
  return {
    axisId,
    codePosition,
    displayLabel,
    facetIds,
    leftSymbol,
    measurementStatus: "research_candidate_not_validated" as const,
    rightSymbol,
    scoringHighSymbol,
    scoringLowSymbol,
  };
}

function facet(
  facetId: (typeof traitMapFacetIds)[number],
  axisId: (typeof traitMapAxisIds)[number],
  label: string,
  includedMeaning: string,
  excludedMeanings: string[],
) {
  return {
    axisId,
    excludedMeanings,
    facetId,
    includedMeaning,
    label,
    measurementStatus: "research_candidate_not_validated" as const,
  };
}

function addExactInventoryIssues(
  actual: readonly string[],
  expected: readonly string[],
  path: string,
  context: z.RefinementCtx,
) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (
    actualSorted.length !== expectedSorted.length ||
    actualSorted.some((value, index) => value !== expectedSorted[index])
  ) {
    context.addIssue({
      code: "custom",
      message: `${path}의 필수 항목이 빠졌거나 중복됐어요.`,
      path: [path],
    });
  }
}

function addDuplicateIssues(
  values: readonly string[],
  path: string,
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      context.addIssue({
        code: "custom",
        message: `중복 콘텐츠 ID: ${value}`,
        path: [path, index],
      });
    }
    seen.add(value);
  });
}

export type TraitMapContentAtomV1 = z.infer<typeof traitMapContentAtomSchema>;
export type TraitMapContentManifestV1 = z.infer<
  typeof traitMapContentManifestSchema
>;
