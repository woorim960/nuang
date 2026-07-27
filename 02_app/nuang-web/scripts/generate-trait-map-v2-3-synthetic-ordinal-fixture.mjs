import crypto from "node:crypto";
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
const analysisDirectory = path.join(
  projectRoot,
  "analysis/trait-map-v2-3",
);
const fixtureDirectory = path.join(analysisDirectory, "fixtures");
const modelManifest = JSON.parse(
  fs.readFileSync(
    path.join(analysisDirectory, "ordinal_model_manifest.json"),
    "utf8",
  ),
);
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_SYNTHETIC_ORDINAL_FIXTURE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "128_SYNTHETIC_ORDINAL_FIXTURE_V2_3.md",
);
const fixturePath = path.join(
  fixtureDirectory,
  "synthetic_reference_n240.csv",
);
const checkOnly = process.argv.includes("--check");
const seed = 23072402;
const sampleSize = 240;
const random = createRandom(seed);
const axisFacets = {
  SE: ["SE-RE", "SE-AI"],
  OE: ["OE-AE", "OE-CI", "OE-IE"],
  RO: ["RO-EC"],
  SM: ["SM-EP", "SM-OS"],
  ER: ["ER-IR", "ER-WD"],
};
const thresholds = [-1.1, -0.35, 0.35, 1.1];
const rows = [];
const valueCounts = Object.fromEntries(
  modelManifest.orderedVariables.map((variable) => [
    variable,
    { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, missing: 0 },
  ]),
);

for (let person = 0; person < sampleSize; person += 1) {
  const axes = Object.fromEntries(
    Object.keys(axisFacets).map((axis) => [axis, random.normal()]),
  );
  const facets = {};
  for (const [axis, facetIds] of Object.entries(axisFacets)) {
    for (const facetId of facetIds) {
      facets[facetId] =
        Math.sqrt(0.75) * axes[axis] + Math.sqrt(0.25) * random.normal();
    }
  }
  const row = {
    attempt_ref: `synthetic-${String(person + 1).padStart(4, "0")}`,
  };
  for (const item of modelManifest.itemMap) {
    if (random.uniform() < 0.03) {
      row[item.analysisVariable] = "";
      valueCounts[item.analysisVariable].missing += 1;
      continue;
    }
    const direction = item.keyedDirection === "HIGH" ? 1 : -1;
    const continuous =
      direction * 0.7 * facets[item.facetId] +
      Math.sqrt(1 - 0.7 ** 2) * random.normal() +
      (item.scoringKey === "reverse" ? 0.08 * random.normal() : 0);
    let response = 1;
    while (
      response <= thresholds.length &&
      continuous > thresholds[response - 1]
    ) {
      response += 1;
    }
    row[item.analysisVariable] = response;
    valueCounts[item.analysisVariable][String(response)] += 1;
  }
  rows.push(row);
}

const headers = ["attempt_ref", ...modelManifest.orderedVariables];
const csv = [
  headers.join(","),
  ...rows.map((row) => headers.map((header) => row[header]).join(",")),
].join("\n");
const fixtureOutput = `${csv}\n`;
const sha256 = crypto
  .createHash("sha256")
  .update(fixtureOutput)
  .digest("hex");
const itemsMissingCategories = Object.entries(valueCounts)
  .filter(([, counts]) =>
    ["1", "2", "3", "4", "5"].some((category) => counts[category] === 0),
  )
  .map(([variable]) => variable);
const totalCells = sampleSize * modelManifest.orderedVariables.length;
const missingCells = Object.values(valueCounts).reduce(
  (sum, counts) => sum + counts.missing,
  0,
);
const manifest = {
  contractVersion: "nuang-trait-map-synthetic-ordinal-fixture.v2.3",
  reportId: "TRAIT-MAP-SYNTHETIC-ORDINAL-FIXTURE.2.3",
  status: "SYNTHETIC_FIXTURE_READY",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  interpretationBoundary: {
    containsRealParticipantData: false,
    isEmpiricalEvidence: false,
    isValidityEvidence: false,
    permittedUse:
      "분석 입력·범주·결측·열 순서·runner 입출력의 공학적 시험",
  },
  fixture: {
    path: "analysis/trait-map-v2-3/fixtures/synthetic_reference_n240.csv",
    sha256,
    seed,
    sampleSize,
    itemCount: modelManifest.orderedVariables.length,
    rowCount: rows.length,
    columnCount: headers.length,
    missingCellCount: missingCells,
    missingRate: Number((missingCells / totalCells).toFixed(6)),
    itemsMissingAnyCategory: itemsMissingCategories,
    valueCounts,
  },
  automatedInvariants: {
    rowsMatchSampleSize: rows.length === sampleSize,
    itemsMatchLockedManifest:
      modelManifest.orderedVariables.length === 60,
    allItemsCoverFiveCategories: itemsMissingCategories.length === 0,
    valuesAreOneToFiveOrMissing: rows.every((row) =>
      modelManifest.orderedVariables.every(
        (variable) =>
          row[variable] === "" ||
          (Number.isInteger(row[variable]) &&
            row[variable] >= 1 &&
            row[variable] <= 5),
      ),
    ),
  },
  executionState: {
    nodeInputValidationPassed: true,
    rRunnerExecuted: false,
    empiricalFitExecuted: false,
  },
  nextGate: {
    name: "R_RUNTIME_LOCK_AND_RUNNER_SMOKE_TEST",
    actions: [
      "R 환경을 설치·잠근다.",
      "이 fixture로 M1·M2·M5를 실행한다.",
      "수렴·부적절 해·출력 파일·sessionInfo를 검사한다.",
      "합성 자료 결과를 고객 타당성 근거로 사용하지 않는다.",
    ],
  },
};

if (
  !Object.values(manifest.automatedInvariants).every(Boolean) ||
  manifest.fixture.itemCount !== 60
) {
  throw new Error("Synthetic ordinal fixture invariants failed.");
}

const output = await prettier.format(JSON.stringify(manifest), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(manifest), {
  parser: "markdown",
});
if (checkOnly) {
  const expected = [
    [outputPath, output],
    [reportPath, markdown],
    [fixturePath, fixtureOutput],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 synthetic ordinal fixture is stale.");
    process.exit(1);
  }
} else {
  fs.mkdirSync(fixtureDirectory, { recursive: true });
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
  fs.writeFileSync(fixturePath, fixtureOutput);
}
console.log(
  `Synthetic ordinal fixture v2.3: ${sampleSize} rows × ${modelManifest.orderedVariables.length} items, missing ${manifest.fixture.missingRate}, real participants 0.`,
);

function createRandom(initialSeed) {
  let state = initialSeed >>> 0;
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
  return `# v2.3 합성 순서형 분석 fixture

실제 참여자 자료 없이 분석 입력과 runner를 시험하기 위한 합성 CSV를
고정 seed로 만들었다.

- 행: ${result.fixture.rowCount}
- 문항: ${result.fixture.itemCount}
- 1–5 범주를 모두 가진 문항: ${result.fixture.itemCount - result.fixture.itemsMissingAnyCategory.length}/${result.fixture.itemCount}
- 결측률: ${result.fixture.missingRate}
- SHA-256: \`${result.fixture.sha256}\`

파일: \`${result.fixture.path}\`

이 자료에는 실제 참여자가 한 명도 없고, 모의 적재량과 결측률을 사용한다.
따라서 수렴 시험과 입출력 검증 외에 타당성·정확도·표본 수의 근거로
사용할 수 없다. R 실행은 아직 시작하지 않았다.
`;
}
