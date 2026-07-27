import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const apply = process.argv.includes("--apply");
const env = readEnv(path.join(projectRoot, ".env.local"));
const candidates = readCsvObjects(
  path.join(
    projectRoot,
    "docs/research/core-m04/generated/internal/opaque_item_mapping.csv",
  ),
);
const beta = JSON.parse(
  fs.readFileSync(
    path.join(projectRoot, "content-seed/items/core-beta-item-set.v1.0.json"),
    "utf8",
  ),
);

if (candidates.length !== 150) {
  throw new Error(`Expected 150 candidate items, found ${candidates.length}`);
}
if (beta.items.length !== 60) {
  throw new Error(`Expected 60 beta items, found ${beta.items.length}`);
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase service credentials are missing.");
}

const client = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const scoring = client.schema("scoring");
const assessment = client.schema("assessment");
const candidateReleaseId = "NUANG-CORE-CANDIDATE-BANK-M03-150";
const betaReleaseId = "NUANG-CORE-BETA-1.0";
const codeSchemeVersion = "NUANG-CODE-5AXIS-CANDIDATE-1.0";

const existingScheme = await scoring
  .from("code_scheme_release")
  .select("code_scheme_version,status")
  .eq("code_scheme_version", codeSchemeVersion)
  .maybeSingle();
if (existingScheme.error) throw existingScheme.error;

const existingReleases = await assessment
  .from("item_bank_release")
  .select("item_bank_release_id,status")
  .in("item_bank_release_id", [candidateReleaseId, betaReleaseId]);
if (existingReleases.error) throw existingReleases.error;

if (
  existingScheme.data &&
  ["validated", "active"].includes(existingScheme.data.status)
) {
  throw new Error(
    `Refusing to overwrite ${codeSchemeVersion} in ${existingScheme.data.status} state.`,
  );
}
for (const release of existingReleases.data ?? []) {
  if (["validated", "active"].includes(release.status)) {
    throw new Error(
      `Refusing to overwrite ${release.item_bank_release_id} in ${release.status} state.`,
    );
  }
}

const betaByOpaqueId = new Map(
  beta.items.map((item) => [item.source_opaque_item_id, item]),
);
const revisionRows = candidates.map((item) => {
  const betaItem = betaByOpaqueId.get(item.opaque_item_id);
  return {
    candidate_status: item.candidate_status,
    context_label: item.context_label,
    domain_id: item.target_domain,
    evidence_role: item.evidence_role,
    facet_id: item.target_facet,
    item_revision_id: item.opaque_item_id,
    keyed_direction: item.keyed_direction,
    metadata: {
      betaInternalReviewDecision: betaItem?.internal_review_decision ?? null,
      pairKey: item.pair_key || null,
      selectedForBeta: Boolean(betaItem),
      situationBucket: item.situation_bucket || null,
      targetResponseProcess: item.target_response_process || null,
      wordingPolarity: item.wording_polarity || null,
    },
    prompt_text: item.prompt_text,
    response_layer: item.response_layer,
    score_role: item.score_role,
    source_candidate_id: item.candidate_id,
    source_file: item.source_file,
  };
});
const candidateMemberRows = candidates.map((item, index) => ({
  item_bank_release_id: candidateReleaseId,
  item_id: item.candidate_id,
  item_revision_id: item.opaque_item_id,
  order_index: index + 1,
  scoring_key: item.keyed_direction === "HIGH" ? "direct" : "reverse",
}));
const betaMemberRows = beta.items.map((item, index) => ({
  item_bank_release_id: betaReleaseId,
  item_id: item.item_id,
  item_revision_id: item.source_opaque_item_id,
  order_index: index + 1,
  scoring_key: item.scoring_key,
}));

