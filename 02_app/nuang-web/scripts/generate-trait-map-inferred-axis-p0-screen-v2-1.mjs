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
  "TRAIT_MAP_INFERRED_AXIS_SCOPE_INTERNAL_SCREEN_P0_V2_1.json",
);
const reportPath = path.join(
  docsDirectory,
  "48_INFERRED_AXIS_SCOPE_INTERNAL_SCREEN_P0_V2_1.md",
);
const checkOnly = process.argv.includes("--check");
const queue = readJson(
  "TRAIT_MAP_INFERRED_AXIS_SCOPE_REVIEW_QUEUE_V2_1.json",
);
const p0Entries = queue.entries.filter(
  (entry) => entry.priority === "P0",
);

const removeClaimKeys = new Set([
  ".scenario.family.group_participation.attention",
  ".scenario.family.group_participation.process",
  ".scenario.family.ordinary_choice.process",
  ".scenario.family.success.attention",
  ".scenario.family.success.process",
  ".scenario.family.success.response",
  ".scenario.friend.plan_change.process",
  ".scenario.general.plan_change.response",
  ".scenario.partner.new_encounter.attention",
  ".scenario.partner.plan_change.attention",
  ".scenario.partner.plan_change.communication",
  ".scenario.partner.success.process",
  ".scenario.person_of_interest.success.attention",
  ".scenario.person_of_interest.success.process",
  ".scenario.person_of_interest.success.response",
  ".scenario.work.success.communication",
  ".scenario.work.success.process",
  ".scenario.friend.boundary.response",
  ".scenario.partner.boundary.response",
  ".scenario.person_of_interest.boundary.response",
  ".scenario.work.boundary.response",
  ".scenario.friend.group_participation.attention",
  ".scenario.partner.disagreement.process",
  ".scenario.work.disagreement.process",
  ".scenario.person_of_interest.group_participation.process",
]);
const holdClaimKeys = new Set([
  ".scenario.general.aftermath.attention",
  ".scenario.general.aftermath.process",
  ".scenario.general.setback.attention",
  ".scenario.general.setback.communication",
]);

const entries = p0Entries.map((entry) => {
  const decision = removeClaimKeys.has(entry.claimKey)
    ? "remove_scope_mismatch"
    : holdClaimKeys.has(entry.claimKey)
      ? "hold_for_construct_evidence"
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
    scopeFlags: entry.scopeFlags,
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
        : decision === "remove_scope_mismatch"
          ? "remove_in_next_internal_axis_manifest"
          : "exclude_from_next_internal_axis_manifest_until_resolved",
    independentRoleReviewState: "pending",
    expertReviewed: false,
    publicationState: "research_only",
  };
});

const expectedKeys = new Set(p0Entries.map((entry) => entry.claimKey));
const classifiedKeys = new Set([
  ...removeClaimKeys,
  ...holdClaimKeys,
  ...entries
    .filter(
      (entry) =>
        entry.internalScreening.decision ===
        "retain_with_direct_contrast",
    )
    .map((entry) => entry.claimKey),
]);
const unknownClassifications = [...classifiedKeys].filter(
  (claimKey) => !expectedKeys.has(claimKey),
);
const missingClassifications = [...expectedKeys].filter(
  (claimKey) => !classifiedKeys.has(claimKey),
);
if (unknownClassifications.length || missingClassifications.length) {
  throw new Error(
    `P0 inferred-axis classification mismatch: unknown=${unknownClassifications.join(",")} missing=${missingClassifications.join(",")}`,
  );
}

