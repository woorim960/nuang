import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  mergeCommunityProfileIntoSnapshot,
  readCommunityProfileForAccount,
} from "@/features/account/server-community-profile";
import { getNuangProfileCharacterRule } from "@/components/character/nuang-profile-character-system";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import { createCharacterProfileImage } from "@/features/public-profile/profile-image";
import { parseStoredAccountResultSummary } from "@/features/account/account-result-contract";
import type { AccountComparisonReportSummary } from "@/features/account/account-result-contract";
import {
  createPublicComparisonReportPayload,
  createPublicProfileSnapshotPayload,
  hasRequiredPublicComparisonScope,
  publicComparisonCopyVersion,
  publicComparisonFacetModelVersion,
  publicComparisonReportContractVersion,
  publicProfileSnapshotContractVersion,
  type PublicComparisonFailureCode,
  type PublicComparisonReportPayload,
  type PublicProfileSnapshotPayload,
} from "@/features/together/public-comparison-contract";
import type {
  PublicComparisonLookupFailureCode,
  PublicComparisonAccessStatus,
} from "@/features/together/public-comparison-lookup-contract";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";
import type { CoreScoreResult } from "@/lib/scoring/types";

type ServiceClient = SupabaseClient;

type AccountResultReportRow = {
  account_id: string;
  created_at: string;
  id: string;
  profile_code: string;
  profile_name: string;
  report_kind: "full" | "quick";
  summary: unknown;
};

type PublicProfileSnapshotRow = {
  account_id: string;
  id: string;
  result_report_id: string;
  snapshot_payload: unknown;
  status: "active" | "deleted" | "private" | "stale";
  visibility_policy_version: string;
};

type PublicComparisonReportRow = {
  access_status: PublicComparisonAccessStatus;
  created_at?: string;
  id: string;
  report_payload: unknown;
  target_public_snapshot_id: string;
  viewer_account_id: string;
  viewer_public_snapshot_id: string | null;
};

export type CreatePublicComparisonServerResult =
  | {
      data: {
        comparisonReportId: string;
        report: PublicComparisonReportPayload;
      };
      ok: true;
    }
  | {
      code: PublicComparisonFailureCode;
      ok: false;
    };

export type ReadPublicComparisonServerResult =
  | {
      data: PublicComparisonReportPayload;
      ok: true;
    }
  | {
      code: PublicComparisonLookupFailureCode;
      ok: false;
    };

export type ListPublicComparisonServerResult =
  | {
      data: AccountComparisonReportSummary[];
      ok: true;
    }
  | {
      code: "comparison_report_lookup_failed";
      ok: false;
    };

export type DeletePublicComparisonServerResult =
  | {
      data: {
        comparisonReportId: string;
        deleted: true;
      };
      ok: true;
    }
  | {
      code: PublicComparisonLookupFailureCode;
      ok: false;
    };

