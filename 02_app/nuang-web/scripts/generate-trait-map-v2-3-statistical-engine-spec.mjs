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
const quantitativePlan = JSON.parse(
  fs.readFileSync(
    path.join(
      generatedDirectory,
      "TRAIT_MAP_QUANTITATIVE_VALIDATION_PLAN_V2_3.json",
    ),
    "utf8",
  ),
);
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_STATISTICAL_ENGINE_SPEC_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "127_STATISTICAL_ENGINE_AND_MODEL_IDENTIFICATION_V2_3.md",
);
const modelManifestPath = path.join(
  analysisDirectory,
  "ordinal_model_manifest.json",
);
const runnerPath = path.join(analysisDirectory, "run_ordinal_cfa.R");
const checkOnly = process.argv.includes("--check");
const items = quantitativePlan.currentManifest.items.map((item) => ({
  ...item,
  analysisVariable: item.itemId.replaceAll("-", "_"),
}));
const facets = groupBy(items, (item) => item.facetId);
const axes = groupBy(items, (item) => item.domainId);
const reverseItems = items.filter((item) => item.scoringKey === "reverse");

const modelManifest = {
  manifestVersion: "nuang-ordinal-models.v2.3",
  measurementReleaseId:
    quantitativePlan.currentManifest.itemBankReleaseId,
  itemCount: items.length,
  orderedVariables: items.map((item) => item.analysisVariable),
  itemMap: items.map((item) => ({
    itemRevisionId: item.itemRevisionId,
    itemId: item.itemId,
    analysisVariable: item.analysisVariable,
    domainId: item.domainId,
    facetId: item.facetId,
    keyedDirection: item.keyedDirection,
    scoringKey: item.scoringKey,
  })),
  models: [
    model(
      "M1_TEN_CORRELATED_FACETS",
      "READY_FOR_SIMULATION_AND_EMPIRICAL_FIT",
      syntaxForGroups(facets),
      "10개 세부 성향을 각각 6문항으로 측정하고 모든 세부 성향 상관을 추정한다.",
    ),
    model(
      "M2_FIVE_CORRELATED_AXES",
      "READY_AS_COARSE_COMPARATOR",
      syntaxForGroups(axes),
      "세부 성향을 접고 5개 축으로 직접 적재한다. 단순하지만 세부 구조를 잃는 비교 모형이다.",
    ),
    model(
      "M3_PARTIAL_SECOND_ORDER",
      "BLOCKED_IDENTIFICATION_AND_THEORY_CONSTRAINTS_REQUIRED",
      null,
      "OE는 세 개의 1차 요인이 있으나 SE·SM·ER은 두 개, RO는 한 개뿐이다. 임의의 동일성 제약 없이 동일한 2차 구조를 강요하지 않는다.",
    ),
    model(
      "M4_TARGET_ESEM",
      "ENGINE_AND_ROTATION_SPEC_REQUIRED",
      null,
      "작은 교차적재를 허용하되 목표 회전·허용 범위·확인 표본 재현 규칙을 먼저 잠가야 한다.",
    ),
    model(
      "M5_REVERSE_METHOD_FACTOR",
      "READY_AS_SENSITIVITY_MODEL",
      `${syntaxForGroups(facets)}
REV_METHOD =~ ${reverseItems.map((item) => item.analysisVariable).join(" + ")}
${[...facets.keys()].map((facet) => `${safeName(facet)} ~~ 0*REV_METHOD`).join("\n")}`,
      "10개 세부 성향에 역문항 방법 요인을 직교로 추가한다. 방법 요인이 강하면 문항 문구를 우선 점검한다.",
    ),
  ],
};

