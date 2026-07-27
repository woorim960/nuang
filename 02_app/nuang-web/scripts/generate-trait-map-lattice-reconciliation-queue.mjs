import crypto from "node:crypto";
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
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_LATTICE_RECONCILIATION_QUEUE_V2.json",
);
const checkOnly = process.argv.includes("--check");
const codes = cartesianCodes();
const axisDefinitions = [
  {
    position: 1,
    symbols: ["E", "I"],
    enakqNeighbor: "INAKQ",
    irgmcNeighbor: "ERGMC",
  },
  {
    position: 2,
    symbols: ["R", "N"],
    enakqNeighbor: "ERAKQ",
    irgmcNeighbor: "INGMC",
  },
  {
    position: 3,
    symbols: ["G", "A"],
    enakqNeighbor: "ENGKQ",
    irgmcNeighbor: "IRAMC",
  },
  {
    position: 4,
    symbols: ["K", "M"],
    enakqNeighbor: "ENAMQ",
    irgmcNeighbor: "IRGKC",
  },
  {
    position: 5,
    symbols: ["C", "Q"],
    enakqNeighbor: "ENAKC",
    irgmcNeighbor: "IRGMQ",
  },
];
const packets = Object.fromEntries(
  codes.map((code) => [code, readGenerated(`${code}_SCENARIO_REVIEW_V2.json`)]),
);
const claimsByCodeAndKey = Object.fromEntries(
  codes.map((code) => [
    code,
    new Map(
      packets[code].claims.map((claim) => [
        claim.claimId.replace(code, ""),
        claim,
      ]),
    ),
  ]),
);
const claimKeys = [...claimsByCodeAndKey.ENAKQ.keys()].sort();
const queue = claimKeys.map(buildQueueItem);
const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  queueId: "TRAIT-MAP-LATTICE-RECONCILIATION.0.1",
  status: "RECONCILIATION_REQUIRED_BEFORE_CUSTOMER_CONTENT_AUTHORING",
  purpose:
    "32개 코드의 같은 상황·같은 관찰 채널을 하나의 5축 격자에서 비교해, 부모 경로에 따라 달라진 문장과 현재 축 판별 목록으로 설명되지 않는 기준점 차이를 보존하며 재분류한다.",
  axisDefinitions,
  summary: {
    claimSlots: queue.length,
    axisControlledSlots: queue.filter((item) => item.controlledAxes.length > 0)
      .length,
    unaccountedAnchorDifferences: queue.filter(
      (item) => item.unaccountedAnchorDifference,
    ).length,
    excessLineageVariantSlots: queue.filter(
      (item) => item.actualVariantCount > item.expectedVariantCeiling,
    ).length,
    missingCombinationSlots: queue.filter(
      (item) =>
        item.controlledAxes.length > 0 &&
        item.actualVariantCount < item.expectedVariantCeiling,
    ).length,
    readyForCompositionReview: queue.filter(
      (item) => item.status === "READY_FOR_COMPOSITION_REVIEW",
    ).length,
  },
  decisionRules: [
    "ENAKQ와 IRGMC가 다르지만 현재 직접 파생 축 어느 것에도 연결되지 않은 문장은 공통 문장으로 덮어쓰지 않고 의미 축을 다시 분류한다.",
    "같은 축 조합인데 부모 경로에 따라 문장이 여러 개면 내용 손실 없이 하나의 canonical assertion으로 합친다.",
    "두 축이 함께 영향을 주는 문장은 네 조합 모두를 비교하고 상호작용 문장을 별도로 승인한다.",
    "관계·능력·정신건강 위험 문장은 자동 병합하지 않고 해당 전문 검토를 다시 거친다.",
    "재조정 뒤에는 한 글자 이웃 80쌍, 두 경로 수렴, 원장·결과·비교 리포트 변환을 다시 감사한다.",
  ],
  queue,
};
const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});

if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "Trait-map lattice reconciliation queue is stale. Run npm run research:trait-map:v2:lattice-reconciliation.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}

