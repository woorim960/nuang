import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import type {
  TraitMapCustomerGuide,
  TraitMapCustomerGuideChapter,
} from "@/features/nuang-code/trait-map-customer-guide-contract";
import {
  getArchivedTraitMapCustomerGuide,
  getCustomerApprovedTraitMapGuide,
} from "@/features/nuang-code/trait-map-customer-guide-registry";
import {
  getTraitMapResultSummaryPublicationByDigestV2,
  resolveTraitMapResultSummaryV2,
  type ResolvedTraitMapResultSummaryClaimV2,
} from "@/features/nuang-code/trait-map-result-summary-publication-v2";
import {
  buildPrecisionFacetInsights,
  type PrecisionFacetInsight,
} from "@/features/result/precision-report-insights";
import type { CoreResultReportModel } from "./core-result-report-model";
import {
  buildCoreResultExcerpt,
  findCoreResultExcerptChapter,
  type CoreResultExcerptManifest,
} from "./core-result-excerpt-manifest";

type ContextGroupId =
  "thought" | "daily" | "work" | "recovery" | "relationships";

export type CoreResultContextGroup = {
  chapters: TraitMapCustomerGuideChapter[];
  id: ContextGroupId;
  label: string;
  summary: string;
};

export type CoreResultContentBundle = {
  actionExperiments: ResolvedTraitMapResultSummaryClaimV2[];
  canonicalInsights: ResolvedTraitMapResultSummaryClaimV2[];
  combinedPatternChapter: TraitMapCustomerGuideChapter | null;
  corePatternChapter: TraitMapCustomerGuideChapter | null;
  evidenceChapter: TraitMapCustomerGuideChapter | null;
  excerptManifest: CoreResultExcerptManifest | null;
  facetInsights: PrecisionFacetInsight[];
  fiveLettersChapter: TraitMapCustomerGuideChapter | null;
  guide: TraitMapCustomerGuide | null;
  heroSummary: string | null;
  lifeContextGroups: CoreResultContextGroup[];
  misreadChapter: TraitMapCustomerGuideChapter | null;
  overview: ReadonlyArray<{ label: string; text: string }>;
  overuseCosts: ResolvedTraitMapResultSummaryClaimV2[];
  profileAccessibleName: string;
  reflectionQuestion: string | null;
  relationshipContextGroup: CoreResultContextGroup | null;
  showFiveLetterExplorer: boolean;
  showMapBridge: boolean;
  showReadingGuide: boolean;
  strengthAndGrowthChapter: TraitMapCustomerGuideChapter | null;
};

const contextGroupDefinitions: ReadonlyArray<{
  id: ContextGroupId;
  label: string;
  slots: TraitMapCustomerGuideChapter["slot"][];
}> = [
  {
    id: "thought",
    label: "생각에서 행동까지",
    slots: ["thought_and_response"],
  },
  { id: "daily", label: "평소 생활", slots: ["daily_life"] },
  { id: "work", label: "일과 공부", slots: ["work"] },
  {
    id: "recovery",
    label: "스트레스와 회복",
    slots: ["stress_and_recovery"],
  },
];

const relationshipGroupDefinition = {
  id: "relationships",
  label: "관계마다 나타나는 모습",
  slots: ["person_of_interest", "partner", "family", "friend"],
} as const satisfies {
  id: ContextGroupId;
  label: string;
  slots: TraitMapCustomerGuideChapter["slot"][];
};

/**
 * 공통 결과 모델을 현재 제품에 이미 게시된 문장만으로 조립합니다.
 * 새 개인화 문장이나 행동 조언은 만들지 않고, 없는 섹션은 그대로 생략합니다.
 */
