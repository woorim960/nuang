import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const researchDirectory = path.join(
  projectRoot,
  "docs/research/enakq-map-v0.1",
);
const traitMapDirectory = path.join(projectRoot, "docs/trait-maps/ENAKQ");
const registryPath = path.join(
  projectRoot,
  "src/features/nuang-code/fixtures/enakq-claim-registry.generated.json",
);
const outputPath = path.join(
  projectRoot,
  "src/features/nuang-code/fixtures/enakq-v2-migration.generated.json",
);
const checkOnly = process.argv.includes("--check");

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const excerptsByClaim = loadCanonicalExcerpts();
const sourceCandidates = loadSourceCandidates();
const reviewStates = {
  personality_psychology: "not_started",
  psychometrics: "not_started",
  relationship_psychology: "not_started",
  clinical_safety: "not_started",
  plain_korean: "not_started",
  product: "not_started",
  design: "not_started",
};

const claims = registry.entries.map((entry) => {
  const claimKind = mapClaimKind(entry.claimKind);
  const scenarioMapping = mapScenario(entry);
  const normalizedEvidence = mapNormalizedEvidence(entry);
  const requiredSignals = new Set([
    "representative_code",
    ...entry.requiredSignals,
  ]);
  if (scenarioMapping.scenarioRefs.length > 0) {
    requiredSignals.add("scenario_context");
  }
  if (entry.contexts.some((context) => context !== "general")) {
    requiredSignals.add("relationship_context");
  }
  if (claimKind === "first_thought" || claimKind === "actual_response") {
    requiredSignals.add("private_process_signals");
  }

  return {
    v2Claim: {
      claimId: entry.claimId,
      entity: { kind: "profile", ref: "ENAKQ" },
      scope: mapClaimScope(entry, scenarioMapping),
      claimKind,
      assertion:
        excerptsByClaim.get(entry.claimId) ??
        `기존 ${entry.claimId} claim의 canonical 원문을 다시 연결해야 해요.`,
      contexts: entry.contexts,
      scenarioRefs: scenarioMapping.scenarioRefs,
      requiredSignals: [...requiredSignals],
      evidenceFindingRefs: normalizedEvidence.findingRefs,
      independentSourceRefs: normalizedEvidence.sourceRefs,
      evidenceStatus: mapEvidenceStatus(entry.evidenceStatus),
      evidenceGrade: mapEvidenceGrade(entry.evidenceStatus),
      privacyScope:
        claimKind === "first_thought" || claimKind === "actual_response"
          ? "self_only"
          : entry.privacyScope,
      riskDomains: inferRiskDomains(entry),
      publicationState: "research_only",
      reviews: reviewStates,
    },
    migration: {
      sourceContract: entry.contentKey,
      sourceEvidenceStatus: entry.evidenceStatus,
      sourcePublicationState: entry.publicationState,
      sourceBlockRefs: entry.sourceBlockRefs,
      sourceParts: entry.sourceParts,
      externalEvidenceNotes: entry.externalEvidence,
      internalEvidenceNotes: entry.internalEvidence,
      scenarioMappingStatus: scenarioMapping.status,
      evidenceNormalizationStatus:
        normalizedEvidence.findingRefs.length > 0
          ? "partially_linked_needs_claim_level_review"
          : "needs_finding_links",
      copyStatus: "needs_plain_korean_rewrite_after_validation",
    },
  };
});

