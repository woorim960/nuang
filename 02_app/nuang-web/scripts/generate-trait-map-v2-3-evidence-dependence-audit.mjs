import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import ts from "typescript";

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
  "TRAIT_MAP_EVIDENCE_DEPENDENCE_AUDIT_V2_3.json",
);
const templatePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_EVIDENCE_DEPENDENCE_REGISTRY_TEMPLATE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "133_EVIDENCE_DEPENDENCE_AUDIT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const evidenceFiles = [
  "src/features/nuang-code/trait-map-change-context-evidence-v2.ts",
  "src/features/nuang-code/trait-map-foundation-evidence-v2.ts",
  "src/features/nuang-code/trait-map-friendship-evidence-v2.ts",
  "src/features/nuang-code/trait-map-relationship-evidence-v2.ts",
  "src/features/nuang-code/trait-map-process-evidence-v2.ts",
  "src/features/nuang-code/trait-map-work-evidence-v2.ts",
];
const evidenceTrace = readGenerated(
  "TRAIT_MAP_EVIDENCE_TRACE_AUDIT_V2_3.json",
);
const sources = evidenceFiles.flatMap((fileName) =>
  parseSources(path.join(projectRoot, fileName), fileName),
);
const sourceById = new Map(
  sources.map((source) => [source.sourceId, source]),
);
const usageBySource = new Map(
  sources.map((source) => [
    source.sourceId,
    {
      canonicalVariantCount: 0,
      highRiskVariantCount: 0,
      coSources: new Set(),
    },
  ]),
);
for (const entry of evidenceTrace.entries) {
  for (const sourceId of entry.registeredSourceRefs) {
    const usage = usageBySource.get(sourceId);
    if (!usage) continue;
    usage.canonicalVariantCount += 1;
    usage.highRiskVariantCount += entry.highRisk ? 1 : 0;
    for (const coSourceId of entry.registeredSourceRefs) {
      if (coSourceId !== sourceId) usage.coSources.add(coSourceId);
    }
  }
}
const sourceRows = sources
  .map((source) => {
    const usage = usageBySource.get(source.sourceId);
    const explicitDependenceFields = {
      studyFamilyId: source.studyFamilyId ?? null,
      datasetIds: source.datasetIds ?? [],
      sampleIds: source.sampleIds ?? [],
      secondaryAnalysisOfSourceIds:
        source.secondaryAnalysisOfSourceIds ?? [],
      independenceReviewedBy: source.independenceReviewedBy ?? null,
      independenceReviewedAt: source.independenceReviewedAt ?? null,
    };
    return {
      sourceId: source.sourceId,
      title: source.title,
      authors: source.authors,
      year: source.year,
      doi: source.doi ?? null,
      sourceType: source.sourceType,
      screeningStatus: source.screeningStatus,
      directness: source.quality?.directness ?? null,
      replication: source.quality?.replication ?? null,
      populationSummary: source.populationSummary,
      sampleSize: source.sampleSize,
      sourceFile: source.sourceFile,
      usage: {
        canonicalVariantCount: usage.canonicalVariantCount,
        highRiskVariantCount: usage.highRiskVariantCount,
        coSourceCount: usage.coSources.size,
      },
      explicitDependenceFields,
      metadataComplete:
        Boolean(explicitDependenceFields.studyFamilyId) &&
        explicitDependenceFields.datasetIds.length > 0 &&
        explicitDependenceFields.sampleIds.length > 0 &&
        Boolean(explicitDependenceFields.independenceReviewedBy) &&
        Boolean(explicitDependenceFields.independenceReviewedAt),
      substantiveEligibilityState:
        source.screeningStatus === "included" &&
        source.quality?.directness !== "method_only"
          ? "registered_substantive_source_scope_review_pending"
          : "not_counted_as_substantive_outcome_source",
    };
  })
  .sort(
    (left, right) =>
      right.usage.highRiskVariantCount -
        left.usage.highRiskVariantCount ||
      right.usage.canonicalVariantCount -
        left.usage.canonicalVariantCount ||
      left.sourceId.localeCompare(right.sourceId, "en"),
  );