const spec = {
  contractVersion: "nuang-trait-map-statistical-engine-spec.v2.3",
  reportId: "TRAIT-MAP-STATISTICAL-ENGINE-SPEC.2.3",
  status: "ENGINE_SPEC_AND_RUNNER_READY_ENGINE_NOT_INSTALLED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  officialReferences: [
    {
      id: "LAVAAN-CATEGORICAL",
      url: "https://lavaan.ugent.be/tutorial/cat.html",
      applied:
        "1–5 응답을 ordered로 지정하고 주 분석에 WLSMV를 사용한다. 순서형 자료의 FIML은 지원되지 않으므로 결측 처리를 별도 계획한다.",
    },
    {
      id: "SIMSEM-CRAN",
      url: "https://cran.r-project.org/package=simsem",
      applied:
        "구조방정식 Monte Carlo와 결측·표본 계획을 위한 회수 연구 후보 엔진으로 둔다.",
    },
    {
      id: "MIRT-CRAN",
      url: "https://cran.r-project.org/package=mirt",
      applied:
        "다차원 순서형 IRT, 문항 정보, 다집단 DIF, 추가 문항 후보 분석에 사용한다.",
    },
    {
      id: "SEMTOOLS-CRAN",
      url: "https://cran.r-project.org/package=semTools",
      applied:
        "요인모형 기반 신뢰도와 측정동일성 보조 분석에 사용한다.",
    },
  ],
  engineLock: {
    primaryRuntime: "R",
    minimumRVersion: "4.1.0",
    packagesObservedOn20260724: {
      lavaan: "0.6-21",
      simsem: "0.5-17",
      mirt: "1.46.1",
      semTools: "0.5-9",
    },
    reproducibilityRule:
      "첫 성공 실행 때 R 버전·OS·패키지·의존성을 renv.lock과 sessionInfo()로 고정하고 이후 결과에 lock hash를 기록한다.",
    currentEnvironment: {
      rscriptAvailable: false,
      packagesInstalled: false,
      runnerExecuted: false,
    },
  },
  modelIdentificationAudit: modelManifest.models.map((candidate) => ({
    modelId: candidate.modelId,
    state: candidate.state,
    rationale: candidate.rationale,
  })),
  estimationContract: {
    observedItems: "60개 5범주 순서형 문항",
    estimator: "WLSMV",
    ordered: true,
    missingPrimary:
      "pairwise는 주 분석 후보이나, 결측 기제와 판단 어려움을 함께 고려한 민감도 분석 없이 단독 결론으로 사용하지 않는다.",
    parameterization:
      "기본 delta; theta는 사전 명세된 민감도 분석에서만 비교",
    developmentConfirmationSplit:
      "participant_ref 단위로 사전 seed 기반 분할하며 같은 참여자·재검사 쌍이 양쪽에 걸치지 않는다.",
  },
  reportingContract: {
    fit: [
      "scaled chi-square와 자유도",
      "robust CFI·TLI",
      "robust RMSEA와 구간",
      "SRMR",
    ],
    parameters: [
      "표준화 적재와 구간",
      "문항 threshold",
      "요인 상관",
      "잔차·국소 의존",
      "Heywood case",
    ],
    recovery: [
      "convergence rate",
      "parameter bias",
      "standard error bias",
      "interval coverage",
      "improper solution rate",
      "model selection error",
    ],
    noSingleFitIndexApproval: true,
  },
  generatedAssets: [
    "analysis/trait-map-v2-3/ordinal_model_manifest.json",
    "analysis/trait-map-v2-3/run_ordinal_cfa.R",
  ],
  executionState: {
    modelManifestGenerated: true,
    runnerGenerated: true,
    rRuntimeInstalled: false,
    simulationRecoveryExecuted: false,
    empiricalFitExecuted: false,
  },
  nextGate: {
    name: "R_RUNTIME_LOCK_AND_SYNTHETIC_RECOVERY_EXECUTION",
    blockedBy:
      "현재 환경에 Rscript와 필요한 검증 패키지가 없다.",
    actions: [
      "R과 네 패키지를 격리 환경에 설치하고 renv.lock을 생성한다.",
      "synthetic input으로 M1·M2·M5 runner를 실행한다.",
      "M3 식별 제약은 심리측정 전문가의 이론 승인 전 구현하지 않는다.",
      "M4는 목표 회전 사양을 확정한 뒤 별도 runner로 구현한다.",
    ],
  },
};

if (
  items.length !== 60 ||
  facets.size !== 10 ||
  axes.size !== 5 ||
  modelManifest.models.filter((candidate) => candidate.syntax).length !== 3 ||
  modelManifest.models.find(
    (candidate) => candidate.modelId === "M3_PARTIAL_SECOND_ORDER",
  ).state !== "BLOCKED_IDENTIFICATION_AND_THEORY_CONSTRAINTS_REQUIRED"
) {
  throw new Error("Statistical engine specification invariants failed.");
}

const output = await prettier.format(JSON.stringify(spec), {
  parser: "json",
});
const report = await prettier.format(buildMarkdown(spec), {
  parser: "markdown",
});
const modelOutput = await prettier.format(JSON.stringify(modelManifest), {
  parser: "json",
});
const runnerOutput = `${buildRunner(modelManifest).trim()}\n`;
if (checkOnly) {
  const expected = [
    [outputPath, output],
    [reportPath, report],
    [modelManifestPath, modelOutput],
    [runnerPath, runnerOutput],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 statistical engine specification is stale.");
    process.exit(1);
  }
} else {
  fs.mkdirSync(analysisDirectory, { recursive: true });
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, report);
  fs.writeFileSync(modelManifestPath, modelOutput);
  fs.writeFileSync(runnerPath, runnerOutput);
}
console.log(
  `Statistical engine spec v2.3: ${items.length} ordered items, 3 runnable model syntaxes, M3 blocked, R engine not installed.`,
);

function groupBy(values, selector) {
  return Map.groupBy(values, selector);
}

function safeName(value) {
  return value.replaceAll("-", "_");
}

function syntaxForGroups(groups) {
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(
      ([groupId, groupItems]) =>
        `${safeName(groupId)} =~ ${groupItems.map((item) => item.analysisVariable).join(" + ")}`,
    )
    .join("\n");
}

