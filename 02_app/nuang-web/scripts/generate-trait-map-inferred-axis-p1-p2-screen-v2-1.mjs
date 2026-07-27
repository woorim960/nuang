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
  "TRAIT_MAP_INFERRED_AXIS_SCOPE_INTERNAL_SCREEN_P1_P2_V2_1.json",
);
const reportPath = path.join(
  docsDirectory,
  "49_INFERRED_AXIS_SCOPE_INTERNAL_SCREEN_P1_P2_V2_1.md",
);
const checkOnly = process.argv.includes("--check");
const queue = readJson(
  "TRAIT_MAP_INFERRED_AXIS_SCOPE_REVIEW_QUEUE_V2_1.json",
);
const scopedEntries = queue.entries.filter(
  (entry) => entry.priority !== "P0",
);

const removeClaimKeys = new Set([
  ".scenario.friend.boundary.process",
  ".scenario.friend.need_expression.process",
  ".scenario.general.boundary.process",
  ".scenario.partner.boundary.process",
  ".scenario.partner.need_expression.process",
  ".scenario.person_of_interest.boundary.attention",
  ".scenario.person_of_interest.need_expression.process",
  ".scenario.person_of_interest.plan_change.attention",
  ".scenario.work.boundary.process",
  ".scenario.work.need_expression.process",
  ".scenario.friend.group_participation.response",
  ".scenario.general.aftermath.response",
  ".scenario.general.disagreement.response",
  ".scenario.general.group_participation.communication",
  ".scenario.person_of_interest.need_expression.response",
  ".scenario.friend.support_requested.attention",
  ".scenario.friend.uncertainty.response",
  ".scenario.general.plan_change.attention",
  ".scenario.general.support_requested.attention",
  ".scenario.partner.support_requested.attention",
  ".scenario.person_of_interest.group_participation.attention",
  ".scenario.work.setback.attention",
  ".scenario.family.aftermath.response",
  ".scenario.friend.uncertainty.attention",
  ".scenario.partner.setback.attention",
  ".scenario.partner.setback.process",
  ".scenario.person_of_interest.setback.response",
  ".scenario.work.aftermath.communication",
]);

const entries = scopedEntries.map((entry) => {
  const decision = removeClaimKeys.has(entry.claimKey)
    ? "remove_scope_mismatch"
    : "retain_with_direct_contrast";
  return {
    reviewId: entry.reviewId,
    priority: entry.priority,
    claimKey: entry.claimKey,
    scenarioRef: entry.scenarioRef,
    context: entry.context,
    scene: entry.scene,
    claimKind: entry.claimKind,
    axisRef: entry.axisRef,
    currentControlledAxes: entry.currentControlledAxes,
    proposedFinalAxes: entry.proposedFinalAxes,
    evidenceFlags: entry.evidenceFlags,
    directionSummary: Object.fromEntries(
      entry.axisContract.symbols.map((symbol) => [
        symbol,
        entry.evidenceAudit.byDirection[symbol].selectedAssertions,
      ]),
    ),
    internalScreening: {
      state: "completed_internal_construct_precheck_not_expert_approval",
      decision,
      issueCodes: issueCodesFor(entry, decision),
      rationale: rationaleFor(entry, decision),
      requiredAction: actionFor(entry, decision),
      checkedAxisContract: true,
      checkedBothDirections: true,
      checkedContraryEvidence: true,
      reviewerType: "model_internal_construct_scope_screen",
      screenedAt: "2026-07-24T00:00:00.000Z",
    },
    nextBaselineAction:
      decision === "retain_with_direct_contrast"
        ? "retain_pending_independent_review"
        : "remove_in_next_internal_axis_manifest",
    independentRoleReviewState: "pending",
    expertReviewed: false,
    publicationState: "research_only",
  };
});

const expectedKeys = new Set(
  scopedEntries.map((entry) => entry.claimKey),
);
const unknownClassifications = [...removeClaimKeys].filter(
  (claimKey) => !expectedKeys.has(claimKey),
);
if (unknownClassifications.length) {
  throw new Error(
    `Unknown P1/P2 inferred-axis classifications: ${unknownClassifications.join(",")}`,
  );
}

