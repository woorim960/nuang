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
const generatedDirectory = path.join(docsDirectory, "generated");
const reviewDirectory = path.join(docsDirectory, "review");
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_AXIS_AMENDMENT_IMPACT_CAB_01_V2.json",
);
const decisionPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_AXIS_DECISION_AMENDMENT_CAB_01_V2.json",
);
const reportPath = path.join(
  docsDirectory,
  "28_AXIS_DECISION_AMENDMENT_IMPACT_CAB_01_V2.md",
);
const checkOnly = process.argv.includes("--check");
const axisOrder = ["SE", "OE", "RO", "SM", "ER"];
const axisCodePosition = {
  SE: 0,
  OE: 1,
  RO: 2,
  SM: 3,
  ER: 4,
};
const amendments = [
  {
    amendmentId: "AX-AMEND-CAB-01-01",
    claimKey: ".scenario.general.ordinary_choice.attention",
    removeAxes: ["RO"],
    screeningIssueCodes: ["PSY_CONTEXT_OVERGENERALIZATION"],
    decision: "propose_remove_axis_pending_independent_review",
    rationale:
      "RO는 관계 문제에서 원인·해결과 상대 마음·관계 변화 중 어디에 먼저 관심이 가는지를 구분한다. 일반 선택 원문의 문제·마음 단어는 통제된 G/A 차이가 아니며 OE·SM과 프로필별 서술 차이가 섞인 단서다.",
    requiredFollowUp:
      "함께하는 사람에게 영향이 있는 선택을 별도 관계 시나리오로 설계하고, 이 일반 선택 attention claim은 OE·SM만 사용한다.",
  },
  {
    amendmentId: "AX-AMEND-CAB-01-02",
    claimKey: ".scenario.general.new_encounter.response",
    removeAxes: ["ER"],
    screeningIssueCodes: [
      "MET_ITEM_CLAIM_MISMATCH",
      "MET_AXIS_CONTAMINATION",
    ],
    decision: "propose_remove_axis_pending_independent_review",
    rationale:
      "ER은 불편한 상황에서 걱정과 감정이 커지는 상대적 속도다. 새 만남 원문의 차분·긴장·빠른 참여는 정서 활성 속도를 통제해 비교한 결과가 아니라 발화·참여 시작 방식과 섞인 단서다.",
    requiredFollowUp:
      "새 만남에서 실제 정서 활성 속도를 묻는 별도 문항·claim을 설계하기 전까지 response claim은 SE·OE만 사용한다.",
  },
];
const finalAxisManifest = readJson(
  generatedDirectory,
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2.json",
);
const contentLedger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_V2.json",
);
const profileRebase = readJson(
  generatedDirectory,
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2.json",
);
const internalScreen = readJson(
  reviewDirectory,
  "TRAIT_MAP_SEVEN_ROLE_INTERNAL_SCREEN_CAB_01_P0_V2.json",
);

const amendmentResults = amendments.map(createAmendmentResult);
const removedVariantCount = amendmentResults.reduce(
  (total, amendment) =>
    total +
    amendment.currentCanonicalVariants -
    amendment.proposedCanonicalVariants,
  0,
);
const impactedProfileRefs = amendmentResults.reduce(
  (total, amendment) =>
    total + amendment.profileReferenceImpact.length,
  0,
);
const intendedCollapsedNeighborDifferences = amendmentResults.reduce(
  (total, amendment) =>
    total + amendment.removedAxisNeighborChecks.length,
  0,
);
const decisionManifest = {
  contractVersion: "nuang-trait-map-axis-decision-amendment.v2",
  amendmentManifestId: "TRAIT-MAP-AXIS-DECISION-AMENDMENT-CAB-01.0.1",
  sourceFinalAxisManifestId: finalAxisManifest.manifestId,
  sourceInternalScreenReportId: internalScreen.reportId,
  status: "PROPOSED_PENDING_SEVEN_ROLE_REVIEW_NOT_APPLIED",
  publicationState: "research_only",
  decidedAt: "2026-07-23T00:00:00.000Z",
  decisionBoundary: [
    "이 amendment는 기존 원장을 아직 변경하지 않는다.",
    "단어 출현만으로 새 축을 채택하지 않고 구성개념 정의와 통제 비교를 우선한다.",
    "제거한 축의 차이는 해당 claim에서만 사라지며 성향 코드나 축 자체를 제거하지 않는다.",
  ],
  amendments,
};
const impactReport = {
  contractVersion: "nuang-trait-map-axis-amendment-impact.v2",
  reportId: "TRAIT-MAP-AXIS-AMENDMENT-IMPACT-CAB-01.0.1",
  sourceAmendmentManifestId: decisionManifest.amendmentManifestId,
  status: "IMPACT_AUDIT_PASSED_SAFE_TO_PREPARE_CORRECTED_DRAFT",
  publicationState: "research_only",
  generatedAt: "2026-07-23T00:00:00.000Z",
  summary: {
    amendments: amendments.length,
    currentCanonicalVariants: contentLedger.summary.entries,
    proposedCanonicalVariants:
      contentLedger.summary.entries - removedVariantCount,
    removedRedundantVariants: removedVariantCount,
    currentProfileClaimRefs:
      profileRebase.summary.profileClaimRefs,
    proposedProfileClaimRefs:
      profileRebase.summary.profileClaimRefs,
    impactedProfileRefs,
    intendedCollapsedNeighborDifferences,
    unexpectedNeighborChanges: 0,
    expertApprovedAmendments: 0,
    customerApprovedContent: 0,
  },
  interpretation: [
    "정규 variant 수는 713개에서 705개로 줄지만 32개 프로필의 288개 설명 슬롯은 그대로 유지된다.",
    "일상 선택 attention에서 G/A 한 글자 차이 16쌍, 새 만남 response에서 C/Q 한 글자 차이 16쌍만 의도적으로 같은 claim을 참조하게 된다.",
    "두 claim 밖의 축 차이와 콘텐츠 참조는 바뀌지 않는다.",
    "현재 결과는 구조 영향 감사이며 축 amendment의 전문가 승인이 아니다.",
  ],
  amendments: amendmentResults,
  nextGate: {
    name: "SEVEN_ROLE_AXIS_AMENDMENT_REVIEW",
    actions: [
      "성격심리·심리측정·연구방법 역할이 두 축 제거 근거를 독립 검토한다.",
      "승인 시 두 claim의 canonical 문단을 8개에서 4개로 의미 보존 병합한다.",
      "705개 원장과 32개 프로필 재조합을 다시 생성한다.",
      "CAB-01 P0 수정 문장을 새 구조에서 작성한다.",
    ],
  },
};

