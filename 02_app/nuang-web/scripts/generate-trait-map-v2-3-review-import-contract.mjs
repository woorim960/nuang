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
  "TRAIT_MAP_REVIEW_IMPORT_CONTRACT_V2_3.json",
);
const schemaPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_REVIEW_IMPORT_SCHEMA_V2_3.json",
);
const templatePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_REVIEW_IMPORT_EMPTY_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "130_REVIEW_AND_COGNITIVE_IMPORT_CONTRACT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const ledger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const protocol = readJson(
  reviewDirectory,
  "TRAIT_MAP_INDEPENDENT_REVIEW_PROTOCOL_V2_3.json",
);
const cognitiveProtocol = readJson(
  reviewDirectory,
  "TRAIT_MAP_COGNITIVE_INTERVIEW_PROTOCOL_V2_3.json",
);
const canonicalIds = new Set(
  ledger.entries.map((entry) => entry.canonicalVariantId),
);
const roles = protocol.roles.map((role) => role.role);
const issueCodes = protocol.decisionContract.issueCodes;

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "nuang-trait-map-review-import.v2.3",
  title: "Nuang trait-map independent and cognitive review import",
  type: "object",
  additionalProperties: false,
  required: [
    "contractVersion",
    "batchId",
    "sourceSystem",
    "exportedAt",
    "reviewers",
    "independentDecisions",
    "cognitiveObservations",
    "revisionProposals",
    "adjudications",
  ],
  properties: {
    contractVersion: {
      const: "nuang-trait-map-review-import.v2.3",
    },
    batchId: { type: "string", minLength: 8 },
    sourceSystem: {
      enum: [
        "independent_review_portal",
        "cognitive_interview_capture",
        "controlled_manual_import",
      ],
    },
    exportedAt: { type: "string", format: "date-time" },
    reviewers: {
      type: "array",
      items: reviewerSchema(roles),
    },
    independentDecisions: {
      type: "array",
      items: independentDecisionSchema(roles, issueCodes),
    },
    cognitiveObservations: {
      type: "array",
      items: cognitiveObservationSchema(),
    },
    revisionProposals: {
      type: "array",
      items: revisionProposalSchema(),
    },
    adjudications: {
      type: "array",
      items: adjudicationSchema(),
    },
  },
};
const emptyTemplate = {
  contractVersion: "nuang-trait-map-review-import.v2.3",
  batchId: "EMPTY-NOT-FOR-IMPORT",
  sourceSystem: "controlled_manual_import",
  exportedAt: "2026-07-24T00:00:00.000Z",
  reviewers: [],
  independentDecisions: [],
  cognitiveObservations: [],
  revisionProposals: [],
  adjudications: [],
};
const contract = {
  contractVersion: "nuang-trait-map-review-import-contract.v2.3",
  reportId: "TRAIT-MAP-REVIEW-IMPORT-CONTRACT.2.3",
  status: "IMPORT_SCHEMA_READY_NO_DECISIONS_IMPORTED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  sourceIndependentProtocolReportId: protocol.reportId,
  sourceCognitiveProtocolReportId: cognitiveProtocol.reportId,
  canonicalRegistry: {
    canonicalVariantCount: canonicalIds.size,
    allowedCanonicalVariantIds:
      "런타임 validator는 P2 screened ledger의 정확한 ID 집합을 사용한다.",
  },
  identityAndIndependence: {
    reviewerRoles: roles,
    reviewerRef:
      "이름 대신 연구 관리자만 역매핑할 수 있는 무작위 reviewer_ref를 import한다.",
    qualification:
      "역할별 최소 자격 확인 상태와 확인자를 별도 기록한다.",
    conflict:
      "직접 저자·제품 의사결정자·경제적 이해관계는 공개하고 해당 판정의 독립 승인 자격을 제한한다.",
    selfApprovalProhibited: true,
  },
  eventRules: [
    rule(
      "E01_IMMUTABLE",
      "이미 수락한 decision_id·observation_id·proposal_id·adjudication_id는 수정하지 않고 정정 이벤트를 추가한다.",
    ),
    rule(
      "E02_KNOWN_CANONICAL",
      "모든 이벤트는 현재 ledger에 존재하는 canonical_variant_id와 content_version을 참조한다.",
    ),
    rule(
      "E03_ROLE_MATCH",
      "독립 판정의 reviewer_ref 역할은 decision.role과 일치해야 한다.",
    ),
    rule(
      "E04_CONFLICT",
      "미해결 이해충돌 또는 자격 미확인 reviewer의 approve는 7역할 승인 집계에 포함하지 않는다.",
    ),
    rule(
      "E05_NO_SYNTHETIC",
      "합성 fixture·AI dry run·작성자 자기검토는 독립 판정이나 실제 참여자 인지 면담으로 import할 수 없다.",
    ),
    rule(
      "E06_REVISION_INVALIDATES",
      "문구·축·surface·privacy scope 수정은 새 content_version을 만들고 이전 버전의 발행 승인을 새 버전으로 승계하지 않는다.",
    ),
    rule(
      "E07_RETEST",
      "이해도나 뜻에 영향을 주는 교정은 동일 문구 버전의 인지 재시험 완료 전 approve될 수 없다.",
    ),
    rule(
      "E08_RECOMPOSE",
      "축·방향·문구 교정은 32개 성향 참조와 한 글자 이웃을 다시 조합하고 예상하지 않은 변화를 차단한다.",
    ),
    rule(
      "E09_NO_MAJORITY_OVERRIDE",
      "구성개념·근거·안전 반대는 다수결로 덮지 않고 revise·hold·reject 또는 해당 역할 재검토로 보낸다.",
    ),
    rule(
      "E10_ATOMIC_IMPORT",
      "알 수 없는 ID·중복 이벤트·잘못된 시간·필수 근거 누락이 하나라도 있으면 batch 전체를 반영하지 않는다.",
    ),
  ],
  aggregationStateMachine: [
    transition("DRAFT", "UNDER_INDEPENDENT_REVIEW", "첫 유효 역할 판정"),
    transition(
      "UNDER_INDEPENDENT_REVIEW",
      "REVISION_REQUIRED",
      "한 역할이라도 revise",
    ),
    transition(
      "UNDER_INDEPENDENT_REVIEW",
      "EVIDENCE_HOLD",
      "hold 또는 근거 독립성 미해결",
    ),
    transition(
      "UNDER_INDEPENDENT_REVIEW",
      "REJECTED_RETAIN_LINEAGE",
      "reject 확정",
    ),
    transition(
      "REVISION_REQUIRED",
      "RECOMPOSITION_REQUIRED",
      "새 문구 version 생성",
    ),
    transition(
      "RECOMPOSITION_REQUIRED",
      "COGNITIVE_RETEST_REQUIRED",
      "재조합·이웃 검사 통과",
    ),
    transition(
      "COGNITIVE_RETEST_REQUIRED",
      "UNDER_INDEPENDENT_REVIEW",
      "재면담 통과 뒤 수정 역할 재검토",
    ),
    transition(
      "UNDER_INDEPENDENT_REVIEW",
      "ELIGIBLE_FOR_CUSTOMER_APPROVAL",
      "7역할 approve·미해결 issue 0·인지 기준 통과",
    ),
    transition(
      "ELIGIBLE_FOR_CUSTOMER_APPROVAL",
      "PUBLICATION_ALLOWLIST_CANDIDATE",
      "고객 발행 승인과 surface별 privacy 확인",
    ),
  ],
  importOrder: [
    "schema 검증",
    "event ID 중복·정정 계보 검증",
    "reviewer 자격·역할·이해충돌 검증",
    "canonical ID·content version 검증",
    "독립 판정과 인지 관측 import",
    "revision proposal와 adjudication 연결",
    "영향 분석·32개 재조합 dry run",
    "원자적 commit 또는 전체 rollback",
    "발행 게이트 재생성",
  ],
  currentState: {
    importedBatches: 0,
    importedReviewers: 0,
    importedIndependentDecisions: 0,
    importedCognitiveObservations: 0,
    importedRevisionProposals: 0,
    importedAdjudications: 0,
    independentApprovedCanonicalVariants: 0,
    customerApprovedCanonicalVariants: 0,
  },
  generatedAssets: [
    "review/TRAIT_MAP_REVIEW_IMPORT_SCHEMA_V2_3.json",
    "review/TRAIT_MAP_REVIEW_IMPORT_EMPTY_V2_3.json",
  ],
  nextGate: {
    name: "REVISION_IMPACT_DRY_RUN_ENGINE",
    actions: [
      "revision proposal이 영향을 주는 32개 성향·claim·이웃 edge·surface를 계산한다.",
      "예상 변화 allowlist 밖의 문장 변경을 차단한다.",
      "기존 승인 무효화와 재면담·재검토 작업을 자동 생성한다.",
    ],
  },
};

