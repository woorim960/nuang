import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(projectRoot, "docs/trait-maps/ENAKQ");
const outputPath = path.join(
  projectRoot,
  "src/features/nuang-code/fixtures/enakq-claim-registry.generated.json",
);
const checkOnly = process.argv.includes("--check");

const evidenceStatuses = new Set([
  "EXTERNAL_SUPPORTED",
  "EXTERNAL_SUPPORTED_BOUNDARY",
  "EXTERNAL_SUPPORTED_METHOD",
  "NUANG_MAPPED_PROVISIONAL",
  "COGNITIVE_REVIEW_REQUIRED",
  "QUANT_VALIDATION_REQUIRED",
  "DESIGN_APPROVED_NOT_EXECUTED",
  "EVIDENCE_DOCUMENTED",
  "SAFETY_POLICY",
  "HOLD",
  "APPROVED",
]);

const ledgers = Array.from({ length: 5 }, (_, index) => {
  const part = index + 1;
  return {
    part,
    path: path.join(
      sourceDirectory,
      `ENAKQ_EVIDENCE_LEDGER_PART${part}_V0_1.md`,
    ),
  };
});

const drafts = Array.from({ length: 5 }, (_, index) => {
  const part = index + 1;
  return {
    part,
    path: path.join(sourceDirectory, `ENAKQ_MAP_DRAFT_PART${part}_V0_1.md`),
  };
});

const claims = new Map();

for (const ledger of ledgers) {
  const source = fs.readFileSync(ledger.path, "utf8");
  for (const line of source.split(/\r?\n/)) {
    if (!line.startsWith("| `ENAKQ.")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim().replace(/^`|`$/g, ""));
    const evidenceStatusIndex = cells.findIndex((cell) =>
      evidenceStatuses.has(cell),
    );
    if (evidenceStatusIndex < 2) continue;

    const claimId = cells[0];
    const evidenceStatus = cells[evidenceStatusIndex];
    const evidenceCells = cells.slice(1, evidenceStatusIndex);
    const externalEvidence = evidenceCells[0];
    const internalEvidence =
      evidenceCells.slice(1).join(" | ") ||
      `ENAKQ Part ${ledger.part} claim mapping`;
    const current = claims.get(claimId);
    if (current && current.evidenceStatus !== evidenceStatus) {
      throw new Error(
        `${claimId} has conflicting statuses: ${current.evidenceStatus}, ${evidenceStatus}`,
      );
    }

    claims.set(claimId, {
      claimId,
      evidenceStatus,
      externalEvidence: mergeUnique(
        current?.externalEvidence,
        externalEvidence,
      ),
      internalEvidence: mergeUnique(
        current?.internalEvidence,
        internalEvidence,
      ),
      sourceParts: mergeUnique(current?.sourceParts, ledger.part),
      sourceBlockRefs: current?.sourceBlockRefs ?? [],
    });
  }
}

for (const draft of drafts) {
  const source = fs.readFileSync(draft.path, "utf8");
  const blockPattern = /<!-- block: ([^;]+); claims: ([^>]+) -->/g;
  for (const match of source.matchAll(blockPattern)) {
    const blockId = match[1].trim();
    const claimIds = match[2].split(",").map((claimId) => claimId.trim());
    for (const claimId of claimIds) {
      const claim = claims.get(claimId);
      if (!claim) {
        throw new Error(`${blockId} references unregistered claim ${claimId}`);
      }
      claim.sourceBlockRefs = mergeUnique(claim.sourceBlockRefs, blockId);
    }
  }
}

const entries = [...claims.values()]
  .sort((left, right) => left.claimId.localeCompare(right.claimId, "en"))
  .map((claim) => {
    if (claim.sourceBlockRefs.length === 0) {
      throw new Error(`${claim.claimId} is not referenced by a source block`);
    }

    const canonicalSectionId = getCanonicalSectionId(claim.claimId);
    const privacyScope = getPrivacyScope(claim.claimId);
    return {
      canonicalSectionId,
      candidateSurfaces: getCandidateSurfaces(
        claim.claimId,
        canonicalSectionId,
        privacyScope,
      ),
      claimId: claim.claimId,
      claimKind: getClaimKind(claim.claimId),
      contentKey: `trait-map.enakq.${claim.claimId
        .slice("ENAKQ.".length)
        .toLowerCase()}`,
      contexts: getContexts(claim.claimId),
      evidenceStatus: claim.evidenceStatus,
      externalEvidence: claim.externalEvidence,
      internalEvidence: claim.internalEvidence,
      privacyScope,
      publicationState: getPublicationState(claim.evidenceStatus),
      requiredSignals: getRequiredSignals(claim.claimId),
      sourceBlockRefs: claim.sourceBlockRefs.sort(),
      sourceParts: claim.sourceParts.sort(),
    };
  });