const pairRegistry = new Map();
for (const entry of evidenceTrace.entries.filter(
  (candidate) => candidate.highRisk,
)) {
  for (let left = 0; left < entry.registeredSourceRefs.length; left += 1) {
    for (
      let right = left + 1;
      right < entry.registeredSourceRefs.length;
      right += 1
    ) {
      const pair = [
        entry.registeredSourceRefs[left],
        entry.registeredSourceRefs[right],
      ].sort();
      const pairId = pair.join("::");
      const record = pairRegistry.get(pairId) ?? {
        pairId,
        sourceIds: pair,
        highRiskVariantIds: [],
      };
      record.highRiskVariantIds.push(entry.canonicalVariantId);
      pairRegistry.set(pairId, record);
    }
  }
}
const pairRows = [...pairRegistry.values()]
  .map((pair) => {
    const left = sourceById.get(pair.sourceIds[0]);
    const right = sourceById.get(pair.sourceIds[1]);
    const sharedAuthors = (left?.authors ?? []).filter((author) =>
      (right?.authors ?? []).includes(author),
    );
    const bothSubstantive = [left, right].every(
      (source) =>
        source?.screeningStatus === "included" &&
        source?.quality?.directness !== "method_only",
    );
    return {
      ...pair,
      highRiskVariantCount: pair.highRiskVariantIds.length,
      sameDoi:
        Boolean(left?.doi) &&
        Boolean(right?.doi) &&
        left.doi === right.doi,
      sharedAuthors,
      exactAuthorTeam:
        JSON.stringify([...(left?.authors ?? [])].sort()) ===
        JSON.stringify([...(right?.authors ?? [])].sort()),
      bothSubstantive,
      independenceState:
        "unresolved_missing_dataset_sample_and_study_family_registry",
    };
  })
  .sort(
    (left, right) =>
      right.highRiskVariantCount - left.highRiskVariantCount ||
      left.pairId.localeCompare(right.pairId, "en"),
  );

const highRiskEntryRows = evidenceTrace.entries
  .filter((entry) => entry.highRisk)
  .map((entry) => {
    const substantiveSources = entry.registeredSourceRefs.filter(
      (sourceId) => {
        const source = sourceById.get(sourceId);
        return (
          source?.screeningStatus === "included" &&
          source?.quality?.directness !== "method_only"
        );
      },
    );
    return {
      canonicalVariantId: entry.canonicalVariantId,
      registeredSourceCount: entry.registeredSourceRefs.length,
      substantiveRegisteredSourceCount: substantiveSources.length,
      hasTwoSubstantiveRegisteredSources:
        substantiveSources.length >= 2,
      independentlyConfirmedSourceCount: 0,
      independenceState:
        "unresolved_pending_bibliographic_dependence_review",
    };
  });