export async function createPublicComparisonForUser({
  client,
  targetPublicSnapshotId,
  user,
  viewerResultReportId,
}: {
  client: ServiceClient;
  targetPublicSnapshotId: string;
  user: User;
  viewerResultReportId?: string;
}): Promise<CreatePublicComparisonServerResult> {
  const accountId = await readAccountIdForUser(client, user);

  if (!accountId) {
    return { code: "viewer_full_core_missing", ok: false };
  }

  const [viewerReport, targetSnapshotRow] = await Promise.all([
    readViewerFullCoreReport({
      accountId,
      client,
      resultReportId: viewerResultReportId,
    }),
    readTargetPublicSnapshot({
      client,
      publicSnapshotId: targetPublicSnapshotId,
    }),
  ]);

  if (!viewerReport) {
    return { code: "viewer_full_core_missing", ok: false };
  }

  if (!targetSnapshotRow) {
    return { code: "target_public_snapshot_missing", ok: false };
  }

  if (targetSnapshotRow.status !== "active") {
    return { code: "target_public_snapshot_not_active", ok: false };
  }

  const targetComparisonEnabled = await readCommunityComparisonEnabled({
    accountId: targetSnapshotRow.account_id,
    client,
  });
  if (!targetComparisonEnabled) {
    return { code: "target_comparison_scope_missing", ok: false };
  }

  if (
    targetSnapshotRow.visibility_policy_version !==
    profileVisibilityPolicyVersion
  ) {
    return { code: "snapshot_policy_version_mismatch", ok: false };
  }

  const targetSnapshotBase = coercePublicProfileSnapshotPayload(
    targetSnapshotRow.snapshot_payload,
    targetSnapshotRow.id,
  );

  if (!targetSnapshotBase) {
    return { code: "target_public_snapshot_missing", ok: false };
  }

  const targetSnapshot = await mergeCommunityProfileIntoSnapshot({
    client,
    profile: await readCommunityProfileForAccount({
      accountId: targetSnapshotRow.account_id,
      client,
    }),
    snapshot: targetSnapshotBase,
  });

  const viewerSnapshot = await readOrCreateViewerPublicSnapshot({
    accountId,
    client,
    report: viewerReport,
    user,
  });

  if (!viewerSnapshot) {
    return { code: "comparison_report_build_failed", ok: false };
  }

  const viewerPayload = await mergeCommunityProfileIntoSnapshot({
    client,
    profile: await readCommunityProfileForAccount({ accountId, client }),
    snapshot: viewerSnapshot.payload,
  });

  if (!hasRequiredPublicComparisonScope(viewerPayload)) {
    return { code: "viewer_comparison_scope_missing", ok: false };
  }

  if (!hasRequiredPublicComparisonScope(targetSnapshot)) {
    return { code: "target_comparison_scope_missing", ok: false };
  }

  const comparisonReportId = crypto.randomUUID();
  const report = createPublicComparisonReportPayload({
    comparisonId: comparisonReportId,
    createdAt: new Date().toISOString(),
    target: targetSnapshot,
    viewer: viewerPayload,
  });
  const insertResponse = await client
    .schema("comparison")
    .from("public_comparison_report")
    .insert({
      id: comparisonReportId,
      policy_version: profileVisibilityPolicyVersion,
      report_payload: report,
      target_public_snapshot_id: targetSnapshotRow.id,
      viewer_account_id: accountId,
      viewer_public_snapshot_id: viewerSnapshot.id,
      viewer_result_report_id: viewerReport.id,
    })
    .select("id")
    .single();

  if (insertResponse.error || !insertResponse.data) {
    return { code: "comparison_report_build_failed", ok: false };
  }

  const auditResponse = await client
    .schema("audit")
    .from("visibility_audit_event")
    .insert({
      account_id: targetSnapshotRow.account_id,
      actor_account_id: accountId,
      event_type: "public_comparison_created",
      metadata: {
        comparisonReportId,
        policyVersion: profileVisibilityPolicyVersion,
      },
      target_id: targetSnapshotRow.id,
      target_table: "profile.profile_public_snapshot",
    })
    .select("id")
    .single();

  if (auditResponse.error || !auditResponse.data) {
    return { code: "comparison_audit_write_failed", ok: false };
  }

  return {
    data: {
      comparisonReportId,
      report,
    },
    ok: true,
  };
}

