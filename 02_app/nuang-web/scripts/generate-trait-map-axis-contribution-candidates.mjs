import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const generatedDirectory = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated",
);
const queuePath = path.join(
  generatedDirectory,
  "TRAIT_MAP_LATTICE_RECONCILIATION_QUEUE_V2.json",
);
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_AXIS_CONTRIBUTION_CANDIDATES_V2.json",
);
const checkOnly = process.argv.includes("--check");
const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
const pendingReviews = {
  personality_psychology: "not_started",
  psychometrics: "not_started",
  relationship_psychology: "not_started",
  clinical_safety: "not_started",
  plain_korean: "not_started",
  product: "not_started",
  design: "not_started",
};

const axisDefinitions = [
  {
    axisRef: "SE",
    position: 1,
    symbols: ["E", "I"],
    label: "에너지와 표현",
    cues: {
      E: [
        "대화를 주고받",
        "함께 있는 자리",
        "먼저 말",
        "바로 연락",
        "사람들과",
        "밖으로 표현",
        "대화 속에서",
      ],
      I: [
        "혼자",
        "말하기 전에",
        "생각을 정리",
        "시간을 두고",
        "조용히",
        "살핀 뒤",
        "마음속",
      ],
    },
  },
  {
    axisRef: "OE",
    position: 2,
    symbols: ["R", "N"],
    label: "탐색과 관심",
    cues: {
      R: [
        "실제로",
        "구체적",
        "사실",
        "직접 확인",
        "반복해서",
        "순서",
        "지금 보이는",
        "경험",
      ],
      N: [
        "가능성",
        "의미",
        "큰 그림",
        "연결될",
        "다른 관점",
        "새로운 경험",
        "앞으로",
        "상상",
        "숨은",
      ],
    },
  },
  {
    axisRef: "RO",
    position: 3,
    symbols: ["G", "A"],
    label: "관계를 살피는 초점",
    cues: {
      G: [
        "원인",
        "해결",
        "문제",
        "기준",
        "방법",
        "풀리지",
        "무엇이 잘못",
        "고칠",
        "대안",
      ],
      A: [
        "감정",
        "마음",
        "분위기",
        "상처",
        "공감",
        "편하게",
        "관계 회복",
        "경험을 듣",
        "서운",
        "안심",
      ],
    },
  },
  {
    axisRef: "SM",
    position: 4,
    symbols: ["K", "M"],
    label: "실행과 구조",
    cues: {
      K: [
        "계획",
        "순서",
        "기준",
        "마무리",
        "약속",
        "일정",
        "완료",
        "정리",
        "미리",
      ],
      M: [
        "상황에 맞",
        "에너지",
        "흥미",
        "유연",
        "바꾸",
        "조정",
        "지금 가능",
        "우선순위",
        "그때그때",
      ],
    },
  },
  {
    axisRef: "ER",
    position: 5,
    symbols: ["C", "Q"],
    label: "감정 활성화와 걱정",
    cues: {
      C: [
        "차분",
        "천천히",
        "여유",
        "침착",
        "감정이 커지기 전",
        "잠잠",
        "가라앉",
      ],
      Q: [
        "걱정",
        "불안",
        "위험",
        "긴장",
        "이상 신호",
        "신경 쓰",
        "불확실",
        "빠르게 반응",
        "급하게",
      ],
    },
  },
];

const slots = queue.queue.map(buildCandidateSlot);
const summary = {
  totalSlots: slots.length,
  existingControlledSlots: slots.filter(
    (slot) => slot.currentControlledAxes.length > 0,
  ).length,
  newlySuggestedAxisSlots: slots.filter((slot) =>
    slot.candidateSemanticAxes.some(
      (candidate) => !slot.currentControlledAxes.includes(candidate.axisRef),
    ),
  ).length,
  noSemanticAxisCandidateSlots: slots.filter(
    (slot) => slot.candidateSemanticAxes.length === 0,
  ).length,
  singleAxisCandidateSlots: slots.filter(
    (slot) => slot.candidateSemanticAxes.length === 1,
  ).length,
  multiAxisCandidateSlots: slots.filter(
    (slot) => slot.candidateSemanticAxes.length > 1,
  ).length,
  interactionCandidateSlots: slots.filter(
    (slot) => slot.candidateInteractions.length > 0,
  ).length,
  highRiskSlots: slots.filter((slot) =>
    slot.riskDomains.some((risk) => risk !== "none"),
  ).length,
  approvedSlots: 0,
};
const manifest = {
  contractVersion: "nuang-trait-map-scenario-axis-contribution.v2",
  manifestId: "TRAIT-MAP-AXIS-CONTRIBUTION.0.1",
  sourceQueueId: queue.queueId,
  status: "expert_review_required",
  generatedAt: "2026-07-23T00:00:00.000Z",
  publicationState: "research_only",
  purpose:
    "288개 상황·관찰 슬롯의 기존 축 신호와 문장 속 행동 단서를 분리해 수집한 연구용 후보다. 자동 결과는 정답이나 고객 문구가 아니며 전문가 검토 전에는 재합성할 수 없다.",
  axisDefinitions: axisDefinitions.map(
    ({ axisRef, position, symbols, label }) => ({
      axisRef,
      position,
      symbols,
      label,
    }),
  ),
  candidateRules: [
    "기존 기준점 직접 비교에서 확인된 축은 primary·high 후보로 보존한다.",
    "서로 다른 원문 변형에서 한 축의 양쪽 방향 단서가 모두 확인될 때만 새 의미 축 후보를 제안한다.",
    "한쪽 방향 단서만 나타나면 축 후보로 확정하지 않고 검토 신호로만 남긴다.",
    "두 축 이상이 함께 후보가 되고 문장 변형이 네 개 이상일 때 복합축 검토 후보를 만든다.",
    "모든 후보는 expert_review_required·research_only이며 자동으로 canonical 문장을 만들지 않는다.",
  ],
  summary,
  slots,
};
const output = await prettier.format(JSON.stringify(manifest), {
  parser: "json",
});

