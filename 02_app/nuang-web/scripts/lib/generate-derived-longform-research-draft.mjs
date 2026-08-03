import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import prettier from "prettier";
import ts from "typescript";

const contextByChapter = {
  daily_choice_and_change: "general",
  family: "family",
  friend: "friend",
  partner: "partner",
  person_of_interest: "person_of_interest",
  work_and_study: "work",
};
const contextLabels = {
  general: "혼자 또는 일상에서",
  family: "가족과 있을 때",
  friend: "친구와 있을 때",
  partner: "연인과 있을 때",
  person_of_interest: "마음에 드는 사람을 알아갈 때",
  work: "일하거나 공부할 때",
};
const momentLabels = {
  ordinary_choice: "평소 선택을 할 때",
  new_encounter: "새로운 사람이나 일을 마주할 때",
  group_participation: "여러 사람과 함께 움직일 때",
  plan_change: "계획이 갑자기 바뀔 때",
  uncertainty: "앞일이 분명하지 않을 때",
  disagreement: "의견이 다르거나 갈등이 생길 때",
  support_requested: "상대가 힘든 일을 이야기할 때",
  need_expression: "내가 원하는 것을 말해야 할 때",
  boundary: "부탁을 거절하거나 선을 정해야 할 때",
  success: "좋은 결과나 기쁜 일이 생겼을 때",
  setback: "실수하거나 기대한 결과가 나오지 않을 때",
  aftermath: "부담스러운 일이 지나간 뒤",
};
const taskLabels = {
  ordinary_choice: "하나를 선택하고 시작하기",
  new_encounter: "처음 접촉하고 참여하기",
  group_participation: "여럿 속에서 참여하고 역할 찾기",
  plan_change: "바뀐 조건에서 계획을 다시 잇기",
  uncertainty: "가능성을 살피고 판단하기",
  disagreement: "관계를 확인하고 해결하기",
  support_requested: "상대가 원하는 방식으로 돕기",
  need_expression: "자신의 필요를 관계 안에서 말하기",
  boundary: "관계를 지키며 선을 정하기",
  success: "기쁨을 함께 나누고 이어가기",
  setback: "영향을 확인하고 다시 계획하기",
  aftermath: "회복하고 다시 연결하기",
};
const observationLabels = {
  attention: "무엇을 먼저 보는가",
  first_thought: "처음 드는 생각",
  actual_response: "실제 나타나는 반응",
  communication: "말로 표현하는 방식",
};
const canonicalProfileRebaseFile =
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json";
const canonicalContentLedgerFile =
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json";
const evidenceTraceAuditFile = "TRAIT_MAP_EVIDENCE_TRACE_AUDIT_V2_3.json";

