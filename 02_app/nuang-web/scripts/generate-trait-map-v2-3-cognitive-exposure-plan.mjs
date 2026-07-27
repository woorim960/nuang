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
  "TRAIT_MAP_COGNITIVE_INTERVIEW_EXPOSURE_PLAN_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "121_COGNITIVE_INTERVIEW_EXPOSURE_PLAN_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const p0Packet = readJson(
  reviewDirectory,
  "TRAIT_MAP_P0_INDEPENDENT_REVIEW_PACKET_POST_P2_V2_3.json",
);
const p1Packet = readJson(
  reviewDirectory,
  "TRAIT_MAP_P1_INDEPENDENT_REVIEW_PACKET_V2_3.json",
);
const p2Sample = readJson(
  reviewDirectory,
  "TRAIT_MAP_P2_STRATIFIED_REVIEW_SAMPLE_V2_3.json",
);
const evidence = readJson(
  generatedDirectory,
  "TRAIT_MAP_EVIDENCE_TRACE_AUDIT_V2_3.json",
);
const riskById = new Map(
  evidence.entries.map((entry) => [
    entry.canonicalVariantId,
    entry,
  ]),
);
const p1ItemsByReviewId = new Map(
  p1Packet.reviewItems.map((item) => [item.reviewItemId, item]),
);

const stageUnits = {
  CI_A_P0: p0Packet.reviewItems.map((item) =>
    buildUnit({
      stage: "CI_A_P0",
      unitId: `CI-A-${item.canonicalVariantId}`,
      claimKey: item.claimKey,
      scenarioRef: item.scenarioRef,
      canonicalVariantIds: [item.canonicalVariantId],
      axisSignatures: [item.axisSignature],
      displayedVariantCount: 1,
      sourcePriority: "P0",
    }),
  ),
  CI_B_P1: p1Packet.claimGroups.map((group) => {
    const items = group.reviewItemIds.map((id) =>
      p1ItemsByReviewId.get(id),
    );
    return buildUnit({
      stage: "CI_B_P1",
      unitId: `CI-B-${group.claimGroupId}`,
      claimKey: group.claimKey,
      scenarioRef: group.scenarioRefs[0],
      canonicalVariantIds: items.map(
        (item) => item.canonicalVariantId,
      ),
      axisSignatures: items.map((item) => item.axisSignature),
      displayedVariantCount: items.length,
      sourcePriority: "P1",
    });
  }),
  CI_C_P2: p2Sample.sampledEntries.map((item) =>
    buildUnit({
      stage: "CI_C_P2",
      unitId: `CI-C-${item.canonicalVariantId}`,
      claimKey: item.claimKey,
      scenarioRef: item.scenarioRef,
      canonicalVariantIds: [item.canonicalVariantId],
      axisSignatures: [item.axisSignature],
      displayedVariantCount: 1,
      sourcePriority: "P2",
    }),
  ),
};
const sessions = Object.entries(stageUnits).flatMap(
  ([stage, units]) => createSessions(stage, units),
);
const exposureRows = sessions.flatMap((session) =>
  session.exposures.map((exposure, index) => ({
    sessionSlotId: session.sessionSlotId,
    stage: session.stage,
    exposureOrder: index + 1,
    ...exposure,
  })),
);
const unitExposureCounts = Object.fromEntries(
  Object.values(stageUnits)
    .flat()
    .map((unit) => [
      unit.unitId,
      exposureRows.filter((row) => row.unitId === unit.unitId)
        .length,
    ]),
);
const underexposedUnits = Object.values(stageUnits)
  .flat()
  .filter(
    (unit) =>
      unitExposureCounts[unit.unitId] <
      unit.requiredParticipantExposures,
  );