const registryTemplate = {
  contractVersion:
    "nuang-trait-map-evidence-dependence-registry.v2.3",
  status: "EMPTY_DEPENDENCE_FIELDS_AWAITING_REVIEW",
  generatedAt: "2026-07-24T00:00:00.000Z",
  instructions: [
    "한 논문 안의 여러 표본은 sampleIds를 분리한다.",
    "같은 공개 데이터·코호트·재분석은 같은 datasetId·studyFamilyId로 묶는다.",
    "저자 겹침만으로 의존 또는 독립을 확정하지 않는다.",
    "DOI·초록만으로 부족하면 본문·부록·등록정보·데이터 설명을 확인한다.",
    "검토자와 검토 시각, 판단 근거를 반드시 남긴다.",
  ],
  sources: sourceRows.map((source) => ({
    sourceId: source.sourceId,
    doi: source.doi,
    authors: source.authors,
    populationSummary: source.populationSummary,
    sampleSize: source.sampleSize,
    studyFamilyId: null,
    datasetIds: [],
    sampleIds: [],
    secondaryAnalysisOfSourceIds: [],
    independenceReviewedBy: null,
    independenceReviewedAt: null,
    dependenceNotes: null,
  })),
};
const report = {
  contractVersion: "nuang-trait-map-evidence-dependence-audit.v2.3",
  reportId: "TRAIT-MAP-EVIDENCE-DEPENDENCE-AUDIT.2.3",
  status: "DEPENDENCE_METADATA_INCOMPLETE_INDEPENDENCE_NOT_CONFIRMED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceEvidenceTraceReportId: evidenceTrace.reportId,
  summary: {
    registeredSources: sourceRows.length,
    includedSources: sourceRows.filter(
      (source) => source.screeningStatus === "included",
    ).length,
    sourcesWithCompleteDependenceMetadata: sourceRows.filter(
      (source) => source.metadataComplete,
    ).length,
    uniqueHighRiskSourcePairs: pairRows.length,
    pairsWithSharedAuthors: pairRows.filter(
      (pair) => pair.sharedAuthors.length > 0,
    ).length,
    pairsWithExactAuthorTeam: pairRows.filter(
      (pair) => pair.exactAuthorTeam,
    ).length,
    pairsWithSameDoi: pairRows.filter((pair) => pair.sameDoi).length,
    independentlyConfirmedPairs: pairRows.filter(
      (pair) => pair.independenceState === "confirmed_independent",
    ).length,
    highRiskVariants: highRiskEntryRows.length,
    highRiskVariantsWithTwoSubstantiveRegisteredSources:
      highRiskEntryRows.filter(
        (entry) => entry.hasTwoSubstantiveRegisteredSources,
      ).length,
    highRiskVariantsWithIndependentSourcesConfirmed: 0,
    structuralSourceIdRuleStillPassed:
      evidenceTrace.summary.structuralFailures === 0,
  },
  interpretationRules: [
    "sourceId가 다르다는 사실은 서지 중복 방지일 뿐 표본·데이터 독립성 증거가 아니다.",
    "저자 겹침은 확인 우선순위 신호일 뿐 의존성 확정 기준이 아니다.",
    "같은 DOI·표본·데이터셋·코호트·secondary analysis 관계를 우선 확인한다.",
    "공식 표준·방법론 문서는 검사 개발 원칙의 근거이지 관계·업무 결과를 뒷받침하는 독립 결과 연구로 세지 않는다.",
    "독립성이 확인되지 않은 두 출처는 발행 게이트에서 '2개 독립 연구'로 표현하지 않는다.",
  ],
  sourceRows,
  highRiskPairRows: pairRows,
  highRiskEntryRows,
  substantiveGapQueue: highRiskEntryRows
    .filter((entry) => !entry.hasTwoSubstantiveRegisteredSources)
    .map((entry, index) => {
      const traceEntry = evidenceTrace.entries.find(
        (candidate) =>
          candidate.canonicalVariantId === entry.canonicalVariantId,
      );
      const substantiveSourceIds =
        traceEntry.registeredSourceRefs.filter((sourceId) => {
          const source = sourceById.get(sourceId);
          return (
            source?.screeningStatus === "included" &&
            source?.quality?.directness !== "method_only"
          );
        });
      const nonSubstantiveSourceIds =
        traceEntry.registeredSourceRefs.filter(
          (sourceId) => !substantiveSourceIds.includes(sourceId),
        );
      return {
        priority: index + 1,
        canonicalVariantId: entry.canonicalVariantId,
        riskDomains: traceEntry.riskDomains,
        registeredSourceIds: traceEntry.registeredSourceRefs,
        substantiveSourceIds,
        nonSubstantiveSourceIds,
        requiredAction:
          substantiveSourceIds.length === 0
            ? "HOLD_OR_REPLACE_WITH_SUBSTANTIVE_EVIDENCE"
            : "ADD_INDEPENDENT_SUBSTANTIVE_SOURCE_OR_NARROW_CLAIM",
        publicationState: "blocked",
      };
    }),
  remediationQueue: sourceRows
    .filter(
      (source) =>
        !source.metadataComplete &&
        source.usage.highRiskVariantCount > 0,
    )
    .map((source, index) => ({
      priority: index + 1,
      sourceId: source.sourceId,
      highRiskVariantCount: source.usage.highRiskVariantCount,
      canonicalVariantCount: source.usage.canonicalVariantCount,
      requiredFields: [
        "studyFamilyId",
        "datasetIds",
        "sampleIds",
        "secondaryAnalysisOfSourceIds",
        "independenceReviewedBy",
        "independenceReviewedAt",
        "dependenceNotes",
      ],
    })),
  generatedAssets: [
    "review/TRAIT_MAP_EVIDENCE_DEPENDENCE_REGISTRY_TEMPLATE_V2_3.json",
  ],
  nextGate: {
    name: "SOURCE_DEPENDENCE_BIBLIOGRAPHIC_REVIEW",
    actions: [
      "고위험 문장 사용량이 많은 출처부터 원문·부록·등록정보를 확인한다.",
      "공유 dataset·sample·cohort를 같은 studyFamilyId로 묶는다.",
      "각 high-risk 문장의 출처 중 실질적으로 독립된 결과 연구가 둘 이상인지 다시 집계한다.",
      "부족하면 문장을 더 좁히거나 추가 독립 근거를 찾거나 hold한다.",
    ],
  },
};

