import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const docsDirectory = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2",
);
const reviewDirectory = path.join(docsDirectory, "review");
const outputPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_FLAGGED_INTERNAL_SCREEN_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "65_P0_FLAGGED_INTERNAL_SCREEN_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const preflight = readJson(
  "TRAIT_MAP_P0_SENTENCE_PREFLIGHT_V2_2.json",
);
const flaggedEntries = preflight.entries.filter(
  (entry) => entry.automatedPreflight.flags.length > 0,
);

const revisionTextById = new Map([
  [
    "CAN-SCN-GENERAL-SETBACK-ATTENTION-ER-C",
    "실수하거나 기대한 결과를 얻지 못하면 감정이 크게 올라오기 전에 무엇이 달라졌고 누구에게 어떤 영향이 생겼는지, 지금 고칠 수 있는 부분이 무엇인지 차분히 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-GENERAL-SETBACK-COMMUNICATION-ER-C",
    "“이 지점에서 문제가 생겼고 지금 이 부분부터 고치고 있어. 지금은 차분하지만 마음이 올라오면 다시 이야기할게”처럼 사실·대응과 감정이 드러나는 시점을 나누어 말한다.",
  ],
  [
    "CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-E-ER-C",
    "부담스러운 일이 지나간 직후에는 관련된 사람들과 실제로 있었던 일과 해결된 부분, 남은 후속 행동을 맞춰 보고 다음에 바꿀 행동을 함께 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-I-ER-C",
    "부담스러운 일이 지나간 뒤 혼자 생각을 정리하며 “무엇이 문제를 키웠고, 남은 일과 내 마음을 분명히 하려면 무엇부터 되짚어야 할까?”를 차분히 생각하기 쉽다.",
  ],
  [
    "CAN-SCN-GENERAL-PLAN-CHANGE-ATTENTION-SM-K-ER-C",
    "계획이 갑자기 바뀌면 달라진 조건을 확인한 뒤, 원래 목표와 약속에서 지킬 부분과 다시 세워야 할 순서를 차분히 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-GENERAL-PLAN-CHANGE-ATTENTION-SM-M-ER-Q",
    "계획이 갑자기 바뀌면 놓친 준비와 사람들에게 생길 부담이 빠르게 눈에 들어오고, 달라진 조건에서 지금 가능한 방법과 남은 에너지를 함께 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-GENERAL-PLAN-CHANGE-RESPONSE-SM-M-ER-Q",
    "걱정이 빠르게 올라와도 목표에 필요한 핵심은 남겨 두고 방법과 순서를 유연하게 바꾸며, 필요한 확인과 대비 행동을 시작하는 편이다.",
  ],
  [
    "CAN-SCN-GENERAL-DISAGREEMENT-RESPONSE-RO-A",
    "상대의 관점을 요약해 맞게 이해했는지와 불편했던 지점을 확인하고 자신의 생각도 말한 뒤, 둘 다 받아들일 수 있는 해결 방법을 찾는 편이다.",
  ],
  [
    "CAN-SCN-FRIEND-GROUP-PARTICIPATION-RESPONSE-SE-E",
    "새 화제나 구체적인 활동을 먼저 제안하고 친구들의 반응을 연결하며, 모임의 흐름이 멈추면 함께할 다음 행동을 꺼내는 편이다.",
  ],
  [
    "CAN-SCN-PARTNER-SETBACK-ATTENTION-ER-C",
    "연인이 실수하거나 기대한 결과를 얻지 못하면 감정적으로 서둘러 결론 내리기보다 어떤 일이 있었고 무엇이 막혔는지, 지금 필요한 도움이 위로인지 해결인지 차분히 살피는 경향이 있다.",
  ],
  [
    "CAN-SCN-PARTNER-SETBACK-PROCESS-ER-C",
    "“어디서 어긋났고, 연인이 받은 영향을 줄이려면 무엇부터 확인해야 할까?”를 차분히 정리하면서 상대가 지금 해결 이야기를 원하는지도 함께 생각하기 쉽다.",
  ],
  [
    "CAN-SCN-PARTNER-SETBACK-PROCESS-ER-Q",
    "“원인이 무엇이고 어떻게 해결하지?”가 빠르게 떠오르면서도, 해결책을 서둘러 말하면 연인의 감정을 놓치지 않을지 함께 걱정하기 쉽다.",
  ],
  [
    "CAN-SCN-PARTNER-PLAN-CHANGE-COMMUNICATION-SM-K",
    "“갑자기 바뀌어서 조금 당황했어. 이유를 듣고 약속의 핵심은 남긴 채 가능한 날짜를 다시 정하고 싶은데, 너에게도 괜찮은지 알려 줘”처럼 감정·확인·재계획을 나누어 말한다.",
  ],
]);
const commonExclusionIds = new Set([
  "CAN-SCN-FAMILY-GROUP-PARTICIPATION-ATTENTION-COMMON",
  "CAN-SCN-FRIEND-UNCERTAINTY-ATTENTION-COMMON",
]);
const residualRetainIds = new Set([
  "CAN-SCN-PERSON-OF-INTEREST-SETBACK-RESPONSE-ER-C",
]);

