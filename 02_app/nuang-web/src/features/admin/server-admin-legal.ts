import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  legalOfficialReferences,
  legalReleaseKey,
  legalReviewDefinitions,
  type LegalReleaseStatus,
  type LegalReviewStatus,
} from "@/features/admin/legal-review-contract";
import {
  policySkeletons,
  policySkeletonVersion,
} from "@/features/policy/policy-skeleton";

export type AdminLegalReviewItem = {
  category: "privacy" | "research" | "terms";
  evidenceHint: string;
  evidenceRef: string;
  itemKey: string;
  note: string;
  ownerLabel: string;
  ownerRole: string;
  question: string;
  required: boolean;
  reviewedAt: string | null;
  status: LegalReviewStatus;
  title: string;
};

export type AdminLegalDashboard = {
  available: boolean;
  documents: Array<{
    effectiveDate: string;
    href: string;
    id: "privacy" | "terms";
    sections: Array<{ items: string[]; title: string }>;
    title: string;
    version: string;
  }>;
  environment: Array<{
    detail: string;
    key: string;
    label: string;
    ready: boolean;
  }>;
  generatedAt: string;
  items: AdminLegalReviewItem[];
  references: Array<{ href: string; label: string }>;
  release: {
    approvalEvidenceRef: string;
    approvedAt: string | null;
    approvedByLabel: string;
    changeSummary: string;
    id: string;
    ownerLabel: string;
    policyVersion: string;
    privacyVersion: string;
    releaseKey: string;
    reviewerLabel: string;
    sourceCommitSha: string;
    status: LegalReleaseStatus;
    termsVersion: string;
    updatedAt: string | null;
  };
  unavailableReason: string | null;
};

type ReleaseRow = {
  approval_evidence_ref?: unknown;
  approved_at?: unknown;
  approved_by_label?: unknown;
  change_summary?: unknown;
  id?: unknown;
  owner_label?: unknown;
  policy_version?: unknown;
  privacy_version?: unknown;
  release_key?: unknown;
  reviewer_label?: unknown;
  source_commit_sha?: unknown;
  status?: unknown;
  terms_version?: unknown;
  updated_at?: unknown;
};

type ItemRow = {
  evidence_ref?: unknown;
  item_key?: unknown;
  note?: unknown;
  owner_label?: unknown;
  reviewed_at?: unknown;
  status?: unknown;
};

export async function readAdminLegalDashboard(
  client: SupabaseClient,
): Promise<AdminLegalDashboard> {
  const releaseResponse = await client
    .from("admin_legal_release")
    .select(
      "id,release_key,policy_version,terms_version,privacy_version,status,owner_label,reviewer_label,source_commit_sha,approval_evidence_ref,approved_by_label,approved_at,change_summary,updated_at",
    )
    .eq("release_key", legalReleaseKey)
    .maybeSingle();

  if (releaseResponse.error || !releaseResponse.data) {
    return createFallbackDashboard(
      isMissingLegalStore(releaseResponse.error?.code)
        ? "법률 검토 저장소를 준비해야 합니다. 최신 DB 마이그레이션을 적용하면 항목별 상태와 승인 증빙을 저장할 수 있습니다."
        : "법률 검토 기록을 불러오지 못했습니다. 데이터베이스 연결과 관리자 권한을 확인해 주세요.",
    );
  }

  const release = normalizeRelease(releaseResponse.data as ReleaseRow);
  const itemResponse = await client
    .from("admin_legal_review_item")
    .select("item_key,status,owner_label,evidence_ref,note,reviewed_at")
    .eq("release_id", release.id)
    .order("item_key", { ascending: true });

  if (itemResponse.error) {
    return createFallbackDashboard(
      "법률 검토 세부 항목을 불러오지 못했습니다. 저장소 스키마를 확인해 주세요.",
    );
  }

  const rows = new Map(
    ((itemResponse.data ?? []) as ItemRow[]).map((row) => [
      text(row.item_key),
      row,
    ]),
  );

  return {
    ...createBaseDashboard(),
    available: true,
    items: legalReviewDefinitions.map((definition) => {
      const row = rows.get(definition.itemKey);
      return {
        ...definition,
        evidenceRef: text(row?.evidence_ref),
        note: text(row?.note),
        ownerLabel: text(row?.owner_label),
        reviewedAt: nullableText(row?.reviewed_at),
        status: legalReviewStatus(row?.status),
      };
    }),
    release,
    unavailableReason: null,
  };
}

function createFallbackDashboard(reason: string): AdminLegalDashboard {
  return {
    ...createBaseDashboard(),
    available: false,
    items: legalReviewDefinitions.map((definition) => ({
      ...definition,
      evidenceRef: "",
      note: "",
      ownerLabel: "",
      reviewedAt: null,
      status: "pending",
    })),
    release: {
      approvalEvidenceRef: "",
      approvedAt: null,
      approvedByLabel: "",
      changeSummary: "",
      id: "unavailable",
      ownerLabel: "",
      policyVersion: policySkeletonVersion,
      privacyVersion: policySkeletonVersion,
      releaseKey: legalReleaseKey,
      reviewerLabel: "",
      sourceCommitSha: readSourceCommit(),
      status: "draft",
      termsVersion: policySkeletonVersion,
      updatedAt: null,
    },
    unavailableReason: reason,
  };
}