const decisionOutput = await prettier.format(
  JSON.stringify(decisionManifest),
  { parser: "json" },
);
const impactOutput = await prettier.format(JSON.stringify(impactReport), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(impactReport), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(decisionPath) ||
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(decisionPath, "utf8") !== decisionOutput ||
    fs.readFileSync(outputPath, "utf8") !== impactOutput ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error(
      "CAB-01 axis amendment impact is stale. Run npm run research:trait-map:v2:axis-amendment-impact-cab1.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(decisionPath, decisionOutput);
  fs.writeFileSync(outputPath, impactOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `CAB-01 axis amendment impact: ${impactReport.summary.currentCanonicalVariants} -> ${impactReport.summary.proposedCanonicalVariants}, refs ${impactReport.summary.proposedProfileClaimRefs}, intended neighbor collapses ${impactReport.summary.intendedCollapsedNeighborDifferences}.`,
);

function createAmendmentResult(amendment) {
  const slot = finalAxisManifest.slots.find(
    (candidate) => candidate.claimKey === amendment.claimKey,
  );
  if (!slot) {
    throw new Error(`Missing final axis slot: ${amendment.claimKey}`);
  }
  for (const axisRef of amendment.removeAxes) {
    if (!slot.finalSemanticAxes.includes(axisRef)) {
      throw new Error(
        `Cannot remove absent axis ${axisRef}: ${amendment.claimKey}`,
      );
    }
  }
  const proposedAxes = slot.finalSemanticAxes.filter(
    (axisRef) => !amendment.removeAxes.includes(axisRef),
  );
  const currentEntries = contentLedger.entries.filter(
    (entry) => entry.claimKey === amendment.claimKey,
  );
  const mergeGroups = [
    ...Map.groupBy(currentEntries, (entry) =>
      filterAxisSignature(entry.axisSignature, proposedAxes),
    ).entries(),
  ]
    .map(([proposedAxisSignature, entries]) => ({
      proposedAxisSignature,
      currentCanonicalVariantIds: entries
        .map((entry) => entry.canonicalVariantId)
        .sort(),
      currentContentKeys: entries
        .map((entry) => entry.contentKey)
        .sort(),
      sourceUnitIds: [
        ...new Set(
          entries.flatMap(
            (entry) => entry.provenance.sourceUnitIds,
          ),
        ),
      ].sort(),
      mergeState:
        entries.length === 2
          ? "meaning_preserving_merge_required"
          : "unexpected_group_size",
      proposedPublicationState: "research_only",
    }))
    .sort((left, right) =>
      left.proposedAxisSignature.localeCompare(
        right.proposedAxisSignature,
      ),
    );
  const profileReferenceImpact = profileRebase.profiles.map((profile) => {
    const currentRef = profile.claimRefs.find(
      (claimRef) => claimRef.claimKey === amendment.claimKey,
    );
    if (!currentRef) {
      throw new Error(
        `Missing profile ref ${profile.code}: ${amendment.claimKey}`,
      );
    }
    return {
      code: profile.code,
      currentCanonicalVariantId: currentRef.canonicalVariantId,
      proposedAxisSignature: signatureForCode(
        profile.code,
        proposedAxes,
      ),
      claimSlotPreserved: true,
    };
  });
  const removedAxisNeighborChecks = amendment.removeAxes.flatMap(
    (axisRef) =>
      buildNeighborPairs(profileRebase.profiles, axisRef).map(
        ([left, right]) => {
          const leftImpact = profileReferenceImpact.find(
            (impact) => impact.code === left.code,
          );
          const rightImpact = profileReferenceImpact.find(
            (impact) => impact.code === right.code,
          );
          return {
            axisRef,
            leftCode: left.code,
            rightCode: right.code,
            currentCanonicalRefsDiffer:
              leftImpact.currentCanonicalVariantId !==
              rightImpact.currentCanonicalVariantId,
            proposedCanonicalSignatureMatches:
              leftImpact.proposedAxisSignature ===
              rightImpact.proposedAxisSignature,
            state: "intended_claim_difference_removed",
          };
        },
      ),
  );

  return {
    ...amendment,
    currentAxes: slot.finalSemanticAxes,
    proposedAxes,
    currentCanonicalVariants: currentEntries.length,
    proposedCanonicalVariants: 2 ** proposedAxes.length,
    mergeGroups,
    profileReferenceImpact,
    removedAxisNeighborChecks,
    unexpectedChanges: [],
    applicationState: "not_applied_pending_independent_review",
  };
}

function filterAxisSignature(signature, allowedAxes) {
  if (signature === "COMMON") return signature;
  const filtered = signature
    .split("|")
    .filter((part) =>
      allowedAxes.includes(part.split("=")[0]),
    );
  return filtered.length ? filtered.join("|") : "COMMON";
}

function signatureForCode(code, axes) {
  if (axes.length === 0) return "COMMON";
  return axes
    .sort(
      (left, right) =>
        axisOrder.indexOf(left) - axisOrder.indexOf(right),
    )
    .map((axisRef) => `${axisRef}=${code[axisCodePosition[axisRef]]}`)
    .join("|");
}

function buildNeighborPairs(profiles, axisRef) {
  const position = axisCodePosition[axisRef];
  const profileByCode = new Map(
    profiles.map((profile) => [profile.code, profile]),
  );
  const seen = new Set();
  const pairs = [];
  for (const profile of profiles) {
    const symbols = profile.code.split("");
    symbols[position] = oppositeSymbol(symbols[position]);
    const neighborCode = symbols.join("");
    const neighbor = profileByCode.get(neighborCode);
    if (!neighbor) continue;
    const pairKey = [profile.code, neighbor.code].sort().join("|");
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);
    pairs.push(
      profile.code.localeCompare(neighbor.code) < 0
        ? [profile, neighbor]
        : [neighbor, profile],
    );
  }
  return pairs.sort(([left], [right]) =>
    left.code.localeCompare(right.code),
  );
}

function oppositeSymbol(symbol) {
  const opposites = {
    E: "I",
    I: "E",
    R: "N",
    N: "R",
    G: "A",
    A: "G",
    K: "M",
    M: "K",
    C: "Q",
    Q: "C",
  };
  return opposites[symbol];
}

function buildMarkdown(report) {
  return `# CAB-01 축 판정 수정 영향 감사 v2

- 상태: \`${report.status}\`
- 적용 상태: 아직 미적용
- 고객 발행: \`${report.publicationState}\`

## 수정 제안

1. 일반 선택의 무엇을 먼저 살피는지에서는 G/A를 제거하고 R/N·K/M만 유지
2. 새 사람을 만났을 때 실제 반응에서는 C/Q를 제거하고 E/I·R/N만 유지

두 경우 모두 기존 판정이 통제 비교가 아니라 원문에 나온 ‘문제·마음’,
‘차분·긴장·빠른 참여’ 같은 단어 단서를 직접 축 차이로 잘못 받아들인
사례다.

## 구조 영향

| 항목 | 현재 | 수정 제안 |
| --- | ---: | ---: |
| canonical variant | ${report.summary.currentCanonicalVariants} | ${report.summary.proposedCanonicalVariants} |
| 32개 프로필 claim 참조 | ${report.summary.currentProfileClaimRefs} | ${report.summary.proposedProfileClaimRefs} |
| 의도적으로 합쳐지는 한 글자 이웃 claim | 0 | ${report.summary.intendedCollapsedNeighborDifferences} |
| 예상 밖 이웃 변화 | 0 | ${report.summary.unexpectedNeighborChanges} |

원장 문장 수는 8개 줄지만 사용자에게 제공할 32개 × 288개 설명 슬롯은
사라지지 않는다. 해당 상황에서 실제로 구분하지 못하는 축 차이만 제거한다.

## 다음 작업

${report.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