const packet = {
  contractVersion: "nuang-trait-map-data-center.v2",
  packetId: "ENAKQ-V2-MIGRATION-PACKET.0.1",
  code: "ENAKQ",
  sourceMapVersion: registry.mapVersion,
  status: "MIGRATION_CANDIDATE_NOT_FOR_PRODUCTION",
  claimCount: claims.length,
  sourceCandidateCount: sourceCandidates.length,
  claims,
  sourceCandidates,
  summary: {
    scenarioMappedClaims: claims.filter(
      (item) => item.v2Claim.scenarioRefs.length > 0,
    ).length,
    relationshipClaims: claims.filter((item) =>
      item.v2Claim.contexts.some((context) => context !== "general"),
    ).length,
    selfOnlyClaims: claims.filter(
      (item) => item.v2Claim.privacyScope === "self_only",
    ).length,
    highRiskClaims: claims.filter((item) =>
      item.v2Claim.riskDomains.some((risk) => risk !== "none"),
    ).length,
    claimsWithNormalizedFindings: claims.filter(
      (item) => item.v2Claim.evidenceFindingRefs.length > 0,
    ).length,
    claimsWithoutNormalizedFindings: claims.filter(
      (item) => item.v2Claim.evidenceFindingRefs.length === 0,
    ).length,
    approvedClaims: 0,
  },
};

const output = await prettier.format(JSON.stringify(packet), {
  parser: "json",
});

if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "ENAKQ v2 migration packet is stale. Run npm run research:trait-map:v2:migrate-enakq.",
    );
    process.exit(1);
  }
  console.log(
    `ENAKQ v2 migration packet is current: ${claims.length} claims and ${sourceCandidates.length} source candidates.`,
  );
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(
    `Generated ${path.relative(projectRoot, outputPath)} with ${claims.length} claims and ${sourceCandidates.length} source candidates.`,
  );
}

function loadCanonicalExcerpts() {
  const result = new Map();
  const reviewerDirectory = path.join(researchDirectory, "generated/reviewer");
  const files = fs
    .readdirSync(reviewerDirectory)
    .filter((fileName) => fileName.endsWith(".csv"))
    .sort();

  for (const fileName of files) {
    const rows = parseCsv(
      fs.readFileSync(path.join(reviewerDirectory, fileName), "utf8"),
    );
    const [header, ...dataRows] = rows;
    const claimIndex = header.indexOf("claim_id");
    const excerptIndex = header.indexOf("source_excerpt");
    for (const row of dataRows) {
      const claimId = row[claimIndex];
      const excerpt = row[excerptIndex];
      if (claimId && excerpt && !result.has(claimId)) {
        result.set(claimId, excerpt);
      }
    }
  }
  return result;
}