const report = {
  contractVersion:
    "nuang-trait-map-inferred-axis-scope-internal-screen.v2.1",
  reportId: "TRAIT-MAP-INFERRED-AXIS-SCOPE-INTERNAL-SCREEN-P0.0.1",
  status:
    "P0_INTERNAL_CONSTRUCT_SCREEN_COMPLETE_AXIS_AMENDMENT_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceQueueId: queue.queueId,
  scope: "P0",
  interpretation: [
    "이 판정은 독립 전문가 승인이나 심리측정 타당성 검증이 아니라 내부 구성개념 사전검토다.",
    "retain은 양방향 문장이 공식 축 뜻과 직접 대비된다는 내부 판단이며 고객 발행 승인이 아니다.",
    "remove는 다른 축이나 상황 차이를 해당 축으로 잘못 읽은 경우다.",
    "hold는 상황 자체가 관계 문제인지 명확하지 않아 새 기준선에서 우선 제외하고 상황 정의와 근거를 다시 확인한다는 뜻이다.",
  ],
  summary: {
    entries: entries.length,
    retainCandidates: countDecision(
      entries,
      "retain_with_direct_contrast",
    ),
    removeProposals: countDecision(entries, "remove_scope_mismatch"),
    constructHolds: countDecision(
      entries,
      "hold_for_construct_evidence",
    ),
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
          hold: entries.filter(
            (entry) =>
              entry.axisRef === axisRef &&
              entry.internalScreening.decision ===
                "hold_for_construct_evidence",
          ).length,
        },
      ]),
    ),
    expertReviewed: 0,
    customerApproved: 0,
  },
  entries,
  nextGate: {
    name: "P1_P2_INFERRED_AXIS_REVIEW_THEN_V2_2_MANIFEST",
    actions: [
      "P1·P2 85개 추론 축을 같은 계약으로 검토한다.",
      "P0 제거 25개와 보류 4개는 다음 내부 manifest에서 제외한다.",
      "모든 추론 축 검토 뒤 canonical 수와 32개 재조합 영향을 계산한다.",
      "독립 성격심리·심리측정 검토 전까지 새 manifest도 research_only로 유지한다.",
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
      "Inferred-axis P0 internal screen is stale. Run npm run research:trait-map:v2:inferred-axis-p0-screen-v2-1.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Inferred-axis P0 screen: ${report.summary.entries}; retain ${report.summary.retainCandidates}, remove ${report.summary.removeProposals}, hold ${report.summary.constructHolds}, approved 0.`,
);

function issueCodesFor(entry, decision) {
  if (decision === "retain_with_direct_contrast") {
    return [];
  }
  if (decision === "hold_for_construct_evidence") {
    return [
      "PSY_CONTEXT_BOUNDARY_UNCLEAR",
      "MET_INFERRED_AXIS_NOT_DIRECTLY_CONTROLLED",
    ];
  }
  if (entry.axisRef === "RO") {
    return [
      "PSY_RO_SCOPE_MISMATCH",
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
      "PSY_SM_ATTENTION_ACTION_CONFLATION",
      "MET_AXIS_CONTAMINATION",
    ];
  }
  return [
    "PSY_ER_ACTIVATION_SPEED_MISMATCH",
    "MET_AXIS_CONTAMINATION",
  ];
}

function rationaleFor(entry, decision) {
  if (decision === "retain_with_direct_contrast") {
    if (entry.axisRef === "RO") {
      return "상황이 상대와의 경계 또는 필요 표현을 명시하며, G는 원인·행동 기준을, A는 상대 마음·관계 영향을 직접 살핀다.";
    }
    if (entry.axisRef === "SE") {
      return "양방향이 단순한 말하기 속도가 아니라 사람들과 바로 풀어 가는 흐름과 혼자 정리한 뒤 연결하는 흐름으로 직접 대비된다.";
    }
    return "양방향 문장이 공식 축 계약의 두 방향을 같은 상황 안에서 직접 대비한다.";
  }
  if (decision === "hold_for_construct_evidence") {
    return "일반 상황 설명만으로는 해당 사건이 관계 문제인지 확정할 수 없는데 문장은 사람과 관계를 전제로 G/A를 구성했다.";
  }
  if (entry.axisRef === "RO") {
    return "성공·일반 선택·모임 참여·계획 변경의 실무 또는 표현 차이를 관계 문제의 원인·해결 대 마음·관계 변화로 넓혀 읽었다.";
  }
  if (entry.axisRef === "SE") {
    return "양방향 모두 타인에게 말하거나 행동하며, 먼저 말했는지 또는 표현 방식만 달라 사람을 통한 에너지·혼자 정리의 차이가 직접 대비되지 않는다.";
  }
  if (entry.axisRef === "SM") {
    return "문장 차이는 다른 축의 원인·마음 또는 참여 대상 차이이며, 정한 흐름 유지 대 상황별 조정이 직접 대비되지 않는다.";
  }
  return "두 방향 모두 참여 계기와 상대 반응을 생각할 뿐, 걱정과 감정이 천천히 대 빠르게 선명해지는 차이가 직접 나타나지 않는다.";
}

function actionFor(entry, decision) {
  if (decision === "retain_with_direct_contrast") {
    return "독립 역할 검토에서 능력·행동 속도·고정 유형으로 오해되지 않는지 확인한다.";
  }
  if (decision === "hold_for_construct_evidence") {
    return "상황 전제를 관계 문제로 명시할지 결정하고, 명시하지 않으면 해당 축을 제거한다.";
  }
  return `${entry.axisRef}를 다음 내부 축 manifest에서 제거하고 남은 축의 같은 서명끼리 원문 계보를 합친다.`;
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
        `| ${axisRef} | ${counts.entries} | ${counts.retain} | ${counts.remove} | ${counts.hold} |`,
    )
    .join("\n");
  return `# 추론 축 P0 내부 구성개념 사전검토 v2.1

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## 판정

- 검토: ${result.summary.entries}
- 유지 후보: ${result.summary.retainCandidates}
- 제거 제안: ${result.summary.removeProposals}
- 구성개념 보류: ${result.summary.constructHolds}
- 전문가 승인: ${result.summary.expertReviewed}

| 축 | 전체 | 유지 후보 | 제거 제안 | 보류 |
| --- | ---: | ---: | ---: | ---: |
${axisRows}

## 중요한 발견

일반 계획 변경의 G/A, 성공 상황의 G/A, 경계 표현 일부의 E/I, 모임 참여
주의의 K/M, 관심 상대 모임에서의 C/Q는 공식 축 뜻을 직접 대비하지 않았다.
반대로 명시적인 경계·필요 표현의 G/A와 사람들과 풀기·혼자 정리하기가
직접 대비되는 E/I는 유지 후보로 분리했다.

이 결과는 내부 사전검토다. P1·P2를 같은 기준으로 검토하고 독립 전문가
검토를 거치기 전에는 최종 의미 기준선이나 고객 콘텐츠로 승격하지 않는다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
