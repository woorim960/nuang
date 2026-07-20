import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes("--apply");
const currentCodePattern = /^[EI][RN][GA][KM][CQ]$/;
const snapshotContractVersion = "public-profile-snapshot.v0.1";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const [reportResponse, snapshotResponse] = await Promise.all([
  client
    .schema("report")
    .from("result_report")
    .select(
      "id,account_id,report_kind,profile_code,profile_name,summary,created_at",
    )
    .eq("report_kind", "full")
    .is("deleted_at", null)
    .order("created_at", { ascending: false }),
  client
    .schema("profile")
    .from("profile_public_snapshot")
    .select(
      "id,account_id,result_report_id,visibility_policy_version,snapshot_payload,status,created_at",
    )
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false }),
]);

if (reportResponse.error) throw reportResponse.error;
if (snapshotResponse.error) throw snapshotResponse.error;

const latestCurrentReportByAccount = new Map();
for (const report of reportResponse.data ?? []) {
  if (
    currentCodePattern.test(report.profile_code) &&
    !latestCurrentReportByAccount.has(report.account_id)
  ) {
    latestCurrentReportByAccount.set(report.account_id, report);
  }
}

const activeSnapshotsByAccount = new Map();
for (const snapshot of snapshotResponse.data ?? []) {
  const snapshots = activeSnapshotsByAccount.get(snapshot.account_id) ?? [];
  snapshots.push(snapshot);
  activeSnapshotsByAccount.set(snapshot.account_id, snapshots);
}

const plans = [];
for (const [accountId, report] of latestCurrentReportByAccount) {
  const activeSnapshots = activeSnapshotsByAccount.get(accountId) ?? [];
  if (activeSnapshots.length === 0) continue;

  const alreadyCurrent = activeSnapshots.some(
    (snapshot) =>
      snapshot.result_report_id === report.id &&
      currentCodePattern.test(snapshot.snapshot_payload?.profile?.code ?? ""),
  );
  if (alreadyCurrent) continue;

  const sourceSnapshot = activeSnapshots[0];
  const sourcePayload = sourceSnapshot.snapshot_payload;
  const summary = normalizeSummary(report.summary);
  if (
    !sourcePayload?.displayProfile?.displayName ||
    !sourcePayload.displayProfile.motif
  ) {
    continue;
  }

  const createdAt = new Date().toISOString();
  const snapshotId = randomUUID();
  const payload = {
    contractVersion: snapshotContractVersion,
    createdAt,
    displayProfile: sourcePayload.displayProfile,
    privacy: sourcePayload.privacy ?? defaultPrivacy(),
    profile: {
      code: report.profile_code,
      name: report.profile_name,
    },
    publicData: {
      coreDomainMap: summary.domains.map((domain) => ({
        id: domain.domainId,
        isBoundary: false,
        label: domain.label,
        score: domain.score,
        status: domain.score === null ? "insufficient" : "valid",
        symbol: domain.symbol ?? null,
      })),
      coreFacetSummary: summary.facets.map((facet) => ({
        id: facet.facetId,
        label: facet.label,
        score: facet.score,
        status:
          facet.status ?? (facet.score === null ? "insufficient" : "valid"),
      })),
    },
    snapshotId,
    visibility: sourcePayload.visibility ?? {
      includedFields: [],
      policyVersion: sourceSnapshot.visibility_policy_version,
    },
  };

  plans.push({
    accountId,
    activeSnapshotIds: activeSnapshots.map((snapshot) => snapshot.id),
    fromCodes: activeSnapshots.map(
      (snapshot) => snapshot.snapshot_payload?.profile?.code ?? "unknown",
    ),
    payload,
    reportId: report.id,
    snapshotId,
    toCode: report.profile_code,
    visibilityPolicyVersion: sourceSnapshot.visibility_policy_version,
  });
}

console.log(
  JSON.stringify(
    {
      applyChanges,
      planCount: plans.length,
      plans: plans.map(
        ({ accountId, activeSnapshotIds, fromCodes, toCode }) => ({
          accountId,
          activeSnapshotIds,
          fromCodes,
          toCode,
        }),
      ),
    },
    null,
    2,
  ),
);

if (!applyChanges) process.exit(0);

for (const plan of plans) {
  const inserted = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .insert({
      account_id: plan.accountId,
      id: plan.snapshotId,
      published_at: plan.payload.createdAt,
      result_report_id: plan.reportId,
      snapshot_payload: plan.payload,
      status: "active",
      visibility_policy_version: plan.visibilityPolicyVersion,
    });
  if (inserted.error) throw inserted.error;

  const retired = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .update({ revoked_at: plan.payload.createdAt, status: "stale" })
    .eq("account_id", plan.accountId)
    .eq("status", "active")
    .neq("id", plan.snapshotId);
  if (retired.error) throw retired.error;

  const audit = await client
    .schema("audit")
    .from("visibility_audit_event")
    .insert({
      account_id: plan.accountId,
      actor_account_id: plan.accountId,
      event_type: "public_snapshot_created",
      metadata: {
        migration: "current-code-public-profile-rebase.v1",
        previousSnapshotIds: plan.activeSnapshotIds,
        profileCode: plan.toCode,
        resultReportId: plan.reportId,
      },
      target_id: plan.snapshotId,
      target_table: "profile.profile_public_snapshot",
    });
  if (audit.error) throw audit.error;
}

console.log(JSON.stringify({ applied: plans.length, ok: true }));

function normalizeSummary(value) {
  if (!value || typeof value !== "object") return { domains: [], facets: [] };
  return {
    domains: Array.isArray(value.domains) ? value.domains.slice(0, 5) : [],
    facets: Array.isArray(value.facets) ? value.facets.slice(0, 10) : [],
  };
}

function defaultPrivacy() {
  return {
    includesAccountIdentity: false,
    includesCrisisHelpInteractions: false,
    includesDirectResponses: false,
    includesRawScorePayload: false,
    includesSensitiveAssessments: false,
  };
}