if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "Trait-map axis contribution candidates are stale. Run npm run research:trait-map:v2:axis-contribution-candidates.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}

console.log(
  `Axis contribution candidates: ${summary.totalSlots} slots, ${summary.newlySuggestedAxisSlots} newly suggested, ${summary.noSemanticAxisCandidateSlots} unresolved, ${summary.interactionCandidateSlots} interaction candidates.`,
);

function buildCandidateSlot(item) {
  const currentControlledAxes = item.controlledAxes.map(
    (axis) => axisDefinitions[axis.position - 1].axisRef,
  );
  const lexicalAnalyses = axisDefinitions.map((axis) =>
    analyzeLexicalContrast(item, axis),
  );
  const semanticAxisRefs = new Set(currentControlledAxes);

  for (const analysis of lexicalAnalyses) {
    if (analysis.hasTwoSidedContrast) {
      semanticAxisRefs.add(analysis.axisRef);
    }
  }

  const candidateSemanticAxes = [...semanticAxisRefs]
    .map((axisRef) => {
      const axis = axisDefinitions.find(
        (definition) => definition.axisRef === axisRef,
      );
      const lexical = lexicalAnalyses.find(
        (analysis) => analysis.axisRef === axisRef,
      );
      const existing = currentControlledAxes.includes(axisRef);
      const cueEvidence = lexical.hits.flatMap((entry) =>
        entry.hits.map(
          (hit) => `${entry.symbol}:${hit.cue}(${hit.variantIds.join(",")})`,
        ),
      );
      return {
        axisRef,
        contribution:
          existing || semanticAxisRefs.size === 1 ? "primary" : "secondary",
        confidence: existing
          ? "high"
          : lexical.totalDistinctCues >= 4
            ? "high"
            : "medium",
        rationale: existing
          ? `${axis.label} 축은 기존 두 기준점의 직접 한 글자 비교에서 문장 차이가 확인됐어요.`
          : `${axis.label} 축의 양쪽 방향을 가리키는 행동 단서가 서로 다른 원문 변형에서 함께 나타났어요.`,
        cueEvidence,
        evidenceFindingRefs: unique(
          item.variants.flatMap((variant) => variant.evidenceFindingRefs),
        ),
        independentSourceRefs: unique(
          item.variants.flatMap((variant) => variant.independentSourceRefs),
        ),
      };
    })
    .sort((left, right) => axisOrder(left.axisRef) - axisOrder(right.axisRef));

  const classificationSignals = [];
  for (const axisRef of currentControlledAxes) {
    const axis = axisDefinitions.find(
      (definition) => definition.axisRef === axisRef,
    );
    classificationSignals.push({
      signalType: "existing_controlled_pair",
      axisRef,
      variantIds: item.variants.map((variant) => variant.variantId),
      detail: `${axis.label} 축의 기존 기준점 직접 비교에서 차이가 확인됐어요.`,
    });
  }
  for (const lexical of lexicalAnalyses) {
    const variantIds = unique(
      lexical.hits.flatMap((entry) =>
        entry.hits.flatMap((hit) => hit.variantIds),
      ),
    );
    if (variantIds.length === 0) continue;
    classificationSignals.push({
      signalType: "lexical_cue",
      axisRef: lexical.axisRef,
      variantIds,
      detail: lexical.hasTwoSidedContrast
        ? `${lexical.label} 축의 양쪽 방향 단서가 서로 다른 문장에 나타났어요.`
        : `${lexical.label} 축의 한쪽 방향 단서만 보여 축 후보가 아닌 검토 신호로 남겼어요.`,
    });
  }
  classificationSignals.push({
    signalType: "profile_distribution",
    variantIds: item.variants.map((variant) => variant.variantId),
    detail: `${item.actualVariantCount}개 원문 변형과 ${currentControlledAxes.length}개 기존 통제축의 분포를 함께 보존했어요.`,
  });

  const candidateInteractions = buildInteractionCandidates(
    item,
    candidateSemanticAxes,
  );
  const hasNewAxis = candidateSemanticAxes.some(
    (candidate) => !currentControlledAxes.includes(candidate.axisRef),
  );
  const lineageResolution =
    candidateInteractions.length > 0
      ? "author_interaction"
      : hasNewAxis
        ? "reclassify_axis"
        : candidateSemanticAxes.length > 0
          ? "merge_wording"
          : "pending";

  return {
    claimKey: item.claimKey,
    scenarioRef: item.scenarioRef,
    context: item.context,
    claimKind: item.claimKind,
    privacyScope:
      item.claimKind === "first_thought" || item.claimKind === "actual_response"
        ? "self_only"
        : item.privacyScope,
    riskDomains: item.riskDomains,
    currentControlledAxes,
    candidateSemanticAxes,
    candidateInteractions,
    classificationSignals,
    anchorVariants: item.variants,
    decision: {
      status: "expert_review_required",
      lineageResolution,
      rationale:
        candidateSemanticAxes.length === 0
          ? "자동 단서만으로 의미 축을 정할 수 없어 전문가가 원문 대비를 직접 검토해야 해요."
          : "기존 직접 비교와 문장 단서로 만든 후보이며 canonical 문장 작성 전 전문 검토가 필요해요.",
      canonicalVariants: [],
      decidedBy: ["deterministic_axis_candidate_generator.v2"],
    },
    reviews: pendingReviews,
    publicationState: "research_only",
  };
}