async function readCommunityComparisonEnabled({
  accountId,
  client,
}: {
  accountId: string;
  client: ServiceClient;
}) {
  const response = await client
    .schema("profile")
    .from("community_profile")
    .select("comparison_enabled")
    .eq("account_id", accountId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  // Existing profiles created before the community profile migration keep the
  // previous comparison behavior until the backfill runs.
  if (response.error || !response.data) return true;
  return response.data.comparison_enabled !== false;
}

export async function readPublicComparisonForUser({
  client,
  comparisonReportId,
  user,
}: {
  client: ServiceClient;
  comparisonReportId: string;
  user: User;
}): Promise<ReadPublicComparisonServerResult> {
  const accountId = await readAccountIdForUser(client, user);

  if (!accountId) {
    return { code: "comparison_report_not_owned", ok: false };
  }

  const response = await client
    .schema("comparison")
    .from("public_comparison_report")
    .select(
      "id, viewer_account_id, viewer_public_snapshot_id, target_public_snapshot_id, access_status, report_payload",
    )
    .eq("id", comparisonReportId)
    .is("deleted_at", null)
    .maybeSingle();

  if (response.error) {
    return { code: "comparison_report_lookup_failed", ok: false };
  }

  if (!response.data) {
    return { code: "comparison_report_not_found", ok: false };
  }

  const row = response.data as PublicComparisonReportRow;

  if (row.viewer_account_id !== accountId) {
    return { code: "comparison_report_not_owned", ok: false };
  }

  if (row.access_status !== "active") {
    return {
      code: accessStatusToLookupFailure(row.access_status),
      ok: false,
    };
  }

  const report = coercePublicComparisonReportPayload(row.report_payload);

  if (!report) {
    return { code: "comparison_report_lookup_failed", ok: false };
  }

  const refreshedReport = await refreshComparisonReportIfNeeded({
    client,
    report,
    row,
  });

  return { data: refreshedReport ?? report, ok: true };
}

export async function listPublicComparisonsForUser({
  client,
  limit = 30,
  user,
}: {
  client: ServiceClient;
  limit?: number;
  user: User;
}): Promise<ListPublicComparisonServerResult> {
  const accountId = await readAccountIdForUser(client, user);

  if (!accountId) {
    return { data: [], ok: true };
  }

  const response = await client
    .schema("comparison")
    .from("public_comparison_report")
    .select("id, access_status, created_at, report_payload")
    .eq("viewer_account_id", accountId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (response.error) {
    return { code: "comparison_report_lookup_failed", ok: false };
  }

  return {
    data: ((response.data ?? []) as PublicComparisonReportRow[]).flatMap(
      toAccountComparisonReportSummary,
    ),
    ok: true,
  };
}

export async function deletePublicComparisonForUser({
  client,
  comparisonReportId,
  user,
}: {
  client: ServiceClient;
  comparisonReportId: string;
  user: User;
}): Promise<DeletePublicComparisonServerResult> {
  const accountId = await readAccountIdForUser(client, user);

  if (!accountId) {
    return { code: "comparison_report_not_owned", ok: false };
  }

  const response = await client
    .schema("comparison")
    .from("public_comparison_report")
    .update({
      access_status: "deleted",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", comparisonReportId)
    .eq("viewer_account_id", accountId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (response.error) {
    return { code: "comparison_report_lookup_failed", ok: false };
  }

  if (!response.data) {
    return { code: "comparison_report_not_found", ok: false };
  }

  return {
    data: {
      comparisonReportId,
      deleted: true,
    },
    ok: true,
  };
}

async function readAccountIdForUser(client: ServiceClient, user: User) {
  const response = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (response.error || !response.data) {
    return null;
  }

  return (response.data as { account_id: string }).account_id;
}

async function readViewerFullCoreReport({
  accountId,
  client,
  resultReportId,
}: {
  accountId: string;
  client: ServiceClient;
  resultReportId?: string;
}) {
  let query = client
    .schema("report")
    .from("result_report")
    .select(
      "id, account_id, report_kind, profile_code, profile_name, summary, created_at",
    )
    .eq("account_id", accountId)
    .eq("report_kind", "full")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (resultReportId) {
    query = query.eq("id", resultReportId);
  }

  const response = await query.maybeSingle();

  if (response.error || !response.data) {
    return null;
  }
  const report = response.data as AccountResultReportRow;
  return getCandidateProfileDefinition(report.profile_code) ? report : null;
}

async function readTargetPublicSnapshot({
  client,
  publicSnapshotId,
}: {
  client: ServiceClient;
  publicSnapshotId: string;
}) {
  const response = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select(
      "id, account_id, result_report_id, visibility_policy_version, snapshot_payload, status",
    )
    .eq("id", publicSnapshotId)
    .is("deleted_at", null)
    .maybeSingle();

  if (response.error || !response.data) {
    return null;
  }

  return response.data as PublicProfileSnapshotRow;
}

async function readOrCreateViewerPublicSnapshot({
  accountId,
  client,
  report,
  user,
}: {
  accountId: string;
  client: ServiceClient;
  report: AccountResultReportRow;
  user: User;
}) {
  const existingResponse = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("id, snapshot_payload")
    .eq("account_id", accountId)
    .eq("result_report_id", report.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existingResponse.error && existingResponse.data) {
    const row = existingResponse.data as {
      id: string;
      snapshot_payload: unknown;
    };
    const payload = coercePublicProfileSnapshotPayload(
      row.snapshot_payload,
      row.id,
    );

    if (payload) {
      return {
        id: row.id,
        payload,
      };
    }
  }

  const snapshotId = crypto.randomUUID();
  const payload = createPublicProfileSnapshotPayload({
    createdAt: new Date().toISOString(),
    displayProfile: {
      displayName: getDisplayName(user),
      motif: getMotif(report.profile_code),
    },
    result: reportRowToCoreScoreResult(report),
    snapshotId,
  });
  const insertResponse = await client
    .schema("profile")
    .from("profile_public_snapshot")
    .insert({
      account_id: accountId,
      id: snapshotId,
      published_at: new Date().toISOString(),
      result_report_id: report.id,
      snapshot_payload: payload,
      status: "active",
      visibility_policy_version: profileVisibilityPolicyVersion,
    })
    .select("id")
    .single();

  if (insertResponse.error || !insertResponse.data) {
    return null;
  }

  return {
    id: snapshotId,
    payload,
  };
}

function coercePublicProfileSnapshotPayload(
  value: unknown,
  fallbackSnapshotId: string,
): PublicProfileSnapshotPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const snapshot = value as PublicProfileSnapshotPayload;

  if (
    snapshot.contractVersion !== publicProfileSnapshotContractVersion ||
    !snapshot.displayProfile?.displayName ||
    !snapshot.displayProfile?.motif ||
    !snapshot.profile?.code ||
    !snapshot.profile?.name ||
    !Array.isArray(snapshot.publicData?.coreDomainMap) ||
    !getCandidateProfileDefinition(snapshot.profile.code)
  ) {
    return null;
  }

  return {
    ...snapshot,
    displayProfile: {
      ...snapshot.displayProfile,
      profileImage:
        snapshot.displayProfile.profileImage ??
        createCharacterProfileImage({
          alt: `${snapshot.displayProfile.displayName} 프로필 이미지`,
          motif: snapshot.displayProfile.motif,
        }),
    },
    snapshotId: snapshot.snapshotId || fallbackSnapshotId,
  };
}

function coercePublicComparisonReportPayload(
  value: unknown,
): PublicComparisonReportPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const report = value as PublicComparisonReportPayload;

  if (report.ok !== true || !report.comparison?.id) {
    return null;
  }

  if (
    !isSupportedPublicComparisonReportVersion(report.comparison.contractVersion)
  ) {
    return null;
  }

  return report;
}

function toAccountComparisonReportSummary(
  row: PublicComparisonReportRow,
): AccountComparisonReportSummary[] {
  const report = coercePublicComparisonReportPayload(row.report_payload);

  if (!report) return [];

  return [
    {
      accessStatus: row.access_status,
      comparisonReportId: row.id,
      createdAt: row.created_at ?? report.comparison.createdAt,
      headline:
        report.comparison.sections.summary?.headline ?? "뉴앙 코드 비교 리포트",
      targetCode: report.comparison.target.code,
      targetDisplayName: report.comparison.target.displayName,
      targetProfileName: report.comparison.target.profileName,
      viewerCode: report.comparison.viewer.code,
      viewerProfileName: report.comparison.viewer.profileName,
    },
  ];
}

function isSupportedPublicComparisonReportVersion(version: unknown) {
  return (
    version === publicComparisonReportContractVersion ||
    version === "public-comparison-report.v0.1"
  );
}

async function refreshComparisonReportIfNeeded({
  client,
  report,
  row,
}: {
  client: ServiceClient;
  report: PublicComparisonReportPayload;
  row: PublicComparisonReportRow;
}) {
  if (
    !shouldRefreshComparisonReport(report) ||
    !row.viewer_public_snapshot_id
  ) {
    return null;
  }

  const [viewerSnapshotRow, targetSnapshotRow] = await Promise.all([
    readTargetPublicSnapshot({
      client,
      publicSnapshotId: row.viewer_public_snapshot_id,
    }),
    readTargetPublicSnapshot({
      client,
      publicSnapshotId: row.target_public_snapshot_id,
    }),
  ]);

  if (!viewerSnapshotRow || !targetSnapshotRow) {
    return null;
  }

  const viewerSnapshot = coercePublicProfileSnapshotPayload(
    viewerSnapshotRow.snapshot_payload,
    viewerSnapshotRow.id,
  );
  const targetSnapshot = coercePublicProfileSnapshotPayload(
    targetSnapshotRow.snapshot_payload,
    targetSnapshotRow.id,
  );

  if (!viewerSnapshot || !targetSnapshot) {
    return null;
  }

  const refreshedReport = createPublicComparisonReportPayload({
    comparisonId: report.comparison.id,
    createdAt: report.comparison.createdAt,
    target: targetSnapshot,
    viewer: viewerSnapshot,
  });

  await client
    .schema("comparison")
    .from("public_comparison_report")
    .update({
      report_payload: refreshedReport,
    })
    .eq("id", row.id);

  return refreshedReport;
}

function shouldRefreshComparisonReport(report: PublicComparisonReportPayload) {
  const sections = report.comparison.sections;
  const headline = sections.summary?.headline ?? "";

  return (
    report.comparison.contractVersion !==
      publicComparisonReportContractVersion ||
    report.comparison.model?.copyVersion !== publicComparisonCopyVersion ||
    report.comparison.model?.facetModelVersion !==
      publicComparisonFacetModelVersion ||
    !Array.isArray(sections.axisComparisons) ||
    sections.axisComparisons.length === 0 ||
    !Array.isArray(sections.facetComparisons) ||
    (sections.commonGround.length === 0 && sections.differences.length === 0) ||
    !sections.summary ||
    headline.includes("는 가까워지고")
  );
}

function reportRowToCoreScoreResult(
  row: AccountResultReportRow,
): CoreScoreResult {
  const parsedSummary = parseStoredAccountResultSummary(row.summary);
  const summary = parsedSummary.success
    ? parsedSummary.data
    : {
        domains: [],
        facets: [],
      };

  return {
    alternativeCodes: [],
    code: row.profile_code,
    domains: summary.domains.map((domain) => ({
      domainId: domain.domainId,
      isBoundary: false,
      label: domain.label,
      score: domain.score,
      status: domain.score === null ? "insufficient" : "valid",
      symbol: domain.symbol ?? null,
    })),
    facets: summary.facets.map((facet) => ({
      facetId: facet.facetId,
      label: facet.label,
      score: facet.score,
      status: facet.status ?? (facet.score === null ? "insufficient" : "valid"),
      validResponses: 0,
    })),
    profileName: row.profile_name,
  };
}

function getDisplayName(user: User) {
  const metadata = user.user_metadata ?? {};
  const name = metadata.name ?? metadata.full_name ?? metadata.nickname;

  return typeof name === "string" && name.trim() ? name.trim() : "나";
}

function getMotif(profileCode: string) {
  return getNuangProfileCharacterRule(profileCode)?.motif ?? "purple";
}

function accessStatusToLookupFailure(
  status: Exclude<PublicComparisonAccessStatus, "active">,
): PublicComparisonLookupFailureCode {
  if (status === "stale") return "comparison_report_stale";
  if (status === "disabled") return "comparison_report_disabled";
  return "comparison_report_deleted";
}