export function assembleCoreResultContent(
  model: CoreResultReportModel,
): CoreResultContentBundle {
  const profile = getCandidateProfileDefinition(model.result.code);
  const publishedGuide = getCustomerApprovedTraitMapGuide(model.result.code);
  const guide = model.interpretation.guideVersion
    ? (getArchivedTraitMapCustomerGuide(
        model.result.code,
        model.interpretation.guideVersion,
      ) ?? publishedGuide)
    : publishedGuide;
  const isPrecision = model.identity.kind === "full";
  const showProfileOverview = hasRenderableSection(model, "profile_overview");
  const showPrecisionSignals = hasRenderableSection(model, "precision_signals");
  const showContexts = hasRenderableSection(model, "life_contexts");
  const showStrengthAndGrowth = hasRenderableSection(
    model,
    "strength_and_overuse",
  );
  const showMisread = hasRenderableSection(model, "misread_and_conversation");
  const showEvidence = hasRenderableSection(model, "evidence_references");
  const canUsePublishedGuide =
    model.interpretation.contentResolution === "completion_snapshot" ||
    model.interpretation.contentResolution ===
      "current_customer_guide_fallback";
  const canRenderGuideExcerpt = Boolean(
    canUsePublishedGuide &&
    guide &&
    (showContexts || showStrengthAndGrowth || showMisread || showEvidence),
  );
  const excerpt =
    canRenderGuideExcerpt && guide
      ? buildCoreResultExcerpt(guide, model.identity.kind)
      : null;
  const strengthAndGrowthChapter =
    canUsePublishedGuide && showStrengthAndGrowth && excerpt
      ? findCoreResultExcerptChapter(excerpt, "strength_and_growth")
      : null;
  const heroSummary = showProfileOverview
    ? ((canUsePublishedGuide ? guide?.heroSummary : null) ??
      profile?.overview[0]?.text ??
      null)
    : null;
  const canonicalClaims = resolveCanonicalClaims(model);

  return {
    actionExperiments: canonicalClaims.filter(
      (claim) => claim.placement === "action_experiment",
    ),
    canonicalInsights: canonicalClaims.filter(
      (claim) => claim.placement === "headline",
    ),
    combinedPatternChapter: excerpt
      ? findCoreResultExcerptChapter(excerpt, "combined_pattern")
      : null,
    corePatternChapter: excerpt
      ? findCoreResultExcerptChapter(excerpt, "core_pattern")
      : null,
    evidenceChapter:
      canUsePublishedGuide && showEvidence && guide
        ? findChapter(guide, "evidence")
        : null,
    excerptManifest: excerpt?.manifest ?? null,
    facetInsights:
      isPrecision && showPrecisionSignals
        ? buildPrecisionFacetInsights(model.result.facets)
        : [],
    fiveLettersChapter: excerpt
      ? findCoreResultExcerptChapter(excerpt, "five_letters")
      : null,
    guide: canRenderGuideExcerpt ? guide : null,
    heroSummary,
    lifeContextGroups:
      canUsePublishedGuide && showContexts && excerpt
        ? buildContextGroups(excerpt.chapters, contextGroupDefinitions)
        : [],
    misreadChapter:
      canUsePublishedGuide && showMisread && excerpt
        ? findCoreResultExcerptChapter(excerpt, "misread_and_conversation")
        : null,
    overview: showProfileOverview
      ? buildOverviewFlow(strengthAndGrowthChapter, profile?.overview ?? [])
      : [],
    overuseCosts: canonicalClaims.filter(
      (claim) => claim.placement === "overuse_cost",
    ),
    profileAccessibleName:
      profile?.accessibleName ??
      `${model.result.currentProfileName}, 뉴앙 코드 ${model.result.code}`,
    reflectionQuestion:
      (excerpt
        ? findCoreResultExcerptChapter(excerpt, "strength_and_growth")
            ?.checkQuestion
        : null) ?? null,
    relationshipContextGroup:
      canUsePublishedGuide && showContexts && excerpt
        ? (buildContextGroups(excerpt.chapters, [
            relationshipGroupDefinition,
          ])[0] ?? null)
        : null,
    showFiveLetterExplorer: hasRenderableSection(model, "five_letter_explorer"),
    showMapBridge: hasRenderableSection(model, "map_bridge"),
    showReadingGuide: hasRenderableSection(model, "reading_guide"),
    strengthAndGrowthChapter,
  };
}