if (
  canonicalIds.size !== 605 ||
  roles.length !== 7 ||
  issueCodes.length !== 15 ||
  contract.eventRules.length !== 10 ||
  Object.values(contract.currentState).some((value) => value !== 0)
) {
  throw new Error("Review import contract invariants failed.");
}

const output = await prettier.format(JSON.stringify(contract), {
  parser: "json",
});
const schemaOutput = await prettier.format(JSON.stringify(schema), {
  parser: "json",
});
const templateOutput = await prettier.format(JSON.stringify(emptyTemplate), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(contract), {
  parser: "markdown",
});
if (checkOnly) {
  const expected = [
    [outputPath, output],
    [schemaPath, schemaOutput],
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
    console.error("v2.3 review import contract is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(schemaPath, schemaOutput);
  fs.writeFileSync(templatePath, templateOutput);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Review import contract v2.3: ${roles.length} roles, ${contract.eventRules.length} event rules, ${canonicalIds.size} known canonical IDs, imported decisions 0.`,
);

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}

function rule(id, description) {
  return { id, description };
}

function transition(from, to, trigger) {
  return { from, to, trigger };
}

function baseEventProperties() {
  return {
    canonicalVariantId: { type: "string", minLength: 8 },
    contentVersion: { type: "integer", minimum: 1 },
    recordedAt: { type: "string", format: "date-time" },
    sourceRecordHash: {
      type: "string",
      pattern: "^[a-f0-9]{64}$",
    },
  };
}

function reviewerSchema(roleIds) {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "reviewerRef",
      "role",
      "qualificationState",
      "conflictState",
      "verifiedAt",
    ],
    properties: {
      reviewerRef: { type: "string", minLength: 8 },
      role: { enum: roleIds },
      qualificationState: {
        enum: ["VERIFIED", "UNVERIFIED", "REJECTED"],
      },
      conflictState: {
        enum: ["NONE_DECLARED", "DISCLOSED_MANAGED", "DISQUALIFYING"],
      },
      verifiedAt: { type: "string", format: "date-time" },
    },
  };
}

function independentDecisionSchema(roleIds, issueIds) {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "decisionId",
      "reviewerRef",
      "role",
      "canonicalVariantId",
      "contentVersion",
      "decision",
      "issueCodes",
      "rationale",
      "recordedAt",
      "sourceRecordHash",
    ],
    properties: {
      decisionId: { type: "string", minLength: 8 },
      reviewerRef: { type: "string", minLength: 8 },
      role: { enum: roleIds },
      ...baseEventProperties(),
      decision: { enum: ["APPROVE", "REVISE", "HOLD", "REJECT"] },
      issueCodes: {
        type: "array",
        uniqueItems: true,
        items: { enum: issueIds },
      },
      rationale: { type: "string", minLength: 10 },
      correctionOfDecisionId: { type: ["string", "null"] },
    },
  };
}

function cognitiveObservationSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "observationId",
      "participantRef",
      "sessionRef",
      "canonicalVariantId",
      "contentVersion",
      "paraphraseAccuracy",
      "axisDiscrimination",
      "wordingDifficulty",
      "recordedAt",
      "sourceRecordHash",
    ],
    properties: {
      observationId: { type: "string", minLength: 8 },
      participantRef: { type: "string", minLength: 8 },
      sessionRef: { type: "string", minLength: 8 },
      ...baseEventProperties(),
      paraphraseAccuracy: {
        enum: ["ACCURATE", "PARTIAL", "INACCURATE", "NO_RESPONSE"],
      },
      axisDiscrimination: {
        enum: ["CORRECT", "AMBIGUOUS", "REVERSED", "NO_RESPONSE"],
      },
      wordingDifficulty: {
        enum: ["NONE", "MINOR", "MATERIAL", "BLOCKING"],
      },
      notesCode: {
        type: "array",
        uniqueItems: true,
        items: { type: "string", minLength: 3 },
      },
      correctionOfObservationId: { type: ["string", "null"] },
    },
  };
}

function revisionProposalSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "proposalId",
      "canonicalVariantId",
      "contentVersion",
      "proposedContentVersion",
      "changeKinds",
      "replacementText",
      "basisEventIds",
      "recordedAt",
      "sourceRecordHash",
    ],
    properties: {
      proposalId: { type: "string", minLength: 8 },
      ...baseEventProperties(),
      proposedContentVersion: { type: "integer", minimum: 2 },
      changeKinds: {
        type: "array",
        minItems: 1,
        uniqueItems: true,
        items: {
          enum: [
            "WORDING",
            "AXIS",
            "DIRECTION",
            "EVIDENCE_SCOPE",
            "SURFACE_SCOPE",
            "PRIVACY_SCOPE",
            "RETIRE",
          ],
        },
      },
      replacementText: { type: ["string", "null"] },
      basisEventIds: {
        type: "array",
        minItems: 1,
        uniqueItems: true,
        items: { type: "string", minLength: 8 },
      },
    },
  };
}

function adjudicationSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "adjudicationId",
      "canonicalVariantId",
      "contentVersion",
      "basisEventIds",
      "outcome",
      "rationale",
      "recordedAt",
      "sourceRecordHash",
    ],
    properties: {
      adjudicationId: { type: "string", minLength: 8 },
      ...baseEventProperties(),
      basisEventIds: {
        type: "array",
        minItems: 1,
        uniqueItems: true,
        items: { type: "string", minLength: 8 },
      },
      outcome: {
        enum: [
          "APPROVE_CURRENT",
          "APPLY_REVISION",
          "HOLD_EVIDENCE",
          "REJECT_RETAIN_LINEAGE",
        ],
      },
      rationale: { type: "string", minLength: 10 },
    },
  };
}

function buildMarkdown(result) {
  return `# v2.3 독립 검토·인지 면담 import 계약

## 왜 필요한가

독립 검토와 인지 면담 결과를 수기 메모로만 남기면 어느 문장 버전을
검토했는지, 수정 뒤 승인이 여전히 유효한지 재현할 수 없다. 모든 판정은
불변 event로 가져오고 정정도 기존 기록을 덮지 않는다.

- canonical registry: ${result.canonicalRegistry.canonicalVariantCount}개
- 독립 역할: ${result.identityAndIndependence.reviewerRoles.length}개
- event 규칙: ${result.eventRules.length}개
- 현재 import 판정: 0건

## 핵심 안전 규칙

- 작성자 자기검토·AI dry run·합성 자료를 독립 승인으로 인정하지 않음
- 한 역할이라도 revise이면 교정·재조합·인지 재시험
- 문구나 축이 바뀌면 새 version이며 과거 승인을 승계하지 않음
- 구성개념·근거·안전 반대를 다수결로 무시하지 않음
- 알 수 없는 ID나 중복 event가 있으면 batch 전체 rollback

## 생성 자산

- \`review/TRAIT_MAP_REVIEW_IMPORT_SCHEMA_V2_3.json\`
- \`review/TRAIT_MAP_REVIEW_IMPORT_EMPTY_V2_3.json\`

다음 단계는 revision proposal이 영향을 주는 32개 성향, 한 글자 이웃,
surface와 기존 승인을 commit 전에 계산하는 dry-run 엔진이다.
`;
}