function createBaseDashboard() {
  return {
    documents: [
      {
        effectiveDate: policySkeletons.terms.effectiveDate,
        href: "/policies/terms",
        id: "terms" as const,
        sections: policySkeletons.terms.sections,
        title: policySkeletons.terms.title,
        version: policySkeletonVersion,
      },
      {
        effectiveDate: policySkeletons.privacy.effectiveDate,
        href: "/policies/privacy",
        id: "privacy" as const,
        sections: policySkeletons.privacy.sections,
        title: policySkeletons.privacy.title,
        version: policySkeletonVersion,
      },
    ],
    environment: [
      envFact(
        "operator",
        "서비스 운영자 표시명",
        "LEGAL_OPERATOR_NAME",
        "약관의 실제 계약·운영 주체와 대조하세요.",
      ),
      envFact(
        "business-name",
        "상호",
        "LEGAL_BUSINESS_NAME",
        "사업자등록증의 상호와 대조하세요.",
      ),
      envFact(
        "representative-name",
        "대표자",
        "LEGAL_REPRESENTATIVE_NAME",
        "사업자등록증의 대표자와 대조하세요.",
      ),
      envFact(
        "business-registration-number",
        "사업자등록번호",
        "LEGAL_BUSINESS_REGISTRATION_NUMBER",
        "공개 정책의 사업자등록번호와 대조하세요.",
      ),
      envFact(
        "support-response-window",
        "문의 답변 기간",
        "LEGAL_SUPPORT_RESPONSE_WINDOW",
        "실제 문의 운영 기준과 대조하세요.",
      ),
      envFact(
        "privacy-contact",
        "개인정보 문의처",
        "PRIVACY_CONTACT_EMAIL",
        "실제로 확인하고 답변할 수 있는 주소인지 시험하세요.",
      ),
      envFact(
        "data-region",
        "주요 데이터 지역",
        "SUPABASE_DATA_REGION",
        "Supabase 계약·프로젝트 설정과 국외 처리 문구를 대조하세요.",
      ),
      envFact(
        "policy-origin",
        "정책의 서비스 웹사이트",
        "LEGAL_SERVICE_ORIGIN",
        "정책에 공개할 nuang.app 주소와 대조하세요.",
      ),
      envFact(
        "app-origin",
        "OAuth 운영 origin",
        "NEXT_PUBLIC_APP_ORIGIN",
        "OAuth callback의 운영 도메인과 대조하세요.",
      ),
    ],
    generatedAt: new Date().toISOString(),
    references: legalOfficialReferences.map((reference) => ({ ...reference })),
  };
}

function normalizeRelease(row: ReleaseRow): AdminLegalDashboard["release"] {
  return {
    approvalEvidenceRef: text(row.approval_evidence_ref),
    approvedAt: nullableText(row.approved_at),
    approvedByLabel: text(row.approved_by_label),
    changeSummary: text(row.change_summary),
    id: text(row.id),
    ownerLabel: text(row.owner_label),
    policyVersion: text(row.policy_version) || policySkeletonVersion,
    privacyVersion: text(row.privacy_version) || policySkeletonVersion,
    releaseKey: text(row.release_key) || legalReleaseKey,
    reviewerLabel: text(row.reviewer_label),
    sourceCommitSha: text(row.source_commit_sha) || readSourceCommit(),
    status: legalReleaseStatus(row.status),
    termsVersion: text(row.terms_version) || policySkeletonVersion,
    updatedAt: nullableText(row.updated_at),
  };
}

function envFact(key: string, label: string, envName: string, detail: string) {
  const ready = Boolean(process.env[envName]?.trim());
  return {
    detail: ready
      ? `${detail} 현재 설정값이 있습니다.`
      : `${detail} 현재 설정값이 없습니다.`,
    key,
    label,
    ready,
  };
}

function legalReviewStatus(value: unknown): LegalReviewStatus {
  return [
    "approved",
    "changes_requested",
    "in_review",
    "not_applicable",
    "pending",
    "ready",
  ].includes(text(value))
    ? (text(value) as LegalReviewStatus)
    : "pending";
}

function legalReleaseStatus(value: unknown): LegalReleaseStatus {
  return [
    "approved",
    "changes_requested",
    "draft",
    "in_review",
    "superseded",
  ].includes(text(value))
    ? (text(value) as LegalReleaseStatus)
    : "draft";
}

function isMissingLegalStore(code: string | undefined) {
  return ["42P01", "PGRST116", "PGRST205"].includes(code ?? "");
}

function readSourceCommit() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    ""
  );
}

function nullableText(value: unknown) {
  const normalized = text(value);
  return normalized || null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