const registry = {
  code: "ENAKQ",
  contractVersion: "nuang-trait-claim-registry.v0.1",
  entries,
  generatedFrom: {
    draftParts: drafts.map(({ path: draftPath }) => path.basename(draftPath)),
    evidenceLedgers: ledgers.map(({ path: ledgerPath }) =>
      path.basename(ledgerPath),
    ),
  },
  mapVersion: "ENAKQ.map.v0.1-draft",
  status: "research_draft_not_for_production",
};

const output = await prettier.format(JSON.stringify(registry), {
  parser: "json",
});

if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "ENAKQ claim registry is stale. Run npm run research:enakq:claim-registry.",
    );
    process.exit(1);
  }
  console.log(
    `ENAKQ claim registry is current: ${entries.length} canonical claims.`,
  );
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(
    `Generated ${path.relative(projectRoot, outputPath)} with ${entries.length} canonical claims.`,
  );
}

function mergeUnique(current = [], next) {
  return [...new Set([...current, next])];
}

function getCanonicalSectionId(claimId) {
  if (claimId.startsWith("ENAKQ.family.")) return "family";
  if (claimId.startsWith("ENAKQ.friend.")) return "friend";
  if (claimId.startsWith("ENAKQ.partner.")) return "partner";
  if (claimId.startsWith("ENAKQ.crush.")) return "person_of_interest";
  if (claimId.startsWith("ENAKQ.work.") || claimId.startsWith("ENAKQ.study.")) {
    return "work";
  }
  if (claimId.startsWith("ENAKQ.stress.")) return "stress_and_recovery";
  if (claimId.startsWith("ENAKQ.strength.")) return "strengths_and_growth";
  if (claimId.startsWith("ENAKQ.growth.")) return "strengths_and_growth";
  if (claimId.startsWith("ENAKQ.misread.")) return "misunderstandings";
  if (claimId.startsWith("ENAKQ.conversation.")) return "communication_guide";
  if (claimId.startsWith("ENAKQ.comparison.")) return "communication_guide";
  if (claimId.startsWith("ENAKQ.evidence.")) {
    return "limitations_and_evidence";
  }
  if (claimId.startsWith("ENAKQ.interaction.")) return "code_interactions";
  if (claimId.startsWith("ENAKQ.process.")) {
    return "inner_thought_and_response";
  }
  if (claimId.startsWith("ENAKQ.daily.")) return "daily_life";
  if (claimId.startsWith("ENAKQ.general.role.")) return "role_name";
  return "five_code_positions";
}

function getContexts(claimId) {
  if (claimId.startsWith("ENAKQ.family.")) return ["family"];
  if (claimId.startsWith("ENAKQ.friend.")) return ["friend"];
  if (claimId.startsWith("ENAKQ.partner.")) return ["partner"];
  if (claimId.startsWith("ENAKQ.crush.")) return ["person_of_interest"];
  if (claimId.startsWith("ENAKQ.work.") || claimId.startsWith("ENAKQ.study.")) {
    return ["work"];
  }
  return ["general"];
}

function getClaimKind(claimId) {
  const explicitKinds = {
    "ENAKQ.comparison.nonjudgment": "boundary",
    "ENAKQ.crush.fact_check": "growth_practice",
    "ENAKQ.crush.self_check": "growth_practice",
    "ENAKQ.daily.self_check": "growth_practice",
    "ENAKQ.friend.support": "conversation_prompt",
    "ENAKQ.general.role.conductor": "strength",
    "ENAKQ.partner.comparison": "boundary",
    "ENAKQ.partner.self_check": "growth_practice",
    "ENAKQ.process.comparison_boundary": "boundary",
    "ENAKQ.process.release_threshold": "boundary",
    "ENAKQ.strength.conditional": "boundary",
    "ENAKQ.strength.Q_nonvirtue": "boundary",
    "ENAKQ.strength.role_boundary": "boundary",
    "ENAKQ.stress.environment": "boundary",
    "ENAKQ.stress.self_check": "growth_practice",
    "ENAKQ.work.ideation": "strength",
    "ENAKQ.work.self_check": "growth_practice",
  };
  if (claimId in explicitKinds) return explicitKinds[claimId];
  if (claimId.includes(".definition.")) return "definition";
  if (claimId.startsWith("ENAKQ.evidence.")) return "evidence_statement";
  if (claimId.startsWith("ENAKQ.interaction.")) {
    return claimId.endsWith(".boundary")
      ? "boundary"
      : "interaction_hypothesis";
  }
  if (claimId.endsWith(".context")) return "context_hypothesis";
  if (
    claimId.includes("boundary") ||
    claimId.includes(".similarity") ||
    claimId.includes(".non_inference") ||
    claimId.includes(".nonpromise") ||
    claimId.includes(".non_ability") ||
    claimId.includes(".nonvirtue") ||
    claimId.includes(".privacy") ||
    claimId.includes(".safety") ||
    claimId.includes(".norms")
  ) {
    return "boundary";
  }
  if (claimId.startsWith("ENAKQ.misread.")) return "possible_misread";
  if (
    claimId.startsWith("ENAKQ.conversation.") ||
    claimId.endsWith(".prompt") ||
    claimId.endsWith(".support_prompt")
  ) {
    return "conversation_prompt";
  }
  if (claimId.startsWith("ENAKQ.growth.")) return "growth_practice";
  if (claimId.includes("_overuse") || claimId.endsWith(".friction")) {
    return "friction";
  }
  if (claimId.startsWith("ENAKQ.strength.")) return "strength";
  if (
    claimId.includes(".support") ||
    claimId.includes(".recovery") ||
    claimId.endsWith(".rest")
  ) {
    return "support_preference";
  }
  if (
    claimId.includes(".inner.") ||
    claimId.includes(".activation") ||
    claimId.endsWith(".first_orientation") ||
    claimId.includes(".worry") ||
    claimId.includes(".attention") ||
    claimId.includes(".uncertainty")
  ) {
    return "inner_thought";
  }
  return "observable_response";
}