const entries = flaggedEntries.map((entry) => {
  const targeted = entry.automatedPreflight.flags.some(
    (flag) =>
      flag.code ===
      "PSY_TARGETED_AXIS_PAIR_MANUAL_CONFIRMATION_REQUIRED",
  );
  let decision;
  let rationale;
  let proposedRevision = null;
  if (targeted) {
    decision = "retain_targeted_contrast_internal_candidate";
    rationale =
      "같은 claim의 반대 축 서명과 대조했을 때 양쪽에 각각 고유한 방향 문단이 있고 재조합 감사도 구분 가능으로 통과했다.";
  } else if (commonExclusionIds.has(entry.canonicalVariantId)) {
    decision =
      "retain_research_lineage_exclude_from_profile_interpretation";
    rationale =
      "COMMON은 32개 코드 모두에 같은 문장으로 연결되어 개인 성향 차이를 설명하지 못한다. 연구 계보에는 보존하되 결과·상세 성향 설명에는 노출하지 않는다.";
  } else if (residualRetainIds.has(entry.canonicalVariantId)) {
    decision = "retain_sequential_nuance_internal_candidate";
    rationale =
      "두 문단은 제거된 RO의 반대 성향을 병렬로 단정하는 대신, 실제 대응과 시간이 지난 뒤의 감정 확인이라는 서로 다른 시간 단계를 설명한다.";
  } else {
    const revisedText = revisionTextById.get(entry.canonicalVariantId);
    if (!revisedText) {
      throw new Error(
        `Missing revision for flagged entry: ${entry.canonicalVariantId}`,
      );
    }
    decision = "revise_information_preserving_single_paragraph";
    rationale =
      "제거·보류한 축의 두 원문을 그대로 병렬 배치해 주의 초점이나 반응이 둘로 갈라져 보인다. 남아 있는 축과 상황 의미를 중심으로 두 원문의 공통·고유 정보를 한 문단에 합친다.";
    proposedRevision = {
      contentShape: "single_core_paragraph",
      summaryText: revisedText,
      detailParagraphs: [revisedText],
      sourceParagraphs: entry.content.detailParagraphs,
      revisionType:
        "information_preserving_synthesis_after_inferred_axis_removal",
      state:
        "internal_editorial_candidate_independent_review_required",
    };
  }
  return {
    canonicalVariantId: entry.canonicalVariantId,
    batchId: entry.batchId,
    claimKey: entry.claimKey,
    claimKind: entry.claimKind,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    automatedFlags: entry.automatedPreflight.flags,
    originalContent: entry.content,
    internalScreening: {
      state:
        "completed_internal_semantic_and_plain_korean_precheck_not_expert_approval",
      decision,
      rationale,
      checkedSameClaimAxisContrasts: true,
      checkedRemovedAxisResidual: true,
      checkedPlainKorean: true,
      checkedSafetyAndOverclaim: true,
      reviewerType: "model_internal_content_screen",
      reviewedAt: "2026-07-24T00:00:00.000Z",
    },
    proposedRevision,
    independentRoleReviewState: "pending",
    customerComprehensionState: "not_started",
    customerPublicationApproved: false,
    publicationState: "research_only",
  };
});