function analyzeLexicalContrast(item, axis) {
  const hits = axis.symbols.map((symbol) => {
    const cueHits = axis.cues[symbol]
      .map((cue) => ({
        cue,
        variantIds: item.variants
          .filter((variant) => variant.assertion.includes(cue))
          .map((variant) => variant.variantId),
      }))
      .filter((hit) => hit.variantIds.length > 0);
    return { symbol, hits: cueHits };
  });
  const symbolsWithHits = hits.filter((entry) => entry.hits.length > 0);
  const symbolVariantSets = symbolsWithHits.map(
    (entry) => new Set(entry.hits.flatMap((hit) => hit.variantIds)),
  );
  const hasDistinctVariants =
    symbolVariantSets.length === 2 &&
    [...symbolVariantSets[0]].some(
      (variantId) => !symbolVariantSets[1].has(variantId),
    ) &&
    [...symbolVariantSets[1]].some(
      (variantId) => !symbolVariantSets[0].has(variantId),
    );
  return {
    axisRef: axis.axisRef,
    label: axis.label,
    hits,
    totalDistinctCues: unique(
      hits.flatMap((entry) => entry.hits.map((hit) => hit.cue)),
    ).length,
    hasTwoSidedContrast: symbolsWithHits.length === 2 && hasDistinctVariants,
  };
}

function buildInteractionCandidates(item, candidates) {
  if (candidates.length < 2 || item.actualVariantCount < 4) return [];
  const selectedAxes = candidates
    .filter((candidate) => candidate.confidence !== "low")
    .slice(0, 3)
    .map((candidate) => candidate.axisRef);
  if (selectedAxes.length < 2) return [];
  const evidenceFindingRefs = unique(
    item.variants.flatMap((variant) => variant.evidenceFindingRefs),
  );
  const independentSourceRefs = unique(
    item.variants.flatMap((variant) => variant.independentSourceRefs),
  );
  return [
    {
      interactionId: `INT-SCN-${item.scenarioRef
        .replace(/^SCN-/, "")
        .replace(/[^A-Z0-9]+/g, "-")}-${selectedAxes.join("-")}-${item.claimKind
        .toUpperCase()
        .replace(/_/g, "-")}`,
      axisRefs: selectedAxes,
      confidence: item.controlledAxes.length >= 2 ? "high" : "medium",
      rationale:
        "두 개 이상의 축 후보와 네 개 이상의 원문 변형이 함께 나타나 단일축 병합 전에 조합별 문장 차이를 확인해야 해요.",
      evidenceFindingRefs,
      independentSourceRefs,
    },
  ];
}

function axisOrder(axisRef) {
  return axisDefinitions.findIndex((axis) => axis.axisRef === axisRef);
}

function unique(items) {
  return [...new Set(items)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
}