const report = {
  contractVersion:
    "nuang-trait-map-inferred-axis-scope-internal-screen.v2.1",
  reportId:
    "TRAIT-MAP-INFERRED-AXIS-SCOPE-INTERNAL-SCREEN-P1-P2.0.1",
  status:
    "P1_P2_INTERNAL_CONSTRUCT_SCREEN_COMPLETE_AXIS_AMENDMENT_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceQueueId: queue.queueId,
  scope: "P1_P2",
  interpretation: [
    "이 판정은 독립 전문가 승인이나 심리측정 타당성 검증이 아니라 내부 구성개념 사전검토다.",
    "낮은 source purity는 제거의 충분조건이 아니며 양방향 문장이 공식 축을 직접 대비하는지 함께 읽었다.",
    "retain 항목도 문장 품질과 사용자 이해도 검토가 남아 있으며 고객 발행 승인이 아니다.",
  ],
  summary: {
    entries: entries.length,
    p1Entries: entries.filter((entry) => entry.priority === "P1").length,
    p2Entries: entries.filter((entry) => entry.priority === "P2").length,
    retainCandidates: countDecision(
      entries,
      "retain_with_direct_contrast",
    ),
    removeProposals: countDecision(entries, "remove_scope_mismatch"),
    byAxis: Object.fromEntries(
      ["SE", "OE", "RO", "SM", "ER"].map((axisRef) => [
        axisRef,
        {
          entries: entries.filter(
            (entry) => entry.axisRef === axisRef,
          ).length,
          retain: entries.filter(
            (entry) =>
              entry.axisRef === axisRef &&
              entry.internalScreening.decision ===
                "retain_with_direct_contrast",
          ).length,
          remove: entries.filter(
            (entry) =>
              entry.axisRef === axisRef &&
              entry.internalScreening.decision ===
                "remove_scope_mismatch",
          ).length,
        },
      ]),
    ),
    expertReviewed: 0,
    customerApproved: 0,
  },
  entries,
  nextGate: {
    name: "INTERNAL_AXIS_MANIFEST_V2_2_IMPACT_AUDIT",
    actions: [
      "P0와 P1·P2 제거·보류 판정을 하나의 amendment manifest로 합친다.",
      "제거 축마다 canonical ID 병합과 문장 계보 영향을 계산한다.",
      "32개 코드 9,216개 슬롯과 한 글자 이웃 검사를 새 기준으로 다시 실행한다.",
      "독립 전문가 검토 전까지 v2.2도 내부 research_only 기준선으로 유지한다.",
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
    console.error(
      "Inferred-axis P1/P2 internal screen is stale. Run npm run research:trait-map:v2:inferred-axis-p1-p2-screen-v2-1.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Inferred-axis P1/P2 screen: ${report.summary.entries}; retain ${report.summary.retainCandidates}, remove ${report.summary.removeProposals}, approved 0.`,
);

function issueCodesFor(entry, decision) {
  if (decision === "retain_with_direct_contrast") return [];
  if (entry.axisRef === "ER") {
    return [
      "PSY_ER_ACTIVATION_SPEED_MISMATCH",
      "MET_AXIS_CONTAMINATION",
    ];
  }
  if (entry.axisRef === "SE") {
    return [
      "PSY_SE_BEHAVIOR_ENERGY_CONFLATION",
      "MET_AXIS_CONTAMINATION",
    ];
  }
  if (entry.axisRef === "SM") {
    return [
      "PSY_SM_DIRECTION_NOT_DISTINCT",
      "MET_AXIS_CONTAMINATION",
    ];
  }
  if (entry.axisRef === "OE") {
    return [
      "PSY_OE_FACT_POSSIBILITY_MISMATCH",
      "MET_AXIS_CONTAMINATION",
    ];
  }
  return [
    "PSY_RO_DIRECTION_NOT_DISTINCT",
    "MET_AXIS_CONTAMINATION",
  ];
}

function rationaleFor(entry, decision) {
  if (decision === "retain_with_direct_contrast") {
    if (entry.axisRef === "RO") {
      return "상황이 관계의 불편·경계·필요·지원 문제를 명시하며, G의 원인·해결과 A의 마음·관계 영향이 같은 claim에서 직접 대비된다.";
    }
    if (entry.axisRef === "OE") {
      return "R의 확인된 사실·경험과 N의 의미·여러 가능성이 같은 상황에서 직접 대비된다.";
    }
    if (entry.axisRef === "SM") {
      return "K의 기준·순서 유지와 M의 현재 조건에 따른 조정이 실제 반응에서 직접 대비된다.";
    }
    if (entry.axisRef === "SE") {
      return "사람들과 영향을 맞추는 흐름과 혼자 사건을 되짚는 흐름이 단순한 발화 속도가 아니라 정리 방향으로 대비된다.";
    }
    return "양방향 문장이 공식 축 계약을 같은 상황 안에서 직접 대비한다.";
  }
  if (entry.axisRef === "ER") {
    return "한쪽에 걱정 표현이 있는지 또는 해결 생각을 하는지를 비교할 뿐, 걱정과 감정이 천천히 대 빠르게 선명해지는 속도를 비교하지 않는다.";
  }
  if (entry.axisRef === "SE") {
    return "두 방향 모두 문제를 정리하고 지원을 요청하며, 혼자 충전 대 사람을 통한 정리 차이가 직접 나타나지 않는다.";
  }
  if (entry.axisRef === "SM") {
    return "양방향의 차이가 다른 축의 사람·생각·표현 차이이며, 정한 흐름 유지 대 상황별 조정이 일관되게 반복되지 않는다.";
  }
  if (entry.axisRef === "OE") {
    return "양방향이 모두 실제 조건·원인·관계 영향을 섞어 말해 확인된 사실 대 의미·가능성 대비가 유지되지 않는다.";
  }
  return "양방향이 모두 해결 행동과 관계 배려를 함께 말하거나 방향이 서로 뒤섞여 G/A 대비가 안정적으로 유지되지 않는다.";
}

function actionFor(entry, decision) {
  if (decision === "retain_with_direct_contrast") {
    return "독립 역할 검토에서 방향 문장 중 다른 축 의미가 섞인 부분을 교정하고 같은 claim의 양방향 구분을 다시 확인한다.";
  }
  return `${entry.axisRef}를 다음 내부 축 manifest에서 제거하고, 남은 축의 같은 서명끼리 원문을 합치되 제거된 축 문장은 계보에 보존한다.`;
}

function countDecision(items, decision) {
  return items.filter(
    (entry) => entry.internalScreening.decision === decision,
  ).length;
}

function buildMarkdown(result) {
  const axisRows = Object.entries(result.summary.byAxis)
    .map(
      ([axisRef, counts]) =>
        `| ${axisRef} | ${counts.entries} | ${counts.retain} | ${counts.remove} |`,
    )
    .join("\n");
  return `# 추론 축 P1·P2 내부 구성개념 사전검토 v2.1

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## 판정

- 검토: ${result.summary.entries}
- P1: ${result.summary.p1Entries}
- P2: ${result.summary.p2Entries}
- 유지 후보: ${result.summary.retainCandidates}
- 제거 제안: ${result.summary.removeProposals}
- 전문가 승인: ${result.summary.expertReviewed}

| 축 | 전체 | 유지 후보 | 제거 제안 |
| --- | ---: | ---: | ---: |
${axisRows}

## 중요한 발견

추론 C/Q 9개는 모두 정서 활성 속도가 아니라 걱정 유무·문제 정리 내용을
비교해 제거 대상으로 분류했다. R/N 7개, K/M 5개, G/A 6개, E/I 1개도
양방향이 공식 축 대비를 안정적으로 유지하지 못했다.

유지 후보도 독립 전문가 승인이나 고객 발행 승인이 아니다. 다음 내부
manifest에서는 제거 제안을 반영해 구조 영향을 계산하고, 유지 문장은
별도의 한국어·중복·축 오염 검토를 이어간다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