if (
  entries.filter(
    (entry) =>
      entry.internalScreening.decision ===
      "revise_information_preserving_single_paragraph",
  ).length !== revisionTextById.size
) {
  throw new Error("Not every revision candidate was consumed exactly once.");
}

const report = {
  contractVersion:
    "nuang-trait-map-p0-flagged-internal-screen.v2.2",
  reportId: "TRAIT-MAP-P0-FLAGGED-INTERNAL-SCREEN.0.1",
  status:
    "P0_FLAGGED_INTERNAL_SCREEN_COMPLETE_REVISION_DRAFT_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourcePreflightReportId: preflight.reportId,
  summary: {
    reviewedEntries: entries.length,
    targetedContrastRetainCandidates: countDecision(
      entries,
      "retain_targeted_contrast_internal_candidate",
    ),
    sequentialNuanceRetainCandidates: countDecision(
      entries,
      "retain_sequential_nuance_internal_candidate",
    ),
    revisionCandidates: countDecision(
      entries,
      "revise_information_preserving_single_paragraph",
    ),
    researchOnlyCommonExclusions: countDecision(
      entries,
      "retain_research_lineage_exclude_from_profile_interpretation",
    ),
    independentRoleApproved: 0,
    customerApproved: 0,
  },
  interpretation: [
    "retain은 내부 문장 후보 유지이며 독립 전문가 승인이나 심리측정 타당화가 아니다.",
    "revision은 원문 밖의 새 성격 주장을 더하지 않고 기존 두 문단의 의미를 한 문단으로 정리한 편집 후보다.",
    "COMMON 제외는 데이터를 삭제하지 않고 개인화 결과 화면에서만 사용하지 않는 제품 노출 결정이다.",
    "모든 결정은 7개 역할과 고객 이해도 검증 전까지 research_only다.",
  ],
  entries,
  nextGate: {
    name: "P0_REVISION_CANDIDATE_RECOMPOSITION",
    actions: [
      "13개 수정 후보를 별도 content version으로 생성하고 기존 문장을 계보에 보존한다.",
      "수정 뒤 같은 claim의 반대 축 서명과 32개 코드·80개 이웃을 재검사한다.",
      "25개 전체 COMMON 콘텐츠의 개인화 노출 계약을 별도로 감사한다.",
      "자동 flag가 없던 P0 claim도 묶음별 내부 문장 판독을 이어간다.",
    ],
  },
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.2 P0 flagged internal screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 flagged internal screen v2.2: ${report.summary.reviewedEntries} reviewed, ${report.summary.revisionCandidates} revisions, ${report.summary.targetedContrastRetainCandidates + report.summary.sequentialNuanceRetainCandidates} retained candidates, ${report.summary.researchOnlyCommonExclusions} COMMON profile exclusions.`,
);

function countDecision(items, decision) {
  return items.filter(
    (entry) => entry.internalScreening.decision === decision,
  ).length;
}

function buildMarkdown(result) {
  return `# v2.2 P0 자동 flag 문장 내부 판독

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## 결과

- 판독: ${result.summary.reviewedEntries}
- 표적 축 유지 후보: ${result.summary.targetedContrastRetainCandidates}
- 시간 순서 nuance 유지 후보: ${result.summary.sequentialNuanceRetainCandidates}
- 한 문단 수정 후보: ${result.summary.revisionCandidates}
- 개인 성향 화면에서 제외할 COMMON: ${result.summary.researchOnlyCommonExclusions}
- 독립 역할 승인: 0
- 고객 승인: 0

수정 후보는 기존 두 문단을 삭제하거나 새 성격 주장을 더한 결과가 아니다.
원문과 수정 이유를 보존한 별도 version 후보이며, 7개 역할 검토와 고객
이해도 검증 전에는 앱에 발행하지 않는다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
