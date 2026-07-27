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
const requestedAxisVersion =
  process.argv
    .find((argument) => argument.startsWith("--axis-version="))
    ?.split("=")[1] ?? "v2";
const versionConfig = {
  v2: {
    artifactSuffix: "V2",
    decisionFile: "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2.json",
    reportFile: "09_CANONICAL_DRAFTING_DRY_RUN_AUDIT_V2.md",
    contractVersion: "v2",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    artifactSuffix: "V2_1",
    decisionFile: "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_1.json",
    reportFile: "30_CANONICAL_DRAFTING_DRY_RUN_AUDIT_V2_1.md",
    contractVersion: "v2.1",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    artifactSuffix: "V2_2",
    decisionFile: "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_2.json",
    reportFile: "51_CANONICAL_DRAFTING_DRY_RUN_AUDIT_V2_2.md",
    contractVersion: "v2.2",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    artifactSuffix: "V2_3",
    decisionFile: "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_3.json",
    reportFile: "94_CANONICAL_DRAFTING_DRY_RUN_AUDIT_V2_3.md",
    contractVersion: "v2.3",
    artifactVersion: "0.4",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
}[requestedAxisVersion];
if (!versionConfig) {
  throw new Error(`Unsupported axis version: ${requestedAxisVersion}`);
}
const artifactSuffix = versionConfig.artifactSuffix;
const queueOutputPath = path.join(
  generatedDirectory,
  `TRAIT_MAP_CANONICAL_DRAFTING_QUEUE_${artifactSuffix}.json`,
);
const auditOutputPath = path.join(
  generatedDirectory,
  `TRAIT_MAP_RECOMPOSITION_DRY_RUN_AUDIT_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  versionConfig.reportFile,
);
const checkOnly = process.argv.includes("--check");
const candidates = readJson("TRAIT_MAP_AXIS_CONTRIBUTION_CANDIDATES_V2.json");
const decisions = readJson(versionConfig.decisionFile);
const candidateByClaimKey = new Map(
  candidates.slots.map((slot) => [slot.claimKey, slot]),
);
const axisDefinitions = [
  { axisRef: "SE", position: 1, symbols: ["E", "I"] },
  { axisRef: "OE", position: 2, symbols: ["R", "N"] },
  { axisRef: "RO", position: 3, symbols: ["G", "A"] },
  { axisRef: "SM", position: 4, symbols: ["K", "M"] },
  { axisRef: "ER", position: 5, symbols: ["C", "Q"] },
];
const codes = cartesianCodes();
const canonicalSlots = decisions.slots.map(buildCanonicalSlot);
const canonicalByClaimKey = new Map(
  canonicalSlots.map((slot) => [slot.claimKey, slot]),
);
const preResolutionAxisDifferentiationCollisions =
  canonicalSlots.flatMap(findAxisCollisions);
const collisionResolutions =
  resolveAxisDifferentiationCollisions(canonicalSlots);
const axisDifferentiationCollisions =
  canonicalSlots.flatMap(findAxisCollisions);
const profileClaimIndexes = codes.map((code) => ({
  code,
  claims: decisions.slots.map((decision) => {
    const canonicalSlot = canonicalByClaimKey.get(decision.claimKey);
    const signature = signatureForCode(code, decision.finalSemanticAxes);
    const canonicalVariant = canonicalSlot.canonicalCandidates.find(
      (candidate) => candidate.axisSignature === signature,
    );
    return {
      claimKey: decision.claimKey,
      canonicalVariantId: canonicalVariant.canonicalVariantId,
      axisSignature: signature,
      assertion: canonicalVariant.selectedAssertion,
    };
  }),
}));
const profileIndexByCode = new Map(
  profileClaimIndexes.map((profile) => [profile.code, profile]),
);
const neighborEdges = buildNeighborEdges();
const lineageMergeGroups = canonicalSlots.flatMap((slot) =>
  slot.canonicalCandidates
    .filter((candidate) => candidate.status === "lineage_merge_required")
    .map((candidate) => ({
      claimKey: slot.claimKey,
      scenarioRef: slot.scenarioRef,
      axisSignature: candidate.axisSignature,
      candidateCount: candidate.sourceCandidates.length,
      selectedVariantId: candidate.selectedVariantId,
      sourceVariantIds: candidate.sourceCandidates.map(
        (source) => source.variantId,
      ),
    })),
);
const canonicalVariantCount = canonicalSlots.reduce(
  (total, slot) => total + slot.canonicalCandidates.length,
  0,
);
const queue = {
  contractVersion: `nuang-trait-map-canonical-drafting-queue.${versionConfig.contractVersion}`,
  queueId: `TRAIT-MAP-CANONICAL-DRAFTING-QUEUE.${versionConfig.artifactVersion}`,
  sourceDecisionManifestId: decisions.manifestId,
  status: "DRAFT_SELECTION_COMPLETE_LINEAGE_REWRITE_REQUIRED",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  summary: {
    claimSlots: canonicalSlots.length,
    canonicalVariantCount,
    singleLineageCandidates: canonicalSlots.reduce(
      (total, slot) =>
        total +
        slot.canonicalCandidates.filter(
          (candidate) => candidate.status === "single_lineage_candidate",
        ).length,
      0,
    ),
    lineageMergeRequired: lineageMergeGroups.length,
    missingSourceCandidateGroups: canonicalSlots.reduce(
      (total, slot) =>
        total +
        slot.canonicalCandidates.filter(
          (candidate) => candidate.status === "missing_source_candidate",
        ).length,
      0,
    ),
    preResolutionSelectedAssertionCollisions:
      preResolutionAxisDifferentiationCollisions.length,
    automaticallyResolvedAxisCollisions: collisionResolutions.length,
    selectedAssertionCollisions: axisDifferentiationCollisions.length,
    customerApprovedVariants: 0,
  },
  selectionRules: [
    "같은 축 서명을 가진 코드에 실제로 사용된 원문만 후보로 모은다.",
    "해당 서명의 코드 전체를 더 많이 설명하고 다른 서명과 덜 섞인 원문을 대표 초안으로 고른다.",
    "대표 초안 선택은 문장 승인이 아니며 후보가 둘 이상이면 반드시 의미 단위 병합 검토를 남긴다.",
    "축 한 글자만 바뀐 서명 쌍의 대표 문장이 같으면 축 방향 문장 충돌로 기록한다.",
    "32개 프로필에는 문장을 복사하지 않고 canonical variant ID만 연결하는 것이 최종 데이터 구조다.",
  ],
  slots: canonicalSlots,
};
const audit = {
  contractVersion: `nuang-trait-map-recomposition-dry-run-audit.${versionConfig.contractVersion}`,
  auditId: `TRAIT-MAP-RECOMPOSITION-DRY-RUN.${versionConfig.artifactVersion}`,
  sourceQueueId: queue.queueId,
  status:
    axisDifferentiationCollisions.length === 0 &&
    lineageMergeGroups.length === 0
      ? "READY_FOR_FINAL_PROFILE_REGENERATION"
      : "CANONICAL_REWRITE_REQUIRED",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  summary: {
    profiles: profileClaimIndexes.length,
    claimsPerProfile: profileClaimIndexes[0].claims.length,
    profileClaimReferences: profileClaimIndexes.reduce(
      (total, profile) => total + profile.claims.length,
      0,
    ),
    canonicalVariantCount,
    pathIndependentReferences: profileClaimIndexes.every(
      (profile) =>
        profile.claims.length === 288 &&
        new Set(profile.claims.map((claim) => claim.claimKey)).size === 288,
    ),
    neighborEdges: neighborEdges.length,
    neighborEdgesPassingSelectedDraftCheck: neighborEdges.filter(
      (edge) => edge.passesSelectedDraftCheck,
    ).length,
    lineageMergeGroups: lineageMergeGroups.length,
    preResolutionAxisDifferentiationCollisions:
      preResolutionAxisDifferentiationCollisions.length,
    automaticallyResolvedAxisCollisions: collisionResolutions.length,
    axisDifferentiationCollisions: axisDifferentiationCollisions.length,
  },
  collisionCountsByAxis: Object.fromEntries(
    axisDefinitions.map((axis) => [
      axis.axisRef,
      axisDifferentiationCollisions.filter(
        (collision) => collision.axisRef === axis.axisRef,
      ).length,
    ]),
  ),
  lineageMergeGroups,
  preResolutionAxisDifferentiationCollisions,
  collisionResolutions,
  axisDifferentiationCollisions,
  neighborEdges,
  profileClaimIndexes,
};
const queueOutput = await prettier.format(JSON.stringify(queue), {
  parser: "json",
});
const auditOutput = await prettier.format(JSON.stringify(audit), {
  parser: "json",
});
const report = await prettier.format(buildMarkdownReport(queue, audit), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(queueOutputPath) ||
    !fs.existsSync(auditOutputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(queueOutputPath, "utf8") !== queueOutput ||
    fs.readFileSync(auditOutputPath, "utf8") !== auditOutput ||
    fs.readFileSync(reportPath, "utf8") !== report;
  if (stale) {
    console.error(
      `Trait-map canonical drafting queue ${requestedAxisVersion} is stale. Run the matching generation command.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(queueOutputPath, queueOutput);
  fs.writeFileSync(auditOutputPath, auditOutput);
  fs.writeFileSync(reportPath, report);
}

console.log(
  `Canonical drafting dry run: ${canonicalVariantCount} variants, ${lineageMergeGroups.length} lineage merges, ${axisDifferentiationCollisions.length} axis collisions, ${audit.summary.neighborEdgesPassingSelectedDraftCheck}/80 neighbor edges passing selected-draft check.`,
);

function buildCanonicalSlot(decision) {
  const sourceSlot = candidateByClaimKey.get(decision.claimKey);
  const combinations = axisCombinations(decision.finalSemanticAxes);
  const canonicalCandidates = combinations.map((combination) => {
    const codesForSignature = codes.filter(
      (code) =>
        signatureForCode(code, decision.finalSemanticAxes) ===
        combination.axisSignature,
    );
    const sourceCandidates = sourceSlot.anchorVariants
      .map((variant) => {
        const matchingCodes = variant.codes.filter((code) =>
          codesForSignature.includes(code),
        );
        return {
          variantId: variant.variantId,
          assertion: variant.assertion,
          matchingCodes,
          matchingCodeCount: matchingCodes.length,
          signatureCoverage: matchingCodes.length / codesForSignature.length,
          sourcePurity: matchingCodes.length / variant.codes.length,
          evidenceFindingRefs: variant.evidenceFindingRefs,
          independentSourceRefs: variant.independentSourceRefs,
        };
      })
      .filter((candidate) => candidate.matchingCodeCount > 0)
      .sort(rankSourceCandidates);
    const selected = sourceCandidates[0];
    return {
      canonicalVariantId: canonicalVariantId(
        decision.claimKey,
        combination.axisSignature,
      ),
      axisSignature: combination.axisSignature,
      axisValues: combination.axisValues,
      selectedVariantId: selected?.variantId ?? null,
      selectedAssertion: selected?.assertion ?? null,
      status:
        sourceCandidates.length === 0
          ? "missing_source_candidate"
          : sourceCandidates.length === 1
            ? "single_lineage_candidate"
            : "lineage_merge_required",
      selectionReason: selected
        ? "해당 축 서명의 코드 커버리지·원문 순도·독립 근거 수를 차례로 비교해 대표 연구 초안을 선택했어요."
        : "이 축 서명에 연결되는 기존 원문이 없어 새 문장을 작성해야 해요.",
      sourceCandidates,
      publicationState: "research_only",
    };
  });
  return {
    claimKey: decision.claimKey,
    scenarioRef: decision.scenarioRef,
    context: decision.context,
    claimKind: decision.claimKind,
    privacyScope: decision.privacyScope,
    riskDomains: decision.riskDomains,
    semanticAxes: decision.finalSemanticAxes,
    canonicalCandidates,
    publicationState: "research_only",
  };
}

function rankSourceCandidates(left, right) {
  return (
    right.signatureCoverage - left.signatureCoverage ||
    right.sourcePurity - left.sourcePurity ||
    right.independentSourceRefs.length - left.independentSourceRefs.length ||
    right.evidenceFindingRefs.length - left.evidenceFindingRefs.length ||
    Math.abs(left.assertion.length - 90) -
      Math.abs(right.assertion.length - 90) ||
    left.variantId.localeCompare(right.variantId, "en")
  );
}

function findAxisCollisions(slot) {
  const collisions = [];
  for (const axisRef of slot.semanticAxes) {
    const axis = axisDefinitions.find(
      (definition) => definition.axisRef === axisRef,
    );
    for (const candidate of slot.canonicalCandidates) {
      const value = candidate.axisValues.find(
        (item) => item.axisRef === axisRef,
      );
      if (!value || value.symbol !== axis.symbols[0]) continue;
      const oppositeValues = candidate.axisValues.map((item) =>
        item.axisRef === axisRef ? { ...item, symbol: axis.symbols[1] } : item,
      );
      const oppositeSignature = createSignature(oppositeValues);
      const opposite = slot.canonicalCandidates.find(
        (item) => item.axisSignature === oppositeSignature,
      );
      if (
        opposite &&
        candidate.selectedAssertion === opposite.selectedAssertion
      ) {
        collisions.push({
          claimKey: slot.claimKey,
          scenarioRef: slot.scenarioRef,
          axisRef,
          leftSignature: candidate.axisSignature,
          rightSignature: opposite.axisSignature,
          selectedAssertion: candidate.selectedAssertion,
          requiredAction:
            "두 방향의 실제 의미 차이를 확인하고 서로 다른 canonical 문장을 새로 작성한다.",
        });
      }
    }
  }
  return collisions;
}

function resolveAxisDifferentiationCollisions(slots) {
  const slotByClaimKey = new Map(slots.map((slot) => [slot.claimKey, slot]));
  const resolutions = [];
  const seenResolutionStates = new Set();

  for (let pass = 1; pass <= 10; pass += 1) {
    const collisions = slots.flatMap(findAxisCollisions);
    if (collisions.length === 0) break;

    let changesThisPass = 0;
    for (const collision of collisions) {
      const slot = slotByClaimKey.get(collision.claimKey);
      const left = slot.canonicalCandidates.find(
        (candidate) => candidate.axisSignature === collision.leftSignature,
      );
      const right = slot.canonicalCandidates.find(
        (candidate) => candidate.axisSignature === collision.rightSignature,
      );
      const selectedPair = chooseDistinctSourcePair(left, right);
      if (!selectedPair) continue;

      const stateKey = [
        collision.claimKey,
        collision.axisRef,
        collision.leftSignature,
        collision.rightSignature,
        selectedPair.left.variantId,
        selectedPair.right.variantId,
      ].join("::");
      if (seenResolutionStates.has(stateKey)) continue;

      const before = {
        leftVariantId: left.selectedVariantId,
        leftAssertion: left.selectedAssertion,
        rightVariantId: right.selectedVariantId,
        rightAssertion: right.selectedAssertion,
      };
      applySelectedSource(left, selectedPair.left);
      applySelectedSource(right, selectedPair.right);
      seenResolutionStates.add(stateKey);
      changesThisPass += 1;
      resolutions.push({
        claimKey: collision.claimKey,
        scenarioRef: collision.scenarioRef,
        axisRef: collision.axisRef,
        leftSignature: collision.leftSignature,
        rightSignature: collision.rightSignature,
        pass,
        before,
        after: {
          leftVariantId: left.selectedVariantId,
          leftAssertion: left.selectedAssertion,
          rightVariantId: right.selectedVariantId,
          rightAssertion: right.selectedAssertion,
        },
        selectionBasis:
          "기존 원문 후보 안에서 양쪽 문장이 다르도록 제한한 뒤 축 서명 커버리지, 원문 순도, 독립 근거 수, 기존 선택 유지 순으로 재선택했어요.",
        publicationState: "research_only",
      });
    }

    if (changesThisPass === 0) break;
  }

  return resolutions;
}

function chooseDistinctSourcePair(left, right) {
  const pairs = left.sourceCandidates.flatMap((leftSource) =>
    right.sourceCandidates
      .filter((rightSource) => leftSource.assertion !== rightSource.assertion)
      .map((rightSource) => ({
        left: leftSource,
        right: rightSource,
        score: [
          leftSource.signatureCoverage + rightSource.signatureCoverage,
          Math.min(leftSource.signatureCoverage, rightSource.signatureCoverage),
          leftSource.sourcePurity + rightSource.sourcePurity,
          Math.min(leftSource.sourcePurity, rightSource.sourcePurity),
          leftSource.independentSourceRefs.length +
            rightSource.independentSourceRefs.length,
          Number(leftSource.variantId === left.selectedVariantId) +
            Number(rightSource.variantId === right.selectedVariantId),
          leftSource.evidenceFindingRefs.length +
            rightSource.evidenceFindingRefs.length,
        ],
      })),
  );

  return pairs.sort(compareSourcePairs)[0] ?? null;
}

function compareSourcePairs(left, right) {
  for (let index = 0; index < left.score.length; index += 1) {
    if (left.score[index] !== right.score[index]) {
      return right.score[index] - left.score[index];
    }
  }
  return (
    left.left.variantId.localeCompare(right.left.variantId, "en") ||
    left.right.variantId.localeCompare(right.right.variantId, "en")
  );
}

function applySelectedSource(candidate, source) {
  candidate.selectedVariantId = source.variantId;
  candidate.selectedAssertion = source.assertion;
  candidate.selectionReason =
    "축 반대 방향과 같은 문장이 되지 않도록 기존 원문 후보 안에서 커버리지·순도·근거를 비교해 대표 연구 초안을 재선택했어요.";
  candidate.collisionAdjusted = true;
}

function buildNeighborEdges() {
  const edges = [];
  for (const code of codes) {
    for (const axis of axisDefinitions) {
      if (code[axis.position - 1] !== axis.symbols[0]) continue;
      const neighbor = replaceAt(code, axis.position - 1, axis.symbols[1]);
      const left = profileIndexByCode.get(code);
      const right = profileIndexByCode.get(neighbor);
      const expectedChangedClaimKeys = decisions.slots
        .filter((slot) => slot.finalSemanticAxes.includes(axis.axisRef))
        .map((slot) => slot.claimKey);
      const actualChangedClaimKeys = left.claims
        .filter(
          (claim, index) => claim.assertion !== right.claims[index].assertion,
        )
        .map((claim) => claim.claimKey);
      const collisionClaimKeys = expectedChangedClaimKeys.filter(
        (claimKey) => !actualChangedClaimKeys.includes(claimKey),
      );
      const unexpectedChangedClaimKeys = actualChangedClaimKeys.filter(
        (claimKey) => !expectedChangedClaimKeys.includes(claimKey),
      );
      edges.push({
        leftCode: code,
        rightCode: neighbor,
        axisRef: axis.axisRef,
        expectedChangedClaims: expectedChangedClaimKeys.length,
        actualChangedClaims: actualChangedClaimKeys.length,
        collisionClaimKeys,
        unexpectedChangedClaimKeys,
        passesSelectedDraftCheck:
          collisionClaimKeys.length === 0 &&
          unexpectedChangedClaimKeys.length === 0,
      });
    }
  }
  return edges.sort(
    (left, right) =>
      left.leftCode.localeCompare(right.leftCode, "en") ||
      left.axisRef.localeCompare(right.axisRef, "en"),
  );
}

function axisCombinations(axisRefs) {
  const sortedAxes = [...axisRefs].sort(
    (left, right) =>
      axisDefinitions.find((axis) => axis.axisRef === left).position -
      axisDefinitions.find((axis) => axis.axisRef === right).position,
  );
  let combinations = [[]];
  for (const axisRef of sortedAxes) {
    const axis = axisDefinitions.find(
      (definition) => definition.axisRef === axisRef,
    );
    combinations = combinations.flatMap((combination) =>
      axis.symbols.map((symbol) => [...combination, { axisRef, symbol }]),
    );
  }
  return combinations.map((axisValues) => ({
    axisSignature: createSignature(axisValues),
    axisValues,
  }));
}

function signatureForCode(code, axisRefs) {
  const values = [...axisRefs]
    .sort(
      (left, right) =>
        axisDefinitions.find((axis) => axis.axisRef === left).position -
        axisDefinitions.find((axis) => axis.axisRef === right).position,
    )
    .map((axisRef) => {
      const axis = axisDefinitions.find(
        (definition) => definition.axisRef === axisRef,
      );
      return {
        axisRef,
        symbol: code[axis.position - 1],
      };
    });
  return createSignature(values);
}

function createSignature(axisValues) {
  return axisValues.length === 0
    ? "COMMON"
    : axisValues.map((value) => `${value.axisRef}=${value.symbol}`).join("|");
}

function canonicalVariantId(claimKey, axisSignature) {
  return `CAN-${claimKey
    .replace(/^\.scenario\./, "SCN-")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toUpperCase()}-${axisSignature
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toUpperCase()}`;
}

function buildMarkdownReport(queueResult, auditResult) {
  const axisRows = Object.entries(auditResult.collisionCountsByAxis)
    .map(([axisRef, count]) => `| ${axisRef} | ${count} |`)
    .join("\n");
  const collisionExamples = auditResult.axisDifferentiationCollisions
    .slice(0, 20)
    .map(
      (collision) =>
        `- \`${collision.claimKey}\` · ${collision.axisRef} · ${collision.leftSignature} ↔ ${collision.rightSignature}`,
    )
    .join("\n");
  return `# canonical 문장 후보 큐와 건식 재생성 감사 ${versionConfig.contractVersion}

- 상태: \`${auditResult.status}\`
- 고객 승인 문장: 0개

## 이번 단계에서 한 일

288개 최종 축 결정으로 가능한 ${queueResult.summary.canonicalVariantCount}개
축 조합을 만들고, 각 조합에 실제로 사용된 기존 원문만 후보로 연결했다.
대표 문장은 코드 커버리지와 원문 순도가 높은 순으로 골랐지만 아직 연구 초안이다.

32개 코드에는 문장을 복사하지 않고 canonical ID를 연결해
${auditResult.summary.profileClaimReferences}개 참조를 건식 생성했다. 각 코드는
288개 참조를 정확히 가진다.

## 감사 결과

- 원문 후보가 하나뿐인 조합: ${queueResult.summary.singleLineageCandidates}
- 같은 조합에서 계보 문장이 충돌한 조합: ${queueResult.summary.lineageMergeRequired}
- 기존 원문 후보가 없는 조합: ${queueResult.summary.missingSourceCandidateGroups}
- 기존 대표 초안에서 발견한 축 양쪽 같은 문장: ${queueResult.summary.preResolutionSelectedAssertionCollisions}
- 기존 원문 후보로 자동 해소한 충돌: ${queueResult.summary.automaticallyResolvedAxisCollisions}
- 재선택 뒤 남은 축 양쪽 같은 문장: ${queueResult.summary.selectedAssertionCollisions}
- 한 글자 이웃 검사 통과: ${auditResult.summary.neighborEdgesPassingSelectedDraftCheck}/80
- 경로 독립 참조 구조: ${auditResult.summary.pathIndependentReferences ? "통과" : "실패"}

## 축별 같은 문장 충돌

| 축 | 충돌 |
| --- | ---: |
${axisRows}

## 우선 수정할 충돌 예시

${collisionExamples || "- 없음"}

## 다음 단계

1. 같은 축 조합에 원문이 둘 이상인 ${queueResult.summary.lineageMergeRequired}개를
   의미 단위로 나눠 정보 손실 없이 하나로 합친다.
2. 재선택 뒤 남은 충돌 ${queueResult.summary.selectedAssertionCollisions}개는
   해당 축의 실제 행동 차이가 드러나도록 새 문장을 쓴다.
3. 계보 문장을 합친 뒤 80개 이웃 모두에서 예상 슬롯만 달라지는지 다시 검사한다.
4. 최종 검수한 canonical ID만 32개 원장의 상황 장에 연결한다.
`;
}

function cartesianCodes() {
  const result = [];
  for (const first of ["E", "I"])
    for (const second of ["R", "N"])
      for (const third of ["G", "A"])
        for (const fourth of ["K", "M"])
          for (const fifth of ["C", "Q"])
            result.push(`${first}${second}${third}${fourth}${fifth}`);
  return result.sort();
}

function replaceAt(value, index, replacement) {
  return `${value.slice(0, index)}${replacement}${value.slice(index + 1)}`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