if (apply) {
  await upsertOrThrow(
    scoring,
    "code_scheme_release",
    [
      {
        code_scheme_version: codeSchemeVersion,
        notes:
          "Owner-approved design contract. Candidate only; not authorized for customer scoring.",
        positions: [
          {
            codePosition: 1,
            domainId: "SE",
            highSymbol: "E",
            label: "사람 사이 에너지",
            lowSymbol: "I",
          },
          {
            codePosition: 2,
            domainId: "OE",
            highSymbol: "N",
            label: "생각과 탐색",
            lowSymbol: "R",
          },
          {
            codePosition: 3,
            domainId: "RO",
            highSymbol: "A",
            label: "관계에서 먼저 보는 것",
            lowSymbol: "G",
          },
          {
            codePosition: 4,
            domainId: "SM",
            highSymbol: "K",
            label: "일상을 꾸리는 방식",
            lowSymbol: "M",
          },
          {
            codePosition: 5,
            domainId: "ER",
            highSymbol: "Q",
            label: "걱정과 감정 반응",
            lowSymbol: "C",
          },
        ],
        status: "candidate",
        validation_gates: {
          cognitive_review: "not_started",
          quantitative_pilot: "not_started",
          reliability_and_structure: "not_started",
        },
      },
    ],
    "code_scheme_version",
  );
  await upsertOrThrow(
    assessment,
    "item_bank_release",
    [
      {
        code_scheme_version: codeSchemeVersion,
        item_bank_release_id: candidateReleaseId,
        item_count: 150,
        metadata: {
          customer_scoring: false,
          purpose: "full candidate inventory",
        },
        source_protocol_version: "m04-core-expert-kit.v0.1",
        status: "candidate",
        validation_gates: {
          cognitive_review: "not_started",
          quantitative_pilot: "not_started",
          reliability_and_structure: "not_started",
        },
      },
      {
        code_scheme_version: codeSchemeVersion,
        item_bank_release_id: betaReleaseId,
        item_count: 60,
        metadata: {
          customerScoring: "provisional_only",
          purpose: "MVP beta response collection",
          selectionRule: beta.selection_rule,
        },
        source_protocol_version: "m04-core-expert-kit.v0.1-internal-critique",
        status: "beta",
        validation_gates: {
          cognitive_review: "not_started",
          quantitative_pilot: "not_started",
          reliability_and_structure: "not_started",
        },
      },
    ],
    "item_bank_release_id",
  );

  for (const batch of chunks(revisionRows, 50)) {
    await upsertOrThrow(assessment, "item_revision", batch, "item_revision_id");
  }
  for (const batch of chunks([...candidateMemberRows, ...betaMemberRows], 50)) {
    await upsertOrThrow(
      assessment,
      "item_release_member",
      batch,
      "item_bank_release_id,item_revision_id",
    );
  }
}

const [candidateCount, betaCount, revisionCount] = await Promise.all([
  countMembers(candidateReleaseId),
  countMembers(betaReleaseId),
  assessment
    .from("item_revision")
    .select("item_revision_id", { count: "exact", head: true }),
]);
if (revisionCount.error) throw revisionCount.error;

const result = {
  betaMembers: betaCount,
  candidateMembers: candidateCount,
  expectedBetaMembers: 60,
  expectedCandidateMembers: 150,
  expectedRevisions: 150,
  mode: apply ? "applied" : "check",
  revisionCount: revisionCount.count ?? 0,
};
console.log(JSON.stringify(result, null, 2));

if (
  result.candidateMembers !== result.expectedCandidateMembers ||
  result.betaMembers !== result.expectedBetaMembers ||
  result.revisionCount < result.expectedRevisions
) {
  process.exitCode = 1;
}

async function countMembers(releaseId) {
  const response = await assessment
    .from("item_release_member")
    .select("item_revision_id", { count: "exact", head: true })
    .eq("item_bank_release_id", releaseId);
  if (response.error) throw response.error;
  return response.count ?? 0;
}

async function upsertOrThrow(schema, table, rows, onConflict) {
  const response = await schema
    .from(table)
    .upsert(rows, { onConflict, ignoreDuplicates: false });
  if (response.error) throw response.error;
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function readEnv(filePath) {
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        const value = line.slice(separator + 1).trim();
        return [
          line.slice(0, separator),
          value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"),
        ];
      }),
  );
}

function readCsvObjects(filePath) {
  const [header, ...rows] = parseCsv(fs.readFileSync(filePath, "utf8"));
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) =>
      Object.fromEntries(
        header.map((column, index) => [column, row[index] ?? ""]),
      ),
    );
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  return rows;
}