if (
  report.summary.registeredSources !== 41 ||
  report.summary.highRiskVariants !== 460 ||
  report.summary.sourcesWithCompleteDependenceMetadata !== 0 ||
  report.summary.highRiskVariantsWithIndependentSourcesConfirmed !== 0 ||
  report.substantiveGapQueue.length !== 31 ||
  !report.summary.structuralSourceIdRuleStillPassed
) {
  throw new Error("Evidence dependence audit invariants failed.");
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const templateOutput = await prettier.format(
  JSON.stringify(registryTemplate),
  { parser: "json" },
);
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});
if (checkOnly) {
  const expected = [
    [outputPath, output],
    [templatePath, templateOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 evidence dependence audit is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(templatePath, templateOutput);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Evidence dependence audit v2.3: ${sourceRows.length} sources, ${pairRows.length} high-risk pairs, complete metadata ${report.summary.sourcesWithCompleteDependenceMetadata}, independently confirmed high-risk variants 0/${highRiskEntryRows.length}.`,
);

function parseSources(filePath, sourceFile) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFileNode = ts.createSourceFile(
    sourceFile,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const sources = [];
  sourceFileNode.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (
        !ts.isIdentifier(declaration.name) ||
        !declaration.name.text.endsWith("EvidenceSourcesV2") ||
        !declaration.initializer
      ) {
        continue;
      }
      const initializer = unwrapExpression(declaration.initializer);
      if (!ts.isArrayLiteralExpression(initializer)) continue;
      for (const element of initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) continue;
        sources.push({
          ...literalObject(element),
          sourceFile,
        });
      }
    }
  });
  return sources;
}

function unwrapExpression(expression) {
  if (
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isParenthesizedExpression(expression)
  ) {
    return unwrapExpression(expression.expression);
  }
  return expression;
}

function literalObject(node) {
  const object = {};
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = property.name.getText().replaceAll(/^["']|["']$/g, "");
    object[key] = literalValue(property.initializer);
  }
  return object;
}

function literalValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node))
    return node.elements.map((element) => literalValue(element));
  if (ts.isObjectLiteralExpression(node)) return literalObject(node);
  return null;
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# v2.3 근거 출처 의존성 감사

- 등록 출처: ${result.summary.registeredSources}
- 고위험 출처 조합: ${result.summary.uniqueHighRiskSourcePairs}
- 의존성 메타데이터 완성 출처: ${result.summary.sourcesWithCompleteDependenceMetadata}
- 독립 확인 조합: ${result.summary.independentlyConfirmedPairs}
- 고위험 문장 독립 출처 확인: ${result.summary.highRiskVariantsWithIndependentSourcesConfirmed}/${result.summary.highRiskVariants}

기존 605개 문장의 source ID·finding 계보는 구조적으로 통과했다. 그러나
현재 출처 객체에는 \`studyFamilyId\`, dataset·sample ID, secondary
analysis 관계, 독립성 검토자와 검토 시각이 없다. 따라서 서로 다른
source ID 두 개를 곧바로 “독립 연구 두 개”로 세지 않는다.

저자가 겹치는 조합은 ${result.summary.pairsWithSharedAuthors}개지만,
저자 겹침만으로 자료 의존성을 확정하지 않는다. DOI, 실제 표본,
공유 데이터셋·코호트, 재분석 관계를 원문과 부록에서 확인해야 한다.

작성용 원장:
\`review/TRAIT_MAP_EVIDENCE_DEPENDENCE_REGISTRY_TEMPLATE_V2_3.json\`

고위험 문장 사용량이 많은 출처부터 채우고, 독립 근거가 부족한 문장은
범위를 좁히거나 추가 근거를 찾거나 hold한다. 방법론 문서를 결과
연구로 제외했을 때 2개 결과 근거가 부족한 고위험 문장은
${result.substantiveGapQueue.length}개이며, JSON의
\`substantiveGapQueue\`에 정확한 canonical ID와 조치가 기록돼 있다.
`;
}
