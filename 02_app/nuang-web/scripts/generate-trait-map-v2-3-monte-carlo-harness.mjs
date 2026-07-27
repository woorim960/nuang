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
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_MONTE_CARLO_HARNESS_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "126_MONTE_CARLO_HARNESS_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const seedPath = path.join(
  projectRoot,
  "supabase/migrations/202607180002_core_candidate_bank_seed.sql",
);
const seedSource = fs.readFileSync(seedPath, "utf8");

const allItems = new Map(
  [
    ...seedSource.matchAll(
      /\('(NX-\d+)', '[^']+', '([A-Z]+)', '([^']+)', '(HIGH|LOW)', '([^']*)', '([^']*)', '([^']+)', '([^']+)', '([^']+)', '([^']+)'/g,
    ),
  ].map((match) => [
    match[1],
    {
      itemRevisionId: match[1],
      domainId: match[2],
      facetId: match[3],
      keyedDirection: match[4],
    },
  ]),
);
const betaItems = [
  ...seedSource.matchAll(
    /\('NUANG-CORE-BETA-1\.0', '(NX-\d+)', (\d+), '([^']+)', '(direct|reverse)'\)/g,
  ),
]
  .map((match) => ({
    ...allItems.get(match[1]),
    orderIndex: Number(match[2]),
    itemId: match[3],
    scoringKey: match[4],
  }))
  .sort((left, right) => left.orderIndex - right.orderIndex);
const publicAxisFacets = {
  SE: ["SE-RE", "SE-AI"],
  OE: ["OE-AE", "OE-CI", "OE-IE"],
  RO: ["RO-EC"],
  SM: ["SM-EP", "SM-OS"],
  ER: ["ER-IR", "ER-WD"],
};
const betaIds = new Set(betaItems.map((item) => item.itemRevisionId));
const followUpItems = Object.fromEntries(
  Object.entries(publicAxisFacets).map(([axis, facets]) => {
    const candidates = [...allItems.values()]
      .filter(
        (item) =>
          facets.includes(item.facetId) &&
          !betaIds.has(item.itemRevisionId),
      )
      .sort(
        (left, right) =>
          left.facetId.localeCompare(right.facetId, "en") ||
          left.keyedDirection.localeCompare(right.keyedDirection, "en") ||
          left.itemRevisionId.localeCompare(right.itemRevisionId, "en"),
      );
    const high = candidates
      .filter((item) => item.keyedDirection === "HIGH")
      .slice(0, 3);
    const low = candidates
      .filter((item) => item.keyedDirection === "LOW")
      .slice(0, 3);
    const selected = [high[0], low[0], high[1], low[1], high[2], low[2]];
    return [
      axis,
      selected.map((item, index) => ({
        ...item,
        scoringKey:
          item.keyedDirection === "HIGH" ? "direct" : "reverse",
        followUpOrder: index + 1,
      })),
    ];
  }),
);

const simulationConfig = {
  harnessVersion: "nuang-trait-map-monte-carlo-harness.v2.3",
  seed: 23072401,
  replicationsPerCell: 20,
  candidateSampleSizes: [240, 480, 960],
  responseCategories: 5,
  thresholds: [-1.1, -0.35, 0.35, 1.1],
  boundaryScoreThreshold: 0.18,
  minimumAnsweredRatioPerAxis: 0.5,
  followUpBatchSizes: [3, 6],
  scenarios: [
    {
      id: "REFERENCE",
      loading: 0.7,
      facetAxisCorrelation: 0.75,
      reverseMethodEffect: 0.08,
      unsureProbability: 0.03,
      thresholdScale: 1,
      description: "중간 신호·낮은 방법 효과·낮은 판단 어려움",
    },
    {
      id: "WEAK_SIGNAL",
      loading: 0.5,
      facetAxisCorrelation: 0.6,
      reverseMethodEffect: 0.14,
      unsureProbability: 0.07,
      thresholdScale: 1.08,
      description: "약한 신호·높은 판단 어려움",
    },
    {
      id: "REVERSE_METHOD_STRESS",
      loading: 0.64,
      facetAxisCorrelation: 0.7,
      reverseMethodEffect: 0.32,
      unsureProbability: 0.05,
      thresholdScale: 1,
      description: "역문항 방법 효과가 큰 스트레스 조건",
    },
  ],
};

const cellResults = [];
for (const scenario of simulationConfig.scenarios) {
  for (const sampleSize of simulationConfig.candidateSampleSizes) {
    const replications = [];
    for (
      let replication = 0;
      replication < simulationConfig.replicationsPerCell;
      replication += 1
    ) {
      replications.push(
        simulateReplication({
          scenario,
          sampleSize,
          replication,
          seed:
            simulationConfig.seed +
            stableHash(`${scenario.id}:${sampleSize}:${replication}`),
        }),
      );
    }
    cellResults.push({
      scenarioId: scenario.id,
      sampleSize,
      replications: replications.length,
      metrics: Object.fromEntries(
        Object.keys(replications[0]).map((metric) => [
          metric,
          summarize(replications.map((result) => result[metric])),
        ]),
      ),
    });
  }
}

const result = {
  contractVersion: simulationConfig.harnessVersion,
  reportId: "TRAIT-MAP-MONTE-CARLO-HARNESS.2.3",
  status: "ENGINEERING_HARNESS_SMOKE_TEST_COMPLETE",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  interpretationBoundary: {
    isEmpiricalValidation: false,
    isSampleSizeApproval: false,
    isFactorModelRecoveryStudy: false,
    permittedConclusion:
      "고정 seed로 5범주·결측·역문항·경계 추가 문항 흐름이 재현 가능하게 실행되고 결과 형식이 잠겼다.",
    prohibitedConclusions: [
      "현재 5축 구조가 실제 사람에게 타당하다.",
      "특정 표본 수가 충분하다.",
      "추가 질문 알고리즘이 운영 사용에 승인됐다.",
      "모의 정확도가 실제 정확도다.",
    ],
  },
  measurementAssets: {
    baseReleaseId: "NUANG-CORE-BETA-1.0",
    baseItemCount: betaItems.length,
    baseAxisItemCounts: countsBy(betaItems, (item) => item.domainId),
    followUpStatus: "HYPOTHETICAL_RESEARCH_ONLY_NOT_RELEASED",
    followUpItemCounts: Object.fromEntries(
      Object.entries(followUpItems).map(([axis, items]) => [
        axis,
        items.length,
      ]),
    ),
    followUpItems,
  },
  simulationConfig,
  metricDefinitions: {
    baseLatentCorrelation:
      "축별 단순 채점 평균과 생성에 사용한 잠재 축 사이 Pearson 상관의 5축 평균",
    baseClassificationAccuracy:
      "0을 기준으로 한 잠재 방향과 단순 채점 방향 일치율",
    boundaryActivationRate:
      "단순 채점 절댓값이 0.18 미만인 축 비율",
    postFollowUpClassificationAccuracy:
      "경계 축에 연구 후보 6문항을 추가한 뒤 전체 방향 일치율",
    unresolvedAfterThreeRate:
      "추가 3문항 뒤에도 절댓값이 0.18 미만인 경계 축 비율",
    unresolvedAfterFollowUpRate:
      "추가 6문항 뒤에도 절댓값이 0.18 미만인 축 비율",
    unsureRate: "생성된 기본 문항 중 판단 어려움으로 처리된 비율",
  },
  cellResults,
  automatedInvariants: {
    baseItemCountIs60: betaItems.length === 60,
    eachAxisHasSixFollowUpItems: Object.values(followUpItems).every(
      (items) => items.length === 6,
    ),
    followUpDirectionBalanced: Object.values(followUpItems).every(
      (items) =>
        items.filter((item) => item.keyedDirection === "HIGH").length === 3 &&
        items.filter((item) => item.keyedDirection === "LOW").length === 3,
    ),
    resultCellCount:
      simulationConfig.scenarios.length *
      simulationConfig.candidateSampleSizes.length,
    nonFiniteMetricCount: cellResults
      .flatMap((cell) => Object.values(cell.metrics))
      .flatMap((metric) => [metric.mean, metric.p10, metric.p90])
      .filter((value) => !Number.isFinite(value)).length,
  },
  nextGate: {
    name: "EXTERNAL_STATISTICAL_ENGINE_RECOVERY_STUDY",
    requirements: [
      "순서형 CFA·ESEM·IRT를 지원하는 검증된 통계 엔진과 버전을 고정한다.",
      "10세부 성향·5축·부분 위계·방법 요인의 자료 생성과 모형 회수를 분리 구현한다.",
      "편향·표준오차·수렴·coverage·모형 선택 오류·DIF 탐지력 기준을 사전 등록한다.",
      "개발·확인·재검사·집단별 holdout 손실을 포함해 표본 범위를 결정한다.",
    ],
  },
};

if (
  !result.automatedInvariants.baseItemCountIs60 ||
  !result.automatedInvariants.eachAxisHasSixFollowUpItems ||
  !result.automatedInvariants.followUpDirectionBalanced ||
  result.automatedInvariants.nonFiniteMetricCount !== 0
) {
  throw new Error("Monte Carlo harness invariants failed.");
}

const output = await prettier.format(JSON.stringify(result), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(result), {
  parser: "markdown",
});
if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.3 Monte Carlo harness is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Monte Carlo harness v2.3: ${result.cellResults.length} cells × ${simulationConfig.replicationsPerCell} replications, ${betaItems.length} base items, empirical validation false.`,
);

function simulateReplication({ scenario, sampleSize, seed }) {
  const random = createRandom(seed);
  let baseCorrelationSum = 0;
  let correlationAxes = 0;
  let baseCorrect = 0;
  let baseClassified = 0;
  let postCorrect = 0;
  let postClassified = 0;
  let boundaryCount = 0;
  let unresolvedAfterThreeCount = 0;
  let unresolvedCount = 0;
  let unsureCount = 0;
  let generatedBaseCount = 0;
  const axisPairs = Object.fromEntries(
    Object.keys(publicAxisFacets).map((axis) => [
      axis,
      { latent: [], score: [] },
    ]),
  );

  for (let person = 0; person < sampleSize; person += 1) {
    const latentAxes = Object.fromEntries(
      Object.keys(publicAxisFacets).map((axis) => [axis, random.normal()]),
    );
    const latentFacets = {};
    for (const [axis, facets] of Object.entries(publicAxisFacets)) {
      for (const facet of facets) {
        latentFacets[facet] =
          Math.sqrt(scenario.facetAxisCorrelation) * latentAxes[axis] +
          Math.sqrt(1 - scenario.facetAxisCorrelation) * random.normal();
      }
    }
    const baseResponses = new Map();
    for (const item of betaItems) {
      generatedBaseCount += 1;
      if (random.uniform() < scenario.unsureProbability) {
        unsureCount += 1;
        baseResponses.set(item.itemRevisionId, null);
      } else {
        baseResponses.set(
          item.itemRevisionId,
          generateResponse(item, latentFacets, scenario, random),
        );
      }
    }
    for (const axis of Object.keys(publicAxisFacets)) {
      const baseScore = scoreAxis(
        axis,
        betaItems,
        baseResponses,
        simulationConfig.minimumAnsweredRatioPerAxis,
      );
      if (baseScore === null) continue;
      axisPairs[axis].latent.push(latentAxes[axis]);
      axisPairs[axis].score.push(baseScore);
      baseClassified += 1;
      baseCorrect += sameDirection(baseScore, latentAxes[axis]) ? 1 : 0;
      const isBoundary =
        Math.abs(baseScore) < simulationConfig.boundaryScoreThreshold;
      if (!isBoundary) {
        postClassified += 1;
        postCorrect += sameDirection(baseScore, latentAxes[axis]) ? 1 : 0;
        continue;
      }
      boundaryCount += 1;
      const followResponses = new Map();
      for (const item of followUpItems[axis]) {
        followResponses.set(
          item.itemRevisionId,
          random.uniform() < scenario.unsureProbability
            ? null
            : generateResponse(item, latentFacets, scenario, random),
        );
      }
      const firstBatchItems = [
        ...betaItems.filter((item) => item.domainId === axis),
        ...followUpItems[axis].slice(0, 3),
      ];
      const firstBatchResponses = new Map([
        ...baseResponses.entries(),
        ...[...followResponses.entries()].slice(0, 3),
      ]);
      const firstBatchScore = scoreAxis(
        axis,
        firstBatchItems,
        firstBatchResponses,
        simulationConfig.minimumAnsweredRatioPerAxis,
      );
      if (
        firstBatchScore !== null &&
        Math.abs(firstBatchScore) <
          simulationConfig.boundaryScoreThreshold
      ) {
        unresolvedAfterThreeCount += 1;
      }
      const combinedItems = [
        ...betaItems.filter((item) => item.domainId === axis),
        ...followUpItems[axis],
      ];
      const combinedResponses = new Map([
        ...baseResponses.entries(),
        ...followResponses.entries(),
      ]);
      const postScore = scoreAxis(
        axis,
        combinedItems,
        combinedResponses,
        simulationConfig.minimumAnsweredRatioPerAxis,
      );
      if (postScore === null) continue;
      postClassified += 1;
      postCorrect += sameDirection(postScore, latentAxes[axis]) ? 1 : 0;
      unresolvedCount +=
        Math.abs(postScore) < simulationConfig.boundaryScoreThreshold ? 1 : 0;
    }
  }

  for (const pairs of Object.values(axisPairs)) {
    const correlation = pearson(pairs.latent, pairs.score);
    if (Number.isFinite(correlation)) {
      baseCorrelationSum += correlation;
      correlationAxes += 1;
    }
  }
  return {
    baseLatentCorrelation: baseCorrelationSum / correlationAxes,
    baseClassificationAccuracy: baseCorrect / baseClassified,
    boundaryActivationRate: boundaryCount / baseClassified,
    postFollowUpClassificationAccuracy: postCorrect / postClassified,
    unresolvedAfterThreeRate:
      boundaryCount === 0 ? 0 : unresolvedAfterThreeCount / boundaryCount,
    unresolvedAfterFollowUpRate:
      boundaryCount === 0 ? 0 : unresolvedCount / boundaryCount,
    unsureRate: unsureCount / generatedBaseCount,
  };
}

function generateResponse(item, latentFacets, scenario, random) {
  const direction = item.keyedDirection === "HIGH" ? 1 : -1;
  const method =
    item.scoringKey === "reverse"
      ? scenario.reverseMethodEffect * random.normal()
      : 0;
  const residualScale = Math.sqrt(1 - scenario.loading ** 2);
  const continuous =
    direction * scenario.loading * latentFacets[item.facetId] +
    residualScale * random.normal() +
    method;
  const thresholds = simulationConfig.thresholds.map(
    (threshold) => threshold * scenario.thresholdScale,
  );
  let raw = 1;
  while (raw <= thresholds.length && continuous > thresholds[raw - 1]) {
    raw += 1;
  }
  return raw;
}

function scoreAxis(axis, items, responses, minimumRatio) {
  const axisItems = items.filter((item) => item.domainId === axis);
  const values = axisItems
    .map((item) => {
      const raw = responses.get(item.itemRevisionId);
      if (raw === null || raw === undefined) return null;
      const scored = item.scoringKey === "reverse" ? 6 - raw : raw;
      return (scored - 3) / 2;
    })
    .filter((value) => value !== null);
  if (values.length < axisItems.length * minimumRatio) return null;
  return mean(values);
}

function sameDirection(left, right) {
  return (left >= 0 && right >= 0) || (left < 0 && right < 0);
}

function pearson(left, right) {
  if (left.length !== right.length || left.length < 3) return Number.NaN;
  const leftMean = mean(left);
  const rightMean = mean(right);
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    covariance += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }
  return covariance / Math.sqrt(leftVariance * rightVariance);
}

function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    mean: round(mean(sorted)),
    p10: round(quantile(sorted, 0.1)),
    p90: round(quantile(sorted, 0.9)),
  };
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantile(sorted, probability) {
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return (
    sorted[lower] +
    (sorted[upper] - sorted[lower]) * (position - lower)
  );
}

function round(value) {
  return Number(value.toFixed(4));
}

function countsBy(items, selector) {
  return Object.fromEntries(
    [...Map.groupBy(items, selector).entries()]
      .map(([key, values]) => [key, values.length])
      .sort(([left], [right]) => left.localeCompare(right, "en")),
  );
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed) {
  let state = seed >>> 0;
  let spare = null;
  return {
    uniform() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    normal() {
      if (spare !== null) {
        const value = spare;
        spare = null;
        return value;
      }
      let left = 0;
      let right = 0;
      while (left === 0) left = this.uniform();
      while (right === 0) right = this.uniform();
      const magnitude = Math.sqrt(-2 * Math.log(left));
      spare = magnitude * Math.sin(2 * Math.PI * right);
      return magnitude * Math.cos(2 * Math.PI * right);
    },
  };
}

function buildMarkdown(result) {
  const rows = result.cellResults
    .map(
      (cell) =>
        `| ${cell.scenarioId} | ${cell.sampleSize} | ${cell.metrics.baseLatentCorrelation.mean} | ${cell.metrics.baseClassificationAccuracy.mean} | ${cell.metrics.boundaryActivationRate.mean} | ${cell.metrics.unresolvedAfterThreeRate.mean} | ${cell.metrics.postFollowUpClassificationAccuracy.mean} | ${cell.metrics.unresolvedAfterFollowUpRate.mean} |`,
    )
    .join("\n");
  return `# v2.3 Monte Carlo 분석 하네스

## 결론의 경계

이 실행은 **공학적 재현성 시험**이다. 실제 참여자에게 5축이 타당한지,
어떤 표본 수가 충분한지, 추가 질문을 운영해도 되는지를 승인하지 않는다.
고정 seed로 5범주 응답·판단 어려움·역문항·경계 추가 문항이 같은
결과를 내고 분석 형식이 깨지지 않는지만 확인한다.

- 기본 문항: ${result.measurementAssets.baseItemCount}개
- 가상 추가 문항: 축별 6개(각 HIGH 3, LOW 3)
- 시나리오: ${result.simulationConfig.scenarios.length}개
- 후보 표본 크기: ${result.simulationConfig.candidateSampleSizes.join(", ")}
- cell당 반복: ${result.simulationConfig.replicationsPerCell}회

| 조건 | N | 잠재축 상관 | 기본 방향 일치 | 경계 활성화 | 3문항 뒤 경계 | 6문항 뒤 방향 일치 | 6문항 뒤 경계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${rows}

수치는 모의 생성 규칙을 다시 찾는 smoke metric이며 실제 고객 정확도가
아니다. 다음 단계에서는 순서형 CFA·ESEM·IRT를 지원하는 외부 통계 엔진에
10세부 성향·5축·부분 위계·방법 요인 모형을 구현하고, 편향·coverage·
수렴·DIF 탐지력을 사전 기준으로 평가해야 한다.
`;
}