function getPrivacyScope(claimId) {
  if (
    /^ENAKQ\.general\.(inner|response)\./.test(claimId) ||
    /^ENAKQ\.process\.(first_orientation|enacted_response|GA|GG|personal_display)$/.test(
      claimId,
    )
  ) {
    return "self_only";
  }
  if (
    claimId.includes(".definition.") ||
    claimId.includes("boundary") ||
    claimId.includes(".similarity") ||
    claimId.startsWith("ENAKQ.evidence.") ||
    claimId.includes(".non_inference") ||
    claimId.includes(".safety") ||
    claimId === "ENAKQ.comparison.nonjudgment" ||
    claimId === "ENAKQ.growth.nonpromise" ||
    claimId === "ENAKQ.growth.privacy" ||
    claimId === "ENAKQ.strength.non_ability" ||
    claimId === "ENAKQ.strength.Q_nonvirtue"
  ) {
    return "public_safe";
  }
  return "comparison_safe";
}

function getCandidateSurfaces(claimId, canonicalSectionId, privacyScope) {
  const surfaces = new Set(["trait_map"]);
  if (canonicalSectionId === "limitations_and_evidence") {
    surfaces.add("evidence_page");
  } else {
    surfaces.add("personal_report");
  }
  if (privacyScope !== "self_only") {
    if (
      [
        "family",
        "friend",
        "partner",
        "person_of_interest",
        "misunderstandings",
        "communication_guide",
      ].includes(canonicalSectionId) ||
      claimId.includes(".comparison")
    ) {
      surfaces.add("comparison_report");
    }
    if (
      privacyScope === "public_safe" &&
      (claimId.includes(".definition.") || claimId.includes(".boundary"))
    ) {
      surfaces.add("public_profile");
    }
  }
  return [...surfaces];
}

function getPublicationState(evidenceStatus) {
  if (evidenceStatus === "APPROVED") return "approved";
  if (
    [
      "EXTERNAL_SUPPORTED",
      "EXTERNAL_SUPPORTED_BOUNDARY",
      "EXTERNAL_SUPPORTED_METHOD",
      "EVIDENCE_DOCUMENTED",
      "SAFETY_POLICY",
    ].includes(evidenceStatus)
  ) {
    return "review_candidate";
  }
  return "research_only";
}

function getRequiredSignals(claimId) {
  const signals = new Set(
    claimId.startsWith("ENAKQ.evidence.") ? [] : ["domain_scores"],
  );
  if (claimId.startsWith("ENAKQ.interaction.")) signals.add("facet_scores");
  if (/^(ENAKQ\.(family|friend|partner|crush|work|study)\.)/.test(claimId)) {
    signals.add("relationship_context");
  }
  if (getPrivacyScope(claimId) === "self_only") {
    signals.add("private_process_signals");
  }
  if (
    claimId === "ENAKQ.stress.recovery" ||
    claimId === "ENAKQ.stress.support_preference" ||
    claimId === "ENAKQ.daily.rest"
  ) {
    signals.add("recovery_preference");
  }
  if (
    claimId.startsWith("ENAKQ.stress.") &&
    !claimId.includes("boundary") &&
    !claimId.includes("safety")
  ) {
    signals.add("current_state");
  }
  return [...signals];
}