function loadSourceCandidates() {
  const sourceMap = new Map();
  for (let part = 1; part <= 5; part += 1) {
    const fileName = `ENAKQ_EVIDENCE_LEDGER_PART${part}_V0_1.md`;
    const source = fs.readFileSync(
      path.join(traitMapDirectory, fileName),
      "utf8",
    );
    const headings = [...source.matchAll(/^### `(SRC-[^`]+)`$/gm)];
    headings.forEach((heading, index) => {
      const sourceId = heading[1];
      const blockStart = heading.index + heading[0].length;
      const blockEnd = headings[index + 1]?.index ?? source.length;
      const block = source.slice(blockStart, blockEnd).trim();
      const existing = sourceMap.get(sourceId);
      sourceMap.set(sourceId, {
        sourceId,
        rawEvidenceBlocks: [
          ...(existing?.rawEvidenceBlocks ?? []),
          { sourceFile: fileName, sourcePart: part, rawText: block },
        ],
        normalizationStatus: "needs_manual_source_and_finding_extraction",
      });
    });
  }
  return [...sourceMap.values()].sort((left, right) =>
    left.sourceId.localeCompare(right.sourceId, "en"),
  );
}

function mapClaimKind(kind) {
  const mapping = {
    definition: "attention",
    inner_thought: "first_thought",
    observable_response: "actual_response",
    strength: "strength",
    friction: "overuse",
    possible_misread: "misunderstanding",
    support_preference: "conversation_guide",
    conversation_prompt: "conversation_guide",
    growth_practice: "conversation_guide",
    boundary: "evidence_statement",
    context_hypothesis: "actual_response",
    interaction_hypothesis: "actual_response",
    evidence_statement: "evidence_statement",
  };
  return mapping[kind] ?? "evidence_statement";
}

function mapClaimScope(entry, scenarioMapping) {
  if (scenarioMapping.scenarioRefs.length > 0) return "scenario";
  if (entry.claimKind === "definition") return "single_direction";
  if (entry.claimKind === "interaction_hypothesis") return "interaction";
  if (
    entry.claimKind === "boundary" ||
    entry.claimKind === "evidence_statement"
  ) {
    return "method_boundary";
  }
  return "whole_profile";
}

function mapEvidenceStatus(status) {
  if (status === "HOLD") return "hold";
  if (status === "APPROVED") return "validated";
  if (
    status === "EXTERNAL_SUPPORTED" ||
    status === "EXTERNAL_SUPPORTED_BOUNDARY" ||
    status === "EXTERNAL_SUPPORTED_METHOD"
  ) {
    return "external_supported";
  }
  if (
    status === "COGNITIVE_REVIEW_REQUIRED" ||
    status === "QUANT_VALIDATION_REQUIRED"
  ) {
    return "nuang_validation_required";
  }
  return "mapped_provisional";
}

function mapEvidenceGrade(status) {
  if (status === "APPROVED") return "A";
  if (
    status === "EXTERNAL_SUPPORTED" ||
    status === "EXTERNAL_SUPPORTED_BOUNDARY" ||
    status === "EXTERNAL_SUPPORTED_METHOD"
  ) {
    return "B";
  }
  if (
    status === "COGNITIVE_REVIEW_REQUIRED" ||
    status === "QUANT_VALIDATION_REQUIRED" ||
    status === "EVIDENCE_DOCUMENTED" ||
    status === "SAFETY_POLICY"
  ) {
    return "C";
  }
  return "D";
}

function mapNormalizedEvidence(entry) {
  const evidenceText = entry.externalEvidence.join(" | ");
  const mappings = [
    {
      patterns: [/\bBFI-?2\b/i, /\bBFI2\b/i],
      sourceId: "SRC-BFI2-2017",
      findingId: "FND-BFI2-HIERARCHICAL-FACETS",
    },
    {
      patterns: [/\bBFAS\b/i],
      sourceId: "SRC-BFAS-2007",
      findingId: "FND-BFAS-DOMAIN-ASPECT-DISTINCTION",
    },
    {
      patterns: [/\bIPC\b/i],
      sourceId: "SRC-IPC-2013",
      findingId: "FND-IPC-INTERPERSONAL-DISTINCTIONS",
    },
    {
      patterns: [/EXTRAVERSION-PA/i, /Smillie/i],
      sourceId: "SRC-EXTRAVERSION-PA-2015",
      findingId: "FND-EXTRAVERSION-NOT-SIMPLE-HAPPINESS",
    },
    {
      patterns: [/OPENNESS-INTELLECT/i, /DeYoung 2009/i],
      sourceId: "SRC-OPENNESS-INTELLECT-2009",
      findingId: "FND-OPENNESS-INTELLECT-DISTINCTION",
    },
    {
      patterns: [/STATE-2001/i, /STATE-DISTRIBUTION/i],
      sourceId: "SRC-STATE-DISTRIBUTION-2001",
      findingId: "FND-STATE-DISTRIBUTION-STABILITY-VARIABILITY",
    },
    {
      patterns: [/\bWTT\b/i, /Whole Trait/i],
      sourceId: "SRC-WHOLE-TRAIT-2015",
      findingId: "FND-WHOLE-TRAIT-DESCRIPTION-EXPLANATION",
    },
    {
      patterns: [/State Measurement/i, /STATE-MEASUREMENT/i],
      sourceId: "SRC-STATE-MEASUREMENT-2020",
      findingId: "FND-STATE-MEASUREMENT-DESIGN",
    },
    {
      patterns: [/DIAMONDS/i],
      sourceId: "SRC-DIAMONDS-2014",
      findingId: "FND-DIAMONDS-SITUATION-CHARACTERISTICS",
    },
    {
      patterns: [/KOREA-SITUATION/i],
      sourceId: "SRC-KOREA-SITUATION-2024",
      findingId: "FND-KOREA-SITUATION-CULTURAL-FIT",
    },
    {
      patterns: [/Gross/i, /Emotion Process/i, /EMOTION-PROCESS/i],
      sourceId: "SRC-EMOTION-PROCESS-1998",
      findingId: "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    },
    {
      patterns: [/\bDYAD\b/i, /DYAD-2010/i],
      sourceId: "SRC-DYAD-2010",
      findingId: "FND-DYAD-SIMILARITY-BOUNDARY",
    },
    {
      patterns: [/TEST-STANDARDS/i, /AERA/i],
      sourceId: "SRC-TEST-STANDARDS-2014",
      findingId: "FND-TEST-STANDARDS-VALIDITY-USE",
    },
    {
      patterns: [/\bITC\b/i, /TEST-ADAPTATION/i],
      sourceId: "SRC-ITC-2017",
      findingId: "FND-ITC-CULTURAL-ADAPTATION",
    },
    {
      patterns: [/CONTENT-VALIDITY/i, /COSMIN/i],
      sourceId: "SRC-CONTENT-VALIDITY-2018",
      findingId: "FND-COSMIN-CONTENT-VALIDITY",
    },
    {
      patterns: [
        /ROMANTIC-SIMILARITY-2023/i,
        /ROMANTIC-2023/i,
        /Weidmann/i,
      ],
      claimIds: ["ENAKQ.partner.comparison", "ENAKQ.partner.similarity"],
      sourceId: "SRC-ROMANTIC-SIMILARITY-2023",
      findingId: "FND-ROMANTIC-SIMILARITY-NOT-ROBUST",
    },
    {
      patterns: [/INITIAL-ATTRACTION-2023/i, /Humberg/i],
      sourceId: "SRC-INITIAL-ATTRACTION-2023",
      findingId: "FND-INITIAL-ATTRACTION-SIMILARITY-NULL",
    },
    {
      patterns: [/RELATIONAL-UNCERTAINTY(?:-2011)?/i, /Knobloch/i],
      claimIds: [
        "ENAKQ.crush.contact",
        "ENAKQ.crush.context",
        "ENAKQ.crush.uncertainty",
      ],
      sourceId: "SRC-RELATIONAL-UNCERTAINTY-2011",
      findingId: "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
    },
    {
      patterns: [/SUPPORT-MATCHING(?:-2007)?/i, /Cutrona/i],
      claimIds: ["ENAKQ.partner.support"],
      sourceId: "SRC-SUPPORT-MATCHING-2007",
      findingId: "FND-SUPPORT-MATCHING-CONTEXT",
    },
    {
      patterns: [/RESPONSIVENESS-2017/i, /Selçuk/i, /Selcuk/i],
      claimIds: ["ENAKQ.partner.support"],
      sourceId: "SRC-RESPONSIVENESS-2017",
      findingId: "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
    },
    {
      patterns: [/REACTIVITY-RECOVERY-2023/i, /Calheiros Velozo/i],
      sourceId: "SRC-REACTIVITY-RECOVERY-2023",
      findingId: "FND-STRESS-REACTIVITY-RECOVERY-DISTINCTION",
    },
    {
      patterns: [/SITUATION-CONTINGENCY-2007/i, /Fleeson 2007/i],
      sourceId: "SRC-SITUATION-CONTINGENCY-2007",
      findingId: "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    },
    {
      patterns: [/REALTIME-PERSON-SITUATION-2015/i, /Sherman/i],
      sourceId: "SRC-REALTIME-PERSON-SITUATION-2015",
      findingId: "FND-PERSON-SITUATION-INDEPENDENT-REALTIME",
    },
    {
      patterns: [/TRAIT-ENACTMENT-2015/i, /Fleeson.*Law/i],
      sourceId: "SRC-TRAIT-ENACTMENT-2015",
      findingId: "FND-TRAIT-ENACTMENT-STABILITY-AND-VARIABILITY",
    },
    {
      patterns: [/INTENTION-BEHAVIOR-2016/i, /Sheeran/i],
      sourceId: "SRC-INTENTION-BEHAVIOR-2016",
      findingId: "FND-INTENTION-BEHAVIOR-SEPARATION",
    },
    {
      patterns: [/\bSOKA\b/i, /SELF.?OTHER KNOWLEDGE/i],
      sourceId: "SRC-SOKA-2010",
      findingId: "FND-SELF-OTHER-KNOWLEDGE-ASYMMETRY",
    },
    {
      patterns: [/SELF-KNOWLEDGE-2010/i, /Vazire.*Carlson/i],
      sourceId: "SRC-SELF-KNOWLEDGE-2010",
      findingId: "FND-SELF-KNOWLEDGE-PARTIAL",
    },
    {
      patterns: [/PERSONAL-VALIDATION-1949/i, /\bForer\b/i],
      sourceId: "SRC-PERSONAL-VALIDATION-1949",
      findingId: "FND-PERSONAL-VALIDATION-COPY-RISK",
    },
    {
      patterns: [/FRIEND-(?:SIMILARITY-)?2026/i, /Yang.*2026/i],
      claimIds: ["ENAKQ.friend.similarity"],
      sourceId: "SRC-FRIEND-SIMILARITY-2026",
      findingId: "FND-FRIEND-GROUP-SIMILARITY-NOT-SATISFACTION",
    },
    {
      patterns: [/FRIEND-DYAD-2023/i, /Körner/i, /Korner/i],
      claimIds: ["ENAKQ.friend.similarity"],
      sourceId: "SRC-FRIEND-DYAD-2023",
      findingId: "FND-FRIEND-DYAD-SIMILARITY-NOT-SATISFACTION",
    },
    {
      patterns: [/FRIEND-DAILY(?:-2015)?/i, /Wilson.*Harris/i],
      claimIds: ["ENAKQ.friend.context", "ENAKQ.friend.reciprocity"],
      sourceId: "SRC-FRIEND-DAILY-2015",
      findingId: "FND-FRIEND-DAILY-INTERACTION-QUALITY",
    },
    {
      patterns: [/TRAIT-ACTIVATION-2003/i, /Tett.*Burnett/i],
      claimIds: ["ENAKQ.work.context"],
      sourceId: "SRC-TRAIT-ACTIVATION-2003",
      findingId: "FND-WORK-TRAIT-ACTIVATION-CONTEXT",
    },
    {
      patterns: [/PERSON-SITUATION-WORK-2015/i, /Judge.*Zapata/i],
      claimIds: ["ENAKQ.work.context"],
      sourceId: "SRC-PERSON-SITUATION-WORK-2015",
      findingId: "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
    },
    {
      patterns: [/JOB-META-1991/i, /Barrick.*Mount/i],
      claimIds: ["ENAKQ.work.performance_boundary"],
      sourceId: "SRC-JOB-META-1991",
      findingId: "FND-WORK-PERFORMANCE-CONSTRUCT-BOUNDARY",
    },
    {
      patterns: [/CURVILINEAR-PERFORMANCE-2011/i, /Le.*Oh.*Robbins/i],
      claimIds: ["ENAKQ.strength.conditional"],
      sourceId: "SRC-CURVILINEAR-PERFORMANCE-2011",
      findingId: "FND-WORK-PERFORMANCE-CURVILINEAR-BOUNDARY",
    },
    {
      patterns: [/CREATIVITY-DISTINCTION-2014/i, /Jauk.*Benedek/i],
      claimIds: ["ENAKQ.work.ideation"],
      sourceId: "SRC-CREATIVITY-DISTINCTION-2014",
      findingId: "FND-CREATIVITY-CONSTRUCTS-ARE-DISTINCT",
    },
    {
      patterns: [/DAILY-STRESS-STATES-2024/i, /Ringwald/i],
      claimIds: ["ENAKQ.stress.state_boundary"],
      sourceId: "SRC-DAILY-STRESS-STATES-2024",
      findingId: "FND-DAILY-STRESS-SHIFTS-TRAIT-STATES",
    },
    {
      patterns: [/STRESS-STATE-2026/i, /Grayson.*Harari/i],
      claimIds: ["ENAKQ.stress.state_boundary"],
      sourceId: "SRC-STRESS-STATE-2026",
      findingId: "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
    },
    {
      patterns: [/INTERVENTION-META-2017/i, /Roberts.*Luo/i],
      claimIds: ["ENAKQ.growth.nonpromise"],
      sourceId: "SRC-INTERVENTION-META-2017",
      findingId: "FND-PERSONALITY-CHANGE-INTERVENTION-BOUNDARY",
    },
    {
      patterns: [/DIGITAL-CHANGE-2021/i, /Stieger/i],
      claimIds: ["ENAKQ.growth.choice", "ENAKQ.growth.nonpromise"],
      sourceId: "SRC-DIGITAL-CHANGE-2021",
      findingId: "FND-DIGITAL-CHANGE-REQUIRES-INTENTIONAL-INTERVENTION",
    },
  ];

  const matches = mappings.filter(
    (mapping) =>
      mapping.patterns.some((pattern) => pattern.test(evidenceText)) ||
      mapping.claimIds?.includes(entry.claimId),
  );
  return {
    sourceRefs: [...new Set(matches.map((mapping) => mapping.sourceId))],
    findingRefs: [...new Set(matches.map((mapping) => mapping.findingId))],
  };
}

function inferRiskDomains(entry) {
  const claim = entry.claimId.toLowerCase();
  const risks = new Set();
  if (
    claim.includes(".partner.") ||
    claim.includes(".friend.") ||
    claim.includes(".family.") ||
    claim.includes(".comparison.")
  ) {
    risks.add("relationship_outcome");
  }
  if (claim.includes(".crush.")) {
    risks.add("attraction");
    risks.add("relationship_outcome");
  }
  if (
    claim.includes(".stress.") ||
    claim.includes(".worry") ||
    claim.includes(".recovery") ||
    claim.includes(".activation")
  ) {
    risks.add("mental_health");
  }
  if (
    claim.includes(".ability") ||
    claim.includes(".role.") ||
    claim.includes(".strength.")
  ) {
    risks.add("ability");
  }
  if (
    claim.includes(".work.") &&
    (claim.includes("performance") ||
      claim.includes("ideation") ||
      claim.includes("execution"))
  ) {
    risks.add("work_performance");
  }
  return risks.size > 0 ? [...risks] : ["none"];
}

function mapScenario(entry) {
  const relationshipContext = entry.contexts[0] ?? "general";
  const claim = entry.claimId.toLowerCase();
  const contextOrDaily =
    relationshipContext !== "general" ||
    claim.includes(".daily.") ||
    claim.includes(".stress.") ||
    claim.includes(".work.") ||
    claim.includes(".study.");

  if (!contextOrDaily) {
    return { scenarioRefs: [], status: "not_applicable" };
  }

  const rules = [
    { pattern: /change|schedule/, index: 4 },
    { pattern: /uncertainty|ambiguity|anticipat|worry/, index: 5 },
    { pattern: /conflict|friction|repair|disagreement|misread/, index: 6 },
    { pattern: /support|care|responsive|comfort/, index: 7 },
    { pattern: /expression|contact|conversation|request|need/, index: 8 },
    { pattern: /boundary|respect|reciprocity|consent/, index: 9 },
    { pattern: /success|celebr|positive/, index: 10 },
    { pattern: /setback|failure|stress|activation|overuse/, index: 11 },
    { pattern: /recovery|rest|aftermath/, index: 12 },
    { pattern: /group|meeting/, index: 3 },
    { pattern: /start|open|initiat/, index: 2 },
  ];
  const matched = rules.find((rule) => rule.pattern.test(claim));
  const scenarioIndex = matched?.index ?? 1;
  const prefix = relationshipContext
    .toUpperCase()
    .replaceAll("_", "-");
  return {
    scenarioRefs: [`SCN-${prefix}-${scenarioIndex}`],
    status: matched ? "rule_mapped_needs_review" : "default_needs_review",
  };
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.length > 0));
}