export async function generateDerivedLongformResearchDraft(config) {
  const {
    projectRoot,
    code,
    roleName,
    baseAnchor,
    editorialFile,
    editorialExport,
    foundationFile,
    foundationExport,
    scenarioFile,
    copyAuditFile,
    neighborFile,
    outputDirectory,
    command,
    checkOnly,
  } = config;
  const generatedDirectory = path.join(
    projectRoot,
    "docs/research/trait-map-data-center-v2/generated",
  );
  const editorialSource = loadData(projectRoot, editorialFile)[editorialExport];
  const foundationClaims = loadData(projectRoot, foundationFile)[
    foundationExport
  ];
  const scenarioPacket = readGenerated(generatedDirectory, scenarioFile);
  const copyAudit = readGenerated(generatedDirectory, copyAuditFile);
  const neighborPacket = neighborFile.includes("/")
    ? JSON.parse(fs.readFileSync(path.join(projectRoot, neighborFile), "utf8"))
    : readGenerated(generatedDirectory, neighborFile);
  const neighborClaims = neighborPacket.claims.map(
    (entry) => entry.claim ?? entry,
  );
  const canonicalProfileRebase = readGenerated(
    generatedDirectory,
    canonicalProfileRebaseFile,
  );
  const canonicalContentLedger = readGenerated(
    generatedDirectory,
    canonicalContentLedgerFile,
  );
  const evidenceTraceAudit = readGenerated(
    generatedDirectory,
    evidenceTraceAuditFile,
  );
  const coverage = readGenerated(
    generatedDirectory,
    "ENAKQ_SCENARIO_RESEARCH_COVERAGE_V2.json",
  );
  const evidenceRegistry = loadEvidenceRegistry(projectRoot);
  const canonicalProfile = canonicalProfileRebase.profiles.find(
    (profile) => profile.code === code,
  );
  if (!canonicalProfile) {
    throw new Error(`${code} canonical v2.3 profile rebase is missing.`);
  }
  const canonicalContentById = new Map(
    canonicalContentLedger.entries.map((entry) => [
      entry.canonicalVariantId,
      entry,
    ]),
  );
  const evidenceTraceById = new Map(
    evidenceTraceAudit.entries.map((entry) => [
      entry.canonicalVariantId,
      entry,
    ]),
  );
  const canonicalScenarioClaims = canonicalProfile.claimRefs.map((claimRef) => {
    const contentEntry = canonicalContentById.get(claimRef.canonicalVariantId);
    const evidenceEntry = evidenceTraceById.get(claimRef.canonicalVariantId);
    if (!contentEntry) {
      throw new Error(
        `${code} canonical content is missing for ${claimRef.canonicalVariantId}.`,
      );
    }
    if (!evidenceEntry) {
      throw new Error(
        `${code} evidence trace is missing for ${claimRef.canonicalVariantId}.`,
      );
    }
    if (
      contentEntry.scenarioRef !== claimRef.scenarioRef ||
      contentEntry.claimKey !== claimRef.claimKey ||
      contentEntry.claimKind !== claimRef.claimKind
    ) {
      throw new Error(
        `${code} canonical ref and content metadata disagree for ${claimRef.canonicalVariantId}.`,
      );
    }
    if (evidenceEntry.publicationState !== "research_only") {
      throw new Error(
        `${code} canonical claim ${claimRef.canonicalVariantId} is not research-only.`,
      );
    }
    return {
      claimId: claimRef.canonicalVariantId,
      claimKey: claimRef.claimKey,
      claimKind: claimRef.claimKind,
      scenarioRefs: [claimRef.scenarioRef],
      assertion: contentEntry.content.summaryText,
      detailParagraphs: contentEntry.content.detailParagraphs,
      independentSourceRefs: evidenceEntry.registeredSourceRefs,
      evidenceFindingRefs: evidenceEntry.evidenceFindingRefs,
      publicationState: evidenceEntry.publicationState,
    };
  });
  assertCanonicalProfileClaims(code, canonicalScenarioClaims);
  const editorial = enrichEditorialWithCanonicalScenes({
    editorial: editorialSource,
    code,
    roleName,
    canonicalProfile,
    canonicalScenarioClaims,
    coverage,
  });
  const claimsByScenario = Object.groupBy(
    canonicalScenarioClaims,
    (claim) => claim.scenarioRefs[0],
  );
  const validationByScenario = new Map(
    (scenarioPacket.validationQueue ?? []).map((item) => [
      item.scenarioId,
      item,
    ]),
  );
  const selectedEvidenceSourceIds = new Set(
    canonicalScenarioClaims.flatMap((claim) => claim.independentSourceRefs),
  );
  for (const claim of foundationClaims) {
    for (const sourceId of claim.independentSourceRefs) {
      selectedEvidenceSourceIds.add(sourceId);
    }
  }
  for (const claim of neighborClaims) {
    for (const sourceId of claim.independentSourceRefs) {
      selectedEvidenceSourceIds.add(sourceId);
    }
  }
  for (const sourceId of [
    "SRC-TEST-STANDARDS-2014",
    "SRC-ITC-2017",
    "SRC-CONTENT-VALIDITY-2018",
    "SRC-PERSONAL-VALIDATION-1949",
    "SRC-KOREA-SITUATION-2024",
    "SRC-BFAS-2007",
    "SRC-EXTRAVERSION-PA-2015",
    "SRC-STATE-MEASUREMENT-2020",
  ]) {
    selectedEvidenceSourceIds.add(sourceId);
  }

  const chapters = editorial.map((chapter, chapterIndex) => {
    const lines = [
      `## ${chapterIndex + 1}. ${chapter.title}`,
      "",
      ...chapter.body.flatMap((paragraph) => [paragraph, ""]),
    ];
    const context = contextByChapter[chapter.chapterId];
    const claimRefs = [];

    if (context) {
      const scenes = coverage.rows.filter(
        (row) => row.relationshipContext === context,
      );
      for (const [sceneIndex, scene] of scenes.entries()) {
        const claims = claimsByScenario[scene.scenarioId] ?? [];
        const validation = validationByScenario.get(scene.scenarioId);
        const evidenceIds = new Set(
          claims.flatMap((claim) => claim.independentSourceRefs),
        );
        lines.push(
          `### ${sceneIndex + 1}. ${momentLabels[scene.moment]}`,
          "",
          `- 누구와·어디서: ${contextLabels[context]}`,
          `- 무엇을 하는 장면인가: ${taskLabels[scene.moment]}`,
          `- 장면 ID: \`${scene.scenarioId}\``,
          "",
        );
        for (const claim of claims) {
          lines.push(
            `- ${observationLabels[claim.claimKind]}: ${claim.assertion}`,
          );
          for (const paragraph of claim.detailParagraphs.slice(1)) {
            lines.push(`  - 더 살펴보기: ${paragraph}`);
          }
          claimRefs.push(claim.claimId);
        }
        lines.push(
          ...(validation?.validationFocus?.length
            ? [
              `- 이 설명을 확인할 때 볼 점: ${validation.validationFocus.join(" / ")}`,
            ]
            : []),
          `- 연결 근거: ${[...evidenceIds].map((id) => `\`${id}\``).join(", ")}`,
          "",
        );
      }
    }

    if (chapter.chapterId === "five_code_positions") {
      lines.push("### 다섯 방향의 기초 claim", "");
      for (const claim of foundationClaims) {
        lines.push(`- ${claim.assertion} (\`${claim.claimId}\`)`);
        claimRefs.push(claim.claimId);
      }
      lines.push("");
    }

    if (chapter.chapterId === "neighbor_contrasts") {
      lines.push("### 한 글자 이웃 5개와 구조화한 비교 claim", "");
      for (const claim of neighborClaims) {
        lines.push(`- ${claim.assertion} (\`${claim.claimId}\`)`);
        claimRefs.push(claim.claimId);
      }
      lines.push("");
    }

    if (chapter.chapterId === "evidence_and_method") {
      lines.push("### 연결된 근거 원장", "");
      const sources = evidenceRegistry.sources
        .filter(
          (source) =>
            source.screeningStatus === "included" &&
            selectedEvidenceSourceIds.has(source.sourceId),
        )
        .sort((left, right) =>
          left.sourceId.localeCompare(right.sourceId, "en"),
        );
      for (const source of sources) {
        const findings = evidenceRegistry.findings.filter(
          (finding) => finding.sourceId === source.sourceId,
        );
        lines.push(
          `#### ${source.sourceId} · ${source.title}`,
          "",
          `- 연도·유형: ${source.year} · ${source.sourceType}`,
          `- 연구 대상·범위: ${source.populationSummary}`,
          `- 품질 메모: 직접성 ${source.quality.directness}, 편향 위험 ${source.quality.riskOfBias}, 문화 적합성 ${source.quality.culturalFit}, 반복 확인 ${source.quality.replication}`,
        );
        for (const finding of findings) {
          lines.push(
            `- 확인된 결과: ${finding.resultSummary}`,
            `- 적용 범위: ${finding.limitations.join(" / ")}`,
          );
        }
        lines.push(
          `- 원문: ${source.doi ? `https://doi.org/${source.doi}` : source.url}`,
          "",
        );
      }
    }

    const body = lines.join("\n").trimEnd();
    return {
      chapterId: chapter.chapterId,
      title: chapter.title,
      body,
      nonWhitespaceCharacters: countNonWhitespace(body),
      sourceFiles: [
        editorialFile,
        `docs/research/trait-map-data-center-v2/generated/${canonicalProfileRebaseFile}`,
        `docs/research/trait-map-data-center-v2/generated/${canonicalContentLedgerFile}`,
        `docs/research/trait-map-data-center-v2/generated/${evidenceTraceAuditFile}`,
        `docs/research/trait-map-data-center-v2/generated/${scenarioFile}`,
        ...(chapter.chapterId === "five_code_positions"
          ? [foundationFile]
          : []),
        ...(chapter.chapterId === "neighbor_contrasts"
          ? [generatedSourceReference(neighborFile)]
          : []),
      ],
      claimRefs,
    };
  });
  const markdown = [
    `# ${code} 성향지도 데이터센터 v2 · 연구 원문`,
    "",
    `> 상태: 연구 초안. 72개 상황과 ${baseAnchor}에서 달라진 축의 문장은 구성됐지만 인지 인터뷰, 정량 파일럿, 이웃 코드 비교와 전문 검토 전에는 고객에게 공개하지 않습니다.`,
    "",
    `> 역할 이름: ${roleName}`,
    "",
    ...chapters.flatMap((chapter) => [chapter.body, ""]),
  ].join("\n");
  const formattedMarkdown = await prettier.format(markdown, {
    parser: "markdown",
    proseWrap: "preserve",
  });
  const totalNonWhitespaceCharacters = chapters.reduce(
    (sum, chapter) => sum + chapter.nonWhitespaceCharacters,
    0,
  );
  const claimRefs = [
    ...new Set([
      ...foundationClaims.map((claim) => claim.claimId),
      ...canonicalScenarioClaims.map((claim) => claim.claimId),
      ...neighborClaims.map((claim) => claim.claimId),
    ]),
  ].sort();
  const manifest = {
    contractVersion: "nuang-trait-map-data-center.v2",
    packageId: `${code}.map.v2-research-draft`,
    code,
    profileName: roleName,
    releaseVersion: "0.1-research",
    status: "research_draft",
    chapters: chapters.map((chapter) => ({
      chapterId: chapter.chapterId,
      claimRefs: chapter.claimRefs,
      nonWhitespaceCharacters: chapter.nonWhitespaceCharacters,
      sourceFiles: chapter.sourceFiles,
      title: chapter.title,
    })),
    totalNonWhitespaceCharacters,
    claimRefs,
    evidenceSourceRefs: [...selectedEvidenceSourceIds].sort(),
    scenarioRefs: coverage.rows.map((row) => row.scenarioId),
    neighborContrastCodes: neighborPacket.neighborCodes,
    reviews: {
      contradictionAudit: "not_started",
      deduplication: "not_started",
      evidenceAudit: "not_started",
      measurement: "not_started",
      plainLanguage: "not_started",
      productSafety: "not_started",
      psychology: "not_started",
      scenarioCoverage: "passed",
    },
    researchMetrics: {
      canonicalScenarioCoverage: "72/72",
      canonicalScenarioClaims: canonicalScenarioClaims.length,
      canonicalReleaseVersion: "v2.3",
      structuredClaims: claimRefs.length,
      includedEvidenceSources: selectedEvidenceSourceIds.size,
      inheritedScenarioClaims: scenarioPacket.summary.inheritedClaimCount ?? 0,
      axisOverrideScenarioClaims:
        scenarioPacket.summary.axisOverrideClaimCount ?? 0,
      authoredScenarioClaims: scenarioPacket.summary.newClaimCount ?? 0,
      automaticCopyAudit: `${copyAudit.automaticPasses}/${copyAudit.auditedClaims}`,
      structuredNeighborContrasts: `${neighborClaims.length}/20`,
      customerApprovedClaims: 0,
    },
    publicationBlockers: [
      "인지 인터뷰 완료",
      `${baseAnchor}와의 변경 축 blind 비교`,
      "한 글자 이웃 5개와의 양방향 대칭성·가치 편향 검토",
      "정량 파일럿과 구분력·재현성 확인",
      "7개 필수 전문 검토 완료",
      "중복·모순·근거 감사 완료",
    ],
  };
  const formattedManifest = await prettier.format(JSON.stringify(manifest), {
    parser: "json",
  });
  const targetDirectory = path.join(projectRoot, outputDirectory);
  const markdownPath = path.join(
    targetDirectory,
    `${code}_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
  );
  const manifestPath = path.join(
    generatedDirectory,
    `${code}_LONGFORM_RESEARCH_MANIFEST_V2.json`,
  );
  await writeOrCheck(
    markdownPath,
    formattedMarkdown,
    `${code} longform research draft`,
    command,
    checkOnly,
  );
  await writeOrCheck(
    manifestPath,
    formattedManifest,
    `${code} longform manifest`,
    command,
    checkOnly,
  );
  console.log(
    `${code} longform research draft is current: ${totalNonWhitespaceCharacters} non-whitespace characters, ${chapters.length} chapters, ${claimRefs.length} claims, ${selectedEvidenceSourceIds.size} evidence sources.`,
  );
}

function generatedSourceReference(fileName) {
  return fileName.includes("/")
    ? fileName
    : `docs/research/trait-map-data-center-v2/generated/${fileName}`;
}

function assertCanonicalProfileClaims(code, claims) {
  if (claims.length !== 288) {
    throw new Error(
      `${code} canonical profile must contain 288 claims; received ${claims.length}.`,
    );
  }
  const claimIds = new Set(claims.map((claim) => claim.claimId));
  const claimKeys = new Set(claims.map((claim) => claim.claimKey));
  const scenarioRefs = new Set(claims.flatMap((claim) => claim.scenarioRefs));
  if (
    claimIds.size !== 288 ||
    claimKeys.size !== 288 ||
    scenarioRefs.size !== 72
  ) {
    throw new Error(
      `${code} canonical profile shape is invalid: ${claimIds.size} IDs, ${claimKeys.size} keys, ${scenarioRefs.size} scenarios.`,
    );
  }
}

function enrichEditorialWithCanonicalScenes({
  editorial,
  code,
  roleName,
  canonicalProfile,
  canonicalScenarioClaims,
  coverage,
}) {
  const scenarioByMoment = new Map(
    coverage.rows.map((row) => [
      `${row.relationshipContext}:${row.moment}`,
      row.scenarioId,
    ]),
  );
  const claimByScenarioAndKind = new Map(
    canonicalScenarioClaims.map((claim) => [
      `${claim.scenarioRefs[0]}:${claim.claimKind}`,
      claim,
    ]),
  );
  const sceneText = (context, moment, claimKind) => {
    const scenarioRef = scenarioByMoment.get(`${context}:${moment}`);
    const claim = claimByScenarioAndKind.get(`${scenarioRef}:${claimKind}`);
    if (!scenarioRef || !claim) {
      throw new Error(
        `${code} cannot resolve ${context}/${moment}/${claimKind} for editorial enrichment.`,
      );
    }
    return claim.assertion;
  };
  const tokenLabels = canonicalProfile.codeTokenLabels.join(" · ");
  const supplements = {
    overview: [
      `${code}를 생활에서 알아보는 가장 쉬운 방법은 한 번의 인상보다 반응의 순서를 보는 것이다. 평소 선택에서는 ${sceneText("general", "ordinary_choice", "attention")} 실제 행동에서는 ${sceneText("general", "ordinary_choice", "actual_response")} 이 두 문장을 함께 보면 무엇을 중요하게 보았는지와 밖으로 나타난 행동을 구분할 수 있다.`,
    ],
    role_name_and_values: [
      `‘${roleName}’이라는 이름은 ${tokenLabels}의 결합을 짧게 기억하도록 만든 역할명이다. 좋은 사람·나쁜 사람, 능력이 높은 사람·낮은 사람을 가르는 이름이 아니라, 여러 생활 장면에서 무엇을 먼저 보고 어떻게 행동을 이어가는지 설명하는 표지다.`,
      `이 역할명이 실제로 드러나는 장면도 함께 봐야 한다. 좋은 결과가 생기면 ${sceneText("general", "success", "attention")} 이어서 ${sceneText("general", "success", "actual_response")} 중요하게 보는 가치가 주의와 행동으로 이어지는 이 순서가 역할 이름의 구체적인 근거다.`,
    ],
    five_code_positions: [
      `${code}는 ${tokenLabels} 순서로 읽는다. 앞의 두 자리는 에너지와 정보 탐색의 출발점, 셋째 자리는 관계에서 처음 살피는 곳, 넷째 자리는 실행을 이어가는 조건, 다섯째 자리는 걱정과 불편한 감정이 시작되는 속도를 보여 준다.`,
      `뉴앙 코드는 서로 떨어진 설명이 아니다. 의견이 다를 때 ${sceneText("general", "disagreement", "first_thought")} 실제로는 ${sceneText("general", "disagreement", "actual_response")}처럼 한 장면 안에서 여러 자리가 함께 작동한다. 그래서 한 글자의 뜻과 전체 조합의 흐름을 모두 확인해야 한다.`,
    ],
    code_interactions: [
      `평소 선택 장면을 네 단계로 나누면 상호작용이 선명해진다. 먼저 ${sceneText("general", "ordinary_choice", "attention")} 처음에는 ${sceneText("general", "ordinary_choice", "first_thought")} 실제로는 ${sceneText("general", "ordinary_choice", "actual_response")} 말할 때는 ${sceneText("general", "ordinary_choice", "communication")}`,
      `이 흐름에서 어느 한 글자만 행동을 결정하지 않는다. 주의와 처음 생각이 다음 선택지를 만들고, 관계와 책임, 시간과 자원을 고려한 조절을 거쳐 실제 반응과 말이 나온다. ${code}를 이해할 때는 네 단계를 한 덩어리로 단정하지 않고 순서대로 살펴본다.`,
    ],
    first_thought_and_actual_response: [
      `친구가 힘든 일을 이야기할 때 처음에는 ${sceneText("friend", "support_requested", "first_thought")} 그러나 실제로는 ${sceneText("friend", "support_requested", "actual_response")} 처음 든 생각과 실제 반응이 다를 수 있는 이유는 상대가 원하는 도움과 현재 가능한 범위를 행동 전에 다시 고려하기 때문이다.`,
      `겉으로 보인 행동만으로 속마음을 추측하면 이 조절 과정이 사라진다. 먼저 떠오른 생각, 실제로 한 행동, 그렇게 조절한 이유, 시간이 지난 뒤 남은 감정을 따로 기록하면 ${code}의 반복 경향을 더 정확하게 이해할 수 있다.`,
    ],
    conflict_stress_and_recovery: [
      `연인과 의견이 다를 때는 ${sceneText("partner", "disagreement", "attention")} 처음에는 ${sceneText("partner", "disagreement", "first_thought")} 실제로는 ${sceneText("partner", "disagreement", "actual_response")} 말할 때는 ${sceneText("partner", "disagreement", "communication")}`,
      `갈등이 끝난 뒤에는 해결 여부만 확인하지 않는다. 부담스러운 일이 지나가면 ${sceneText("general", "aftermath", "attention")} 이어서 ${sceneText("general", "aftermath", "actual_response")} 문제 해결과 감정·몸·관계의 회복이 서로 다른 시점에 끝날 수 있음을 함께 본다.`,
    ],
    strength_overuse_and_growth: [
      `강점은 좋은 결과가 났을 때만 보이는 능력이 아니다. 실수하거나 기대한 결과가 나오지 않았을 때 ${sceneText("general", "setback", "attention")} 실제로는 ${sceneText("general", "setback", "actual_response")}처럼 다시 움직이는 과정에서도 ${code}의 강점과 조절 방식이 드러난다.`,
      `같은 방향을 지나치게 쓰는지는 결과가 아니라 비용으로 확인한다. 같은 생각을 오래 반복하는지, 상대의 선택이 줄어드는지, 시작이나 마무리가 늦어지는지, 일이 끝난 뒤에도 긴장이 남는지를 살핀다. 성장 목표는 반대 코드가 되는 것이 아니라 원래 강점을 더 알맞은 크기로 사용하는 것이다.`,
    ],
    misunderstanding_and_communication: [
      `친구에게 내 필요를 말해야 할 때는 ${sceneText("friend", "need_expression", "communication")} 연인에게 선을 정해야 할 때는 ${sceneText("partner", "boundary", "communication")}처럼 같은 ${code}라도 관계와 과제에 따라 표현의 구체적인 내용이 달라진다.`,
      `오해를 줄이려면 코드 이름으로 자신을 설명하기보다 실제로 본 사실, 처음 든 생각, 상대에게 확인할 질문, 원하는 다음 행동을 짧게 나누어 말한다. 상대가 다르게 받아들였다면 의도만 반복하지 않고 어떤 말이 어떻게 들렸는지 확인한 뒤 표현과 행동을 함께 고친다.`,
    ],
  };
  return editorial.map((chapter) => ({
    ...chapter,
    body: [...chapter.body, ...(supplements[chapter.chapterId] ?? [])],
  }));
}

async function writeOrCheck(filePath, output, label, command, checkOnly) {
  if (checkOnly) {
    if (
      !fs.existsSync(filePath) ||
      fs.readFileSync(filePath, "utf8") !== output
    ) {
      console.error(`${label} is stale. Run ${command}.`);
      process.exit(1);
    }
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, output);
}

function readGenerated(generatedDirectory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function countNonWhitespace(source) {
  return source.replace(/\s/g, "").length;
}

function loadEvidenceRegistry(projectRoot) {
  const modules = [
    "trait-map-change-context-evidence-v2.ts",
    "trait-map-foundation-evidence-v2.ts",
    "trait-map-friendship-evidence-v2.ts",
    "trait-map-relationship-evidence-v2.ts",
    "trait-map-process-evidence-v2.ts",
    "trait-map-work-evidence-v2.ts",
  ].map((fileName) =>
    loadData(projectRoot, `src/features/nuang-code/${fileName}`),
  );
  return {
    sources: modules.flatMap((module) =>
      Object.entries(module)
        .filter(([key]) => key.endsWith("EvidenceSourcesV2"))
        .flatMap(([, value]) => value),
    ),
    findings: modules.flatMap((module) =>
      Object.entries(module)
        .filter(([key]) => key.endsWith("EvidenceFindingsV2"))
        .flatMap(([, value]) => value),
    ),
  };
}

function loadData(projectRoot, relativePath, moduleCache = new Map()) {
  const filePath = path.join(projectRoot, relativePath);
  if (moduleCache.has(filePath)) {
    return moduleCache.get(filePath);
  }
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: filePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  moduleCache.set(filePath, module.exports);
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require(specifier) {
      if (specifier.startsWith("@/features/nuang-code/")) {
        const importedPath = `${specifier.replace("@/", "src/")}.ts`;
        return loadData(projectRoot, importedPath, moduleCache);
      }
      throw new Error(
        `Derived longform data modules may only import local trait-map data; found ${specifier}.`,
      );
    },
  });
  moduleCache.set(filePath, module.exports);
  return module.exports;
}
