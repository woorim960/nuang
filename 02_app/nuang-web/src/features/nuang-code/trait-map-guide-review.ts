import { validatePublicLanguageText } from "@/features/copy/public-language-validation";
import type {
  TraitMapCustomerGuide,
  TraitMapCustomerGuideChapter,
} from "@/features/nuang-code/trait-map-customer-guide-contract";
import {
  traitMapGuideBetaReleaseId,
  traitMapGuideReviewContractVersion,
  traitMapGuideReviewRoleCopy,
  traitMapGuideReviewRoles,
  type TraitMapGuideReviewRole,
  type TraitMapGuideReviewUnitKind,
} from "@/features/nuang-code/trait-map-guide-review-contract";

export type TraitMapGuideAiReviewDecision = Readonly<{
  decision: "approve" | "hold" | "reject" | "revise";
  issueCodes: readonly string[];
  rationale: string;
  role: TraitMapGuideReviewRole;
  score: 0 | 1 | 2 | 3 | 4;
}>;

export type TraitMapGuideReviewUnit = Readonly<{
  chapterId: string | null;
  chapterLabel: string | null;
  chapterSlot: TraitMapCustomerGuideChapter["slot"] | null;
  contentHash: string;
  evidenceRefs: readonly string[];
  guideVersion: string;
  kind: TraitMapGuideReviewUnitKind;
  paragraphIndex: number | null;
  profileCode: string;
  reviewDecisions: readonly TraitMapGuideAiReviewDecision[];
  sectionIndex: number | null;
  sectionTitle: string | null;
  sentenceIndex: number | null;
  text: string;
  unitKey: string;
}>;

export type TraitMapGuideAiReviewProfile = Readonly<{
  approved: boolean;
  chapterCount: number;
  contentDigest: string;
  guideVersion: string;
  issueCounts: Readonly<Record<string, number>>;
  profileCode: string;
  releaseId: string;
  roleCounts: Readonly<
    Record<
      TraitMapGuideReviewRole,
      Readonly<{ approved: number; blocked: number }>
    >
  >;
  unitCount: number;
  units?: readonly TraitMapGuideReviewUnit[];
}>;

const absoluteClaimPatterns = [
  /(?:항상|절대|반드시|무조건|틀림없이)/u,
  /(?:타고난|본질적으로|원래부터).{0,12}(?:사람|성격|능력)/u,
] as const;

const abilityPredictionPatterns = [
  /(?:지능|리더십|성공|성과가 높|실력이 뛰|능력이 좋|일을 더 잘)/u,
  /(?:안정적으로 실력을 내|능력을 발휘|재능이 있)/u,
  /(?:직업|학업|관계).{0,16}(?:보장|예측|결정)/u,
] as const;

const safetyBlockerPatterns = [
  /(?:정상|비정상|우월|열등|착한 사람|나쁜 사람)/u,
  /(?:정신질환|정신병|장애가 있|치료가 필요|진단할 수)/u,
  /(?:상대는 분명|상대가 틀림없이|상대의 속마음은)/u,
] as const;

const unsupportedRelationshipPatterns = [
  /(?:사랑의 크기|관계 성공|헤어질|결혼할|바람을|호감이 확실)/u,
  /(?:갈등이 줄|오해가 크게 줄|관계가 좋아져)/u,
  /(?:상대 마음을 알 수|상대가 나를 좋아)/u,
] as const;