function model(modelId, state, syntax, rationale) {
  return { modelId, state, syntax, rationale };
}

function buildRunner(manifest) {
  const runnableModels = manifest.models.filter(
    (candidate) => candidate.syntax,
  );
  return `args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 2) {
  stop("Usage: Rscript run_ordinal_cfa.R <analysis_attempt_wide.csv> <output_dir>")
}

required <- c(lavaan = "0.6-21", semTools = "0.5-9")
for (package_name in names(required)) {
  if (!requireNamespace(package_name, quietly = TRUE)) {
    stop(paste("Missing required package:", package_name))
  }
  if (packageVersion(package_name) < package_version(required[[package_name]])) {
    stop(paste("Package is older than locked minimum:", package_name))
  }
}

input_path <- normalizePath(args[[1]], mustWork = TRUE)
output_dir <- args[[2]]
dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)
data <- read.csv(input_path, check.names = FALSE, na.strings = c("", "NA"))
ordered_items <- c(${manifest.orderedVariables.map((item) => `"${item}"`).join(", ")})
missing_items <- setdiff(ordered_items, names(data))
if (length(missing_items) > 0) {
  stop(paste("Missing locked items:", paste(missing_items, collapse = ", ")))
}
if (any(vapply(data[ordered_items], function(column) {
  any(!is.na(column) & !(column %in% 1:5))
}, logical(1)))) {
  stop("Ordered item values must be 1..5 or NA")
}
data[ordered_items] <- lapply(data[ordered_items], ordered)

models <- list(
${runnableModels
  .map(
    (candidate) =>
      `  ${candidate.modelId} = ${JSON.stringify(candidate.syntax)}`,
  )
  .join(",\n")}
)

fit_rows <- list()
for (model_id in names(models)) {
  fit <- lavaan::cfa(
    model = models[[model_id]],
    data = data,
    ordered = ordered_items,
    estimator = "WLSMV",
    missing = "pairwise",
    std.lv = TRUE
  )
  saveRDS(fit, file.path(output_dir, paste0(model_id, ".rds")))
  measures <- lavaan::fitMeasures(
    fit,
    c("chisq.scaled", "df.scaled", "cfi.robust", "tli.robust",
      "rmsea.robust", "rmsea.ci.lower.robust", "rmsea.ci.upper.robust", "srmr")
  )
  fit_rows[[model_id]] <- data.frame(
    model_id = model_id,
    converged = lavaan::lavInspect(fit, "converged"),
    improper_variance_count = sum(
      lavaan::parameterEstimates(fit)$op == "~~" &
      lavaan::parameterEstimates(fit)$lhs ==
        lavaan::parameterEstimates(fit)$rhs &
      lavaan::parameterEstimates(fit)$est < 0
    ),
    t(measures),
    check.names = FALSE
  )
  write.csv(
    lavaan::standardizedSolution(fit),
    file.path(output_dir, paste0(model_id, "_standardized.csv")),
    row.names = FALSE
  )
}
write.csv(
  do.call(rbind, fit_rows),
  file.path(output_dir, "fit_summary.csv"),
  row.names = FALSE
)
writeLines(capture.output(sessionInfo()), file.path(output_dir, "session_info.txt"))
`;
}

function buildMarkdown(result) {
  const rows = result.modelIdentificationAudit
    .map(
      (candidate) =>
        `| ${candidate.modelId} | ${candidate.state} | ${candidate.rationale} |`,
    )
    .join("\n");
  return `# v2.3 통계 엔진·모형 식별 사양

## 엔진 선택

5점 문항은 순서형으로 지정하고 주 분석은 \`lavaan\` WLSMV로 실행한다.
\`simsem\`은 구조 모형 회수, \`mirt\`는 문항 정보·다차원 IRT·DIF,
\`semTools\`는 모형 기반 신뢰도·동일성 보조 분석에 사용한다.

공식 자료:

- lavaan categorical: ${result.officialReferences[0].url}
- simsem CRAN: ${result.officialReferences[1].url}
- mirt CRAN: ${result.officialReferences[2].url}
- semTools CRAN: ${result.officialReferences[3].url}

## 식별 감사

| 모형 | 상태 | 판단 |
| --- | --- | --- |
${rows}

M3를 보류한 이유는 데이터가 나빠서가 아니다. OE는 세 세부 성향이지만
SE·SM·ER은 두 개, RO는 한 개뿐이므로 동일한 2차 요인 구조를 임의로
강요하면 모형 식별을 위해 근거 없는 동일성 제약을 넣게 된다.

## 생성된 실행 자산

- \`analysis/trait-map-v2-3/ordinal_model_manifest.json\`
- \`analysis/trait-map-v2-3/run_ordinal_cfa.R\`

현재 환경에는 Rscript와 패키지가 없어 runner를 실행하지 않았다.
실행 결과나 타당성 승인을 가장하지 않으며, 첫 실행 때 \`renv.lock\`과
\`sessionInfo()\`를 함께 고정한다.
`;
}