function buildOverviewFlow(
  strengthChapter: TraitMapCustomerGuideChapter | null,
  fallback: ReadonlyArray<{ label: string; text: string }>,
) {
  if (!strengthChapter) return fallback;

  const sections = strengthChapter.sections;
  const firstSection = sections[0];
  const overuseSection = sections.find((section) =>
    /많이 쓰|과해|부담|막히|지나치/.test(section.title),
  );
  const adjustmentSection = sections.find((section) =>
    /균형|편안|성장|작은 행동|방법/.test(section.title),
  );
  const lastSection = sections.at(-1);
  const strength = firstSection?.paragraphs[0];
  const cost =
    overuseSection?.paragraphs[0] ?? firstSection?.paragraphs[1] ?? null;
  const adjustment =
    adjustmentSection?.paragraphs[0] ?? lastSection?.paragraphs.at(-1) ?? null;

  if (!strength || !cost || !adjustment) return fallback;

  return [
    { label: "자연스럽게 잘하는 것", text: strength },
    { label: "과해지면 생기는 일", text: cost },
    { label: "조금 더 편해지는 방법", text: adjustment },
  ];
}

function resolveCanonicalClaims(model: CoreResultReportModel) {
  if (
    !model.interpretation.manifestDigest ||
    model.interpretation.canonicalRefs.length === 0
  ) {
    return [];
  }

  const publication = getTraitMapResultSummaryPublicationByDigestV2(
    model.interpretation.manifestDigest,
  );
  if (!publication) return [];
  const allowedRefs = new Set(
    model.interpretation.canonicalRefs.map(
      (ref) => `${ref.canonicalVariantId}|${ref.version}|${ref.contentKey}`,
    ),
  );
  const renderableCanonicalSections = new Set(
    model.sections
      .filter(
        (section) =>
          section.availability === "render" &&
          section.sourceClass === "approved_canonical",
      )
      .map(
        (section) =>
          `${section.canonicalVariantId}|${section.canonicalVersion}|${section.contentKey}`,
      ),
  );

  return resolveTraitMapResultSummaryV2({
    code: model.result.code,
    publication,
  }).claims.filter((claim) => {
    const identity = `${claim.canonicalVariantId}|${claim.version}|${claim.contentKey}`;
    return (
      allowedRefs.has(identity) && renderableCanonicalSections.has(identity)
    );
  });
}

function hasRenderableSection(
  model: CoreResultReportModel,
  sectionSuffix: string,
) {
  return model.sections.some(
    (section) =>
      section.availability === "render" &&
      (section.sectionId === sectionSuffix ||
        section.sectionId.endsWith(`_${sectionSuffix}`)),
  );
}

function buildContextGroups(
  chapters: TraitMapCustomerGuideChapter[],
  definitions: ReadonlyArray<{
    id: ContextGroupId;
    label: string;
    slots: readonly TraitMapCustomerGuideChapter["slot"][];
  }>,
): CoreResultContextGroup[] {
  return definitions.flatMap((definition) => {
    const groupChapters = definition.slots.flatMap((slot) => {
      const chapter = chapters.find((candidate) => candidate.slot === slot);
      return chapter ? [chapter] : [];
    });

    if (groupChapters.length === 0) return [];

    return [
      {
        chapters: groupChapters,
        id: definition.id,
        label: definition.label,
        summary: groupChapters[0].summary,
      },
    ];
  });
}

function findChapter(
  guide: TraitMapCustomerGuide,
  slot: TraitMapCustomerGuideChapter["slot"],
) {
  return guide.chapters.find((chapter) => chapter.slot === slot) ?? null;
}