const sessionViolations = sessions.flatMap((session) => {
  const issues = [];
  const claimKeys = session.exposures.map(
    (exposure) => exposure.claimKey,
  );
  const unitIds = session.exposures.map(
    (exposure) => exposure.unitId,
  );
  if (
    session.displayedVariantCount < 12 ||
    session.displayedVariantCount > 16
  ) {
    issues.push("DISPLAYED_VARIANT_COUNT_OUTSIDE_12_16");
  }
  if (new Set(claimKeys).size !== claimKeys.length) {
    issues.push("DUPLICATE_CLAIM_IN_SESSION");
  }
  if (new Set(unitIds).size !== unitIds.length) {
    issues.push("DUPLICATE_UNIT_IN_SESSION");
  }
  if (session.axisRefs.length < 2) {
    issues.push("LESS_THAN_TWO_AXIS_REFS");
  }
  return issues.map((issue) => ({
    sessionSlotId: session.sessionSlotId,
    issue,
  }));
});
const stageSummary = Object.fromEntries(
  Object.keys(stageUnits).map((stage) => {
    const stageSessions = sessions.filter(
      (session) => session.stage === stage,
    );
    const stageRows = exposureRows.filter((row) => row.stage === stage);
    return [
      stage,
      {
        units: stageUnits[stage].length,
        minimumRequiredExposures: stageUnits[stage].reduce(
          (total, unit) =>
            total + unit.requiredParticipantExposures,
          0,
        ),
        plannedExposures: stageRows.length,
        displayedVariants: stageRows.reduce(
          (total, row) => total + row.displayedVariantCount,
          0,
        ),
        sessionSlots: stageSessions.length,
        minimumSessionDisplayedVariants: Math.min(
          ...stageSessions.map(
            (session) => session.displayedVariantCount,
          ),
        ),
        maximumSessionDisplayedVariants: Math.max(
          ...stageSessions.map(
            (session) => session.displayedVariantCount,
          ),
        ),
      },
    ];
  }),
);
const report = {
  contractVersion:
    "nuang-trait-map-cognitive-interview-exposure-plan.v2.3",
  reportId: "TRAIT-MAP-COGNITIVE-INTERVIEW-EXPOSURE-PLAN.2.3",
  status:
    underexposedUnits.length === 0 && sessionViolations.length === 0
      ? "EXPOSURE_PLAN_STRUCTURALLY_READY_PARTICIPANTS_NOT_ASSIGNED"
      : "EXPOSURE_PLAN_REPAIR_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReports: [
    p0Packet.reportId,
    p1Packet.reportId,
    p2Sample.reportId,
    evidence.reportId,
  ],
  summary: {
    exposureUnits: Object.values(stageUnits).flat().length,
    requiredParticipantExposures: Object.values(stageUnits)
      .flat()
      .reduce(
        (total, unit) =>
          total + unit.requiredParticipantExposures,
        0,
      ),
    plannedExposures: exposureRows.length,
    calibrationFillExposures: exposureRows.filter(
      (row) => row.assignmentReason === "calibration_fill",
    ).length,
    displayedVariants: exposureRows.reduce(
      (total, row) => total + row.displayedVariantCount,
      0,
    ),
    sessionSlots: sessions.length,
    underexposedUnits: underexposedUnits.length,
    sessionViolations: sessionViolations.length,
    assignedParticipants: 0,
    completedParticipants: 0,
  },
  assignmentRules: [
    "일반 문구 단위는 서로 다른 회기 슬롯에 2회, 고위험 단위는 3회 배정한다.",
    "같은 회기에는 동일 exposure unit과 동일 claimKey를 두 번 넣지 않는다.",
    "회기마다 실제 표시 문장 수를 12~16개로 맞춘다.",
    "회기마다 최소 두 개 이상의 뉴앙 축을 포함한다.",
    "부족한 회기는 기존 단위를 추가 보정 노출로 채우되 같은 claim을 반복하지 않는다.",
    "세션 슬롯은 참여자 계정이 아니며 실제 모집 때 익명 participantRef와 무작위 연결한다.",
  ],
  stageSummary,
  underexposedUnits: underexposedUnits.map((unit) => unit.unitId),
  sessionViolations,
  sessions,
  nextGate: {
    name: "PARTICIPANT_RANDOM_ASSIGNMENT_AND_COLLECTION",
    actions: [
      "동의한 익명 참여자를 적합한 stage의 비어 있는 sessionSlotId에 무작위 배정한다.",
      "참여자 배경 층이 한 세션 유형에 몰리지 않는지 실시간으로 확인한다.",
      "참여자 모집 전에는 수집 완료나 이해도 통과로 기록하지 않는다.",
    ],
  },
};
if (
  report.summary.exposureUnits !== 347 ||
  report.summary.underexposedUnits !== 0 ||
  report.summary.sessionViolations !== 0
) {
  throw new Error(
    `Cognitive exposure plan failed: units ${report.summary.exposureUnits}, underexposed ${report.summary.underexposedUnits}, session violations ${report.summary.sessionViolations}`,
  );
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});
if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.3 cognitive exposure plan is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Cognitive exposure plan v2.3: ${report.summary.exposureUnits} units, ${report.summary.plannedExposures} exposures, ${report.summary.sessionSlots} sessions, violations ${report.summary.sessionViolations}, participants ${report.summary.assignedParticipants}.`,
);

function buildUnit({
  stage,
  unitId,
  claimKey,
  scenarioRef,
  canonicalVariantIds,
  axisSignatures,
  displayedVariantCount,
  sourcePriority,
}) {
  const evidenceRows = canonicalVariantIds.map((id) => riskById.get(id));
  const riskDomains = [
    ...new Set(evidenceRows.flatMap((row) => row.riskDomains)),
  ];
  const highRisk = riskDomains.some((domain) => domain !== "none");
  return {
    stage,
    unitId,
    claimKey,
    scenarioRef,
    context: contextOf(scenarioRef),
    canonicalVariantIds,
    axisSignatures,
    axisRefs: [
      ...new Set(
        axisSignatures.flatMap((signature) =>
          signature.split("|").map((part) => part.split("=")[0]),
        ),
      ),
    ],
    riskDomains,
    highRisk,
    displayedVariantCount,
    sourcePriority,
    requiredParticipantExposures: highRisk ? 3 : 2,
  };
}

function createSessions(stage, units) {
  const expanded = units
    .flatMap((unit) =>
      Array.from(
        { length: unit.requiredParticipantExposures },
        (_, repeatIndex) => ({
          ...unit,
          repeatIndex: repeatIndex + 1,
          assignmentReason: "minimum_required_exposure",
        }),
      ),
    )
    .sort(
      (left, right) =>
        right.displayedVariantCount - left.displayedVariantCount ||
        Number(right.highRisk) - Number(left.highRisk) ||
        left.axisSignatures.join("|").localeCompare(
          right.axisSignatures.join("|"),
          "en",
        ) ||
        left.unitId.localeCompare(right.unitId, "en") ||
        left.repeatIndex - right.repeatIndex,
    );
  const targetSessionCount = Math.ceil(
    expanded.reduce(
      (total, exposure) =>
        total + exposure.displayedVariantCount,
      0,
    ) / 14,
  );
  const sessions = Array.from(
    { length: targetSessionCount },
    (_, index) => emptySession(stage, index + 1),
  );
  for (const exposure of expanded) {
    const target = chooseSession(sessions, exposure);
    if (!target) {
      const added = emptySession(stage, sessions.length + 1);
      sessions.push(added);
      addExposure(added, exposure);
    } else {
      addExposure(target, exposure);
    }
  }
  const exposureCountByUnit = new Map(
    units.map((unit) => [
      unit.unitId,
      sessions.reduce(
        (total, session) =>
          total +
          session.exposures.filter(
            (exposure) => exposure.unitId === unit.unitId,
          ).length,
        0,
      ),
    ]),
  );
  for (const session of sessions) {
    while (
      session.displayedVariantCount < 12 ||
      session.axisRefs.length < 2
    ) {
      const candidates = units
        .filter(
          (unit) =>
            !session.exposures.some(
              (exposure) =>
                exposure.unitId === unit.unitId ||
                exposure.claimKey === unit.claimKey,
            ) &&
            session.displayedVariantCount +
              unit.displayedVariantCount <=
              16,
        )
        .sort(
          (left, right) =>
            Number(
              right.axisRefs.some(
                (axisRef) => !session.axisRefs.includes(axisRef),
              ),
            ) -
              Number(
                left.axisRefs.some(
                  (axisRef) => !session.axisRefs.includes(axisRef),
                ),
              ) ||
            (exposureCountByUnit.get(left.unitId) ?? 0) -
              (exposureCountByUnit.get(right.unitId) ?? 0) ||
            left.unitId.localeCompare(right.unitId, "en"),
        );
      const candidate = candidates[0];
      if (!candidate) break;
      addExposure(session, {
        ...candidate,
        repeatIndex: null,
        assignmentReason: "calibration_fill",
      });
      exposureCountByUnit.set(
        candidate.unitId,
        (exposureCountByUnit.get(candidate.unitId) ?? 0) + 1,
      );
    }
  }
  return sessions.map(finalizeSession);
}

function chooseSession(sessions, exposure) {
  return (
    sessions
      .filter(
        (session) =>
          session.displayedVariantCount +
            exposure.displayedVariantCount <=
            16 &&
          !session.exposures.some(
            (existing) =>
              existing.unitId === exposure.unitId ||
              existing.claimKey === exposure.claimKey,
          ),
      )
      .sort(
        (left, right) =>
          left.displayedVariantCount - right.displayedVariantCount ||
          axisOverlap(left, exposure) - axisOverlap(right, exposure) ||
          left.sessionSlotId.localeCompare(
            right.sessionSlotId,
            "en",
          ),
      )[0] ?? null
  );
}

function addExposure(session, exposure) {
  session.exposures.push({
    unitId: exposure.unitId,
    claimKey: exposure.claimKey,
    scenarioRef: exposure.scenarioRef,
    context: exposure.context,
    canonicalVariantIds: exposure.canonicalVariantIds,
    axisSignatures: exposure.axisSignatures,
    axisRefs: exposure.axisRefs,
    riskDomains: exposure.riskDomains,
    highRisk: exposure.highRisk,
    displayedVariantCount: exposure.displayedVariantCount,
    sourcePriority: exposure.sourcePriority,
    minimumRepeatIndex: exposure.repeatIndex,
    assignmentReason: exposure.assignmentReason,
  });
  session.displayedVariantCount += exposure.displayedVariantCount;
  session.axisRefs = [
    ...new Set([...session.axisRefs, ...exposure.axisRefs]),
  ].sort((left, right) => left.localeCompare(right, "en"));
  session.contexts = [
    ...new Set([...session.contexts, exposure.context]),
  ].sort((left, right) => left.localeCompare(right, "en"));
}

function finalizeSession(session) {
  return {
    ...session,
    exposures: session.exposures.sort(
      (left, right) =>
        Number(right.highRisk) - Number(left.highRisk) ||
        left.axisSignatures.join("|").localeCompare(
          right.axisSignatures.join("|"),
          "en",
        ) ||
        left.unitId.localeCompare(right.unitId, "en"),
    ),
  };
}

function emptySession(stage, number) {
  return {
    sessionSlotId: `${stage}-SLOT-${String(number).padStart(3, "0")}`,
    stage,
    displayedVariantCount: 0,
    axisRefs: [],
    contexts: [],
    exposures: [],
    participantRef: null,
    assignmentState: "unassigned",
    completionState: "not_started",
  };
}

function axisOverlap(session, exposure) {
  return exposure.axisRefs.filter((axisRef) =>
    session.axisRefs.includes(axisRef),
  ).length;
}

function contextOf(scenarioRef) {
  return scenarioRef
    .replace(/^SCN-/, "")
    .replace(/-\d+$/, "")
    .toLowerCase()
    .replaceAll("-", "_");
}

function buildMarkdown(result) {
  return `# v2.3 인지 면담 노출 계획

- 노출 단위: ${result.summary.exposureUnits}
- 최소 필요 노출: ${result.summary.requiredParticipantExposures}
- 계획 노출: ${result.summary.plannedExposures}
- 보정 노출: ${result.summary.calibrationFillExposures}
- 실제 표시 문장: ${result.summary.displayedVariants}
- 회기 슬롯: ${result.summary.sessionSlots}
- 부족 노출 단위: ${result.summary.underexposedUnits}
- 회기 규칙 위반: ${result.summary.sessionViolations}
- 배정 참여자: 0

P0 162개, P1 131개 claim 그룹, P2 54개 표본을 합쳐 347개 노출
단위를 만들었다. 일반 단위는 서로 다른 회기에 최소 2회, 관계 결과·업무
수행 고위험 단위는 최소 3회 배정했다. 모든 회기는 12~16개 실제 문장,
서로 다른 claim, 최소 두 축을 포함한다.

세션 슬롯은 실제 사람이나 완료 기록이 아니다. 참여자 모집이 시작되면
동의한 익명 \`participantRef\`를 비어 있는 슬롯에 무작위 배정한다.
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