const forcedUniquenessPattern = /의 ‘[^’]+’ 장면에서는/u;
const unresolvedTokenPattern = /(?:TODO|TBD|FIXME|\{\{?|<[^>]+>)/iu;

export function reviewTraitMapGuideForBeta(
  guide: TraitMapCustomerGuide,
  options: Readonly<{ includeUnits?: boolean }> = {},
): TraitMapGuideAiReviewProfile {
  const baseUnits = createTraitMapGuideReviewUnits(guide);
  const sentenceSignatureCounts = baseUnits.reduce<Map<string, number>>(
    (counts, unit) => {
      if (unit.kind !== "paragraph_sentence") return counts;
      const signature = sentenceSignature(unit.text);
      if (signature.length < 30) return counts;
      counts.set(signature, (counts.get(signature) ?? 0) + 1);
      return counts;
    },
    new Map(),
  );
  const repeatedSentenceSignatures = new Set(
    [...sentenceSignatureCounts]
      .filter(([, count]) => count > 1)
      .map(([signature]) => signature),
  );
  const issueCounts: Record<string, number> = {};
  const roleCounts = Object.fromEntries(
    traitMapGuideReviewRoles.map((role) => [role, { approved: 0, blocked: 0 }]),
  ) as Record<TraitMapGuideReviewRole, { approved: number; blocked: number }>;
  const units = baseUnits.map((unit): TraitMapGuideReviewUnit => {
    const repeatedSentence =
      unit.kind === "paragraph_sentence" &&
      repeatedSentenceSignatures.has(sentenceSignature(unit.text));
    const reviewDecisions = traitMapGuideReviewRoles.map((role) =>
      reviewUnitForRole(unit, role, { repeatedSentence }),
    );
    for (const decision of reviewDecisions) {
      if (decision.decision === "approve") {
        roleCounts[decision.role].approved += 1;
      } else {
        roleCounts[decision.role].blocked += 1;
      }
      for (const code of decision.issueCodes) {
        issueCounts[code] = (issueCounts[code] ?? 0) + 1;
      }
    }
    return { ...unit, reviewDecisions };
  });
  const approved = units.every((unit) =>
    unit.reviewDecisions.every((decision) => decision.decision === "approve"),
  );
  const contentDigest = stableDigest(
    units.map((unit) => `${unit.unitKey}:${unit.contentHash}`).join("\n"),
  );

  return {
    approved,
    chapterCount: guide.chapters.length,
    contentDigest,
    guideVersion: guide.version,
    issueCounts,
    profileCode: guide.code,
    releaseId: traitMapGuideBetaReleaseId,
    roleCounts,
    unitCount: units.length,
    ...(options.includeUnits ? { units } : {}),
  };
}

export function createTraitMapGuideReviewUnits(guide: TraitMapCustomerGuide) {
  const evidenceRefs = guide.chapters
    .flatMap((chapter) => chapter.references ?? [])
    .map((reference) => reference.href);
  const units: Array<Omit<TraitMapGuideReviewUnit, "reviewDecisions">> = [];

  pushUnit(units, guide, evidenceRefs, {
    kind: "hero_summary",
    text: guide.heroSummary,
  });

  for (const chapter of guide.chapters) {
    const chapterEvidenceRefs = resolveChapterEvidenceRefs(
      chapter.slot,
      evidenceRefs,
    );
    const chapterContext = {
      chapterId: chapter.id,
      chapterLabel: chapter.label,
      chapterSlot: chapter.slot,
    } as const;
    pushUnit(units, guide, chapterEvidenceRefs, {
      ...chapterContext,
      kind: "chapter_title",
      text: chapter.title,
    });
    pushUnit(units, guide, chapterEvidenceRefs, {
      ...chapterContext,
      kind: "chapter_summary",
      text: chapter.summary,
    });
    pushUnit(units, guide, chapterEvidenceRefs, {
      ...chapterContext,
      kind: "check_question",
      text: chapter.checkQuestion,
    });

    chapter.sections.forEach((section, sectionIndex) => {
      pushUnit(units, guide, chapterEvidenceRefs, {
        ...chapterContext,
        kind: "section_title",
        sectionIndex,
        sectionTitle: section.title,
        text: section.title,
      });
      section.paragraphs.forEach((paragraph, paragraphIndex) => {
        splitKoreanSentences(paragraph).forEach((sentence, sentenceIndex) => {
          pushUnit(units, guide, chapterEvidenceRefs, {
            ...chapterContext,
            kind: "paragraph_sentence",
            paragraphIndex,
            sectionIndex,
            sectionTitle: section.title,
            sentenceIndex,
            text: sentence,
          });
        });
      });
    });

    chapter.references?.forEach((reference, referenceIndex) => {
      const referenceContext = {
        ...chapterContext,
        evidenceRefs: [reference.href],
        paragraphIndex: referenceIndex,
      } as const;
      pushUnit(units, guide, chapterEvidenceRefs, {
        ...referenceContext,
        kind: "reference_title",
        text: reference.title,
      });
      pushUnit(units, guide, chapterEvidenceRefs, {
        ...referenceContext,
        kind: "reference_description",
        text: reference.description,
      });
    });
  }

  return units;
}

export function createTraitMapGuideReleaseDigest(
  profiles: readonly TraitMapGuideAiReviewProfile[],
) {
  return stableDigest(
    profiles
      .map((profile) => `${profile.profileCode}:${profile.contentDigest}`)
      .sort()
      .join("\n"),
  );
}

export function splitKoreanSentences(text: string) {
  const normalized = text.normalize("NFKC").replace(/\s+/g, " ").trim();
  const sentences =
    normalized
      .match(/[^.!?。！？]+[.!?。！？]?/gu)
      ?.map((item) => item.trim()) ?? [];
  return sentences.filter(Boolean);
}

function resolveChapterEvidenceRefs(
  slot: TraitMapCustomerGuideChapter["slot"],
  evidenceRefs: readonly string[],
) {
  if (slot === "evidence") return evidenceRefs;

  const pick = (...markers: string[]) =>
    evidenceRefs.filter((href) =>
      markers.some((marker) => href.includes(marker)),
    );
  if (["family", "friend", "partner", "person_of_interest"].includes(slot)) {
    return pick("16x6n05t", "80.6.1011", "20718544", "aera.net");
  }
  if (["thought_and_response", "stress_and_recovery"].includes(slot)) {
    return pick("16x6n05t", "80.6.1011", "9457784", "aera.net");
  }
  return pick("16x6n05t", "93.5.880", "80.6.1011", "aera.net");
}

function pushUnit(
  units: Array<Omit<TraitMapGuideReviewUnit, "reviewDecisions">>,
  guide: TraitMapCustomerGuide,
  defaultEvidenceRefs: readonly string[],
  input: Readonly<{
    chapterId?: string;
    chapterLabel?: string;
    chapterSlot?: TraitMapCustomerGuideChapter["slot"];
    evidenceRefs?: readonly string[];
    kind: TraitMapGuideReviewUnitKind;
    paragraphIndex?: number;
    sectionIndex?: number;
    sectionTitle?: string;
    sentenceIndex?: number;
    text: string;
  }>,
) {
  const chapterId = input.chapterId ?? null;
  const sectionIndex = input.sectionIndex ?? null;
  const paragraphIndex = input.paragraphIndex ?? null;
  const sentenceIndex = input.sentenceIndex ?? null;
  const unitKey = createTraitMapGuideUnitKey({
    chapterId,
    guideVersion: guide.version,
    kind: input.kind,
    paragraphIndex,
    profileCode: guide.code,
    sectionIndex,
    sentenceIndex,
  });
  units.push({
    chapterId,
    chapterLabel: input.chapterLabel ?? null,
    chapterSlot: input.chapterSlot ?? null,
    contentHash: stableDigest(input.text),
    evidenceRefs: input.evidenceRefs ?? defaultEvidenceRefs,
    guideVersion: guide.version,
    kind: input.kind,
    paragraphIndex,
    profileCode: guide.code,
    sectionIndex,
    sectionTitle: input.sectionTitle ?? null,
    sentenceIndex,
    text: input.text,
    unitKey,
  });
}

export function createTraitMapGuideUnitKey(
  input: Readonly<{
    chapterId?: string | null;
    guideVersion: string;
    kind: TraitMapGuideReviewUnitKind;
    paragraphIndex?: number | null;
    profileCode: string;
    sectionIndex?: number | null;
    sentenceIndex?: number | null;
  }>,
) {
  return [
    input.profileCode.trim().toUpperCase(),
    input.guideVersion,
    input.chapterId ?? "hero",
    input.kind,
    input.sectionIndex ?? "x",
    input.paragraphIndex ?? "x",
    input.sentenceIndex ?? "x",
  ].join("/");
}

function reviewUnitForRole(
  unit: Omit<TraitMapGuideReviewUnit, "reviewDecisions">,
  role: TraitMapGuideReviewRole,
  context: Readonly<{ repeatedSentence: boolean }>,
): TraitMapGuideAiReviewDecision {
  const issueCodes: string[] = [];
  const textLength = Array.from(unit.text).length;

  if (role === "data_quality_engineer") {
    if (!unit.unitKey || !unit.contentHash)
      issueCodes.push("MISSING_STABLE_ID");
    if (!unit.text.trim()) issueCodes.push("EMPTY_CUSTOMER_TEXT");
    if (unit.evidenceRefs.length < 4 && !unit.kind.startsWith("reference_")) {
      issueCodes.push("EVIDENCE_PACK_MISSING");
    }
  }

  if (role === "korean_plain_language_editor") {
    const kind =
      unit.kind === "check_question"
        ? "question"
        : unit.kind.includes("title")
          ? "title"
          : "result";
    issueCodes.push(
      ...validatePublicLanguageText({ kind, text: unit.text }).map(
        (issue) => `PUBLIC_LANGUAGE:${issue.code}`,
      ),
    );
    if (unit.kind === "paragraph_sentence" && textLength > 110) {
      issueCodes.push("SENTENCE_OVER_110_CHARACTERS");
    }
    if (forcedUniquenessPattern.test(unit.text)) {
      issueCodes.push("FORCED_UNIQUENESS_PREFIX");
    }
  }

  if (role === "personality_psychologist") {
    if (absoluteClaimPatterns.some((pattern) => pattern.test(unit.text))) {
      issueCodes.push("FIXED_TRAIT_CLAIM");
    }
  }

  if (role === "psychometrician") {
    if (abilityPredictionPatterns.some((pattern) => pattern.test(unit.text))) {
      issueCodes.push("ABILITY_OR_OUTCOME_INFERENCE");
    }
  }

  if (role === "research_methodologist") {
    if (unit.evidenceRefs.length === 0) issueCodes.push("NO_EVIDENCE_TRACE");
    if (
      unsupportedRelationshipPatterns.some((pattern) => pattern.test(unit.text))
    ) {
      issueCodes.push("RELATIONSHIP_OUTCOME_OVERCLAIM");
    }
  }

  if (role === "safety_privacy_reviewer") {
    if (safetyBlockerPatterns.some((pattern) => pattern.test(unit.text))) {
      issueCodes.push("SAFETY_OR_STIGMA_BLOCKER");
    }
  }

  if (role === "product_content_designer") {
    if (unresolvedTokenPattern.test(unit.text)) {
      issueCodes.push("UNRESOLVED_AUTHORING_TOKEN");
    }
    if (unit.kind === "paragraph_sentence" && textLength < 8) {
      issueCodes.push("LOW_INFORMATION_FRAGMENT");
    }
    if (context.repeatedSentence) {
      issueCodes.push("P2:REPEATED_PROFILE_SENTENCE");
    }
  }

  const blockingIssueCodes = issueCodes.filter(
    (issueCode) => !issueCode.startsWith("P2:"),
  );
  const decision = blockingIssueCodes.length === 0 ? "approve" : "revise";
  return {
    decision,
    issueCodes,
    rationale:
      issueCodes.length === 0
        ? traitMapGuideReviewRoleCopy[role].purpose
        : blockingIssueCodes.length === 0
          ? `${traitMapGuideReviewRoleCopy[role].label} 기준은 통과했지만 ${issueCodes.join(", ")} 편집 개선 항목을 사람 검수에서 함께 확인해요.`
          : `${traitMapGuideReviewRoleCopy[role].label} 기준에서 ${issueCodes.join(", ")} 항목을 다시 확인해야 해요.`,
    role,
    score:
      issueCodes.length === 0 ? 4 : blockingIssueCodes.length === 0 ? 3 : 2,
  };
}

function sentenceSignature(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[A-Z]{5}/gu, "")
    .replace(/[^가-힣a-zA-Z0-9]/gu, "");
}

function stableDigest(value: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    first = Math.imul(first ^ point, 0x01000193) >>> 0;
    second = Math.imul(second ^ (point + first), 0x85ebca6b) >>> 0;
  }
  return `${first.toString(16).padStart(8, "0")}${second
    .toString(16)
    .padStart(8, "0")}`;
}

export const traitMapGuideReviewRuntimeVersion = {
  releaseId: traitMapGuideBetaReleaseId,
  rubricVersion: traitMapGuideReviewContractVersion,
} as const;