console.log(
  `Lattice reconciliation queue: ${report.summary.claimSlots} slots, ${report.summary.unaccountedAnchorDifferences} unaccounted anchor differences, ${report.summary.excessLineageVariantSlots} excess-variant slots.`,
);

function buildQueueItem(claimKey) {
  const enakqClaim = claimsByCodeAndKey.ENAKQ.get(claimKey);
  const irgmcClaim = claimsByCodeAndKey.IRGMC.get(claimKey);
  const controlledAxes = axisDefinitions
    .filter((axis) => {
      const enakqNeighborClaim =
        claimsByCodeAndKey[axis.enakqNeighbor].get(claimKey);
      const irgmcNeighborClaim =
        claimsByCodeAndKey[axis.irgmcNeighbor].get(claimKey);
      return (
        enakqNeighborClaim.assertion !== enakqClaim.assertion ||
        irgmcNeighborClaim.assertion !== irgmcClaim.assertion
      );
    })
    .map((axis) => ({
      position: axis.position,
      symbols: axis.symbols,
      enakqControlledDifference:
        claimsByCodeAndKey[axis.enakqNeighbor].get(claimKey).assertion !==
        enakqClaim.assertion,
      irgmcControlledDifference:
        claimsByCodeAndKey[axis.irgmcNeighbor].get(claimKey).assertion !==
        irgmcClaim.assertion,
    }));
  const variants = new Map();

  for (const code of codes) {
    const claim = claimsByCodeAndKey[code].get(claimKey);
    const variantId = digest(claim.assertion);
    const variant = variants.get(variantId) ?? {
      variantId,
      assertion: claim.assertion,
      codes: [],
      evidenceFindingRefs: new Set(),
      independentSourceRefs: new Set(),
    };
    variant.codes.push(code);
    claim.evidenceFindingRefs.forEach((ref) =>
      variant.evidenceFindingRefs.add(ref),
    );
    claim.independentSourceRefs.forEach((ref) =>
      variant.independentSourceRefs.add(ref),
    );
    variants.set(variantId, variant);
  }

  const expectedVariantCeiling = Math.max(1, 2 ** controlledAxes.length);
  const anchorDifference = enakqClaim.assertion !== irgmcClaim.assertion;
  const unaccountedAnchorDifference =
    anchorDifference && controlledAxes.length === 0;
  const actualVariantCount = variants.size;
  const status = unaccountedAnchorDifference
    ? "SEMANTIC_AXIS_CLASSIFICATION_REQUIRED"
    : actualVariantCount > expectedVariantCeiling
      ? "LINEAGE_VARIANT_RECONCILIATION_REQUIRED"
      : actualVariantCount < expectedVariantCeiling && controlledAxes.length > 0
        ? "MISSING_COMBINATION_AUTHORING_REQUIRED"
        : "READY_FOR_COMPOSITION_REVIEW";

  return {
    claimKey,
    scenarioRef: enakqClaim.scenarioRefs[0],
    context: enakqClaim.contexts[0],
    claimKind: enakqClaim.claimKind,
    privacyScope: enakqClaim.privacyScope,
    riskDomains: [
      ...new Set(
        codes.flatMap(
          (code) => claimsByCodeAndKey[code].get(claimKey).riskDomains,
        ),
      ),
    ].sort(),
    anchorDifference,
    unaccountedAnchorDifference,
    controlledAxes,
    expectedVariantCeiling,
    actualVariantCount,
    status,
    variants: [...variants.values()]
      .map((variant) => ({
        variantId: variant.variantId,
        assertion: variant.assertion,
        codes: variant.codes.sort(),
        evidenceFindingRefs: [...variant.evidenceFindingRefs].sort(),
        independentSourceRefs: [...variant.independentSourceRefs].sort(),
      }))
      .sort(
        (left, right) =>
          right.codes.length - left.codes.length ||
          left.variantId.localeCompare(right.variantId, "en"),
      ),
  };
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
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

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}
