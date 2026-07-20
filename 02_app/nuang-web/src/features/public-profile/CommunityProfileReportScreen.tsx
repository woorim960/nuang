"use client";

import { Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { profileReportReasons } from "@/features/feed/community-social-contract";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import styles from "./CommunityProfileReportScreen.module.css";

type ReportReason = (typeof profileReportReasons)[number];

const reasons: Array<{
  description: string;
  label: string;
  value: ReportReason;
}> = [
  {
    description: "개인정보나 사적인 내용이 동의 없이 공개됐어요.",
    label: "개인정보 침해",
    value: "privacy",
  },
  {
    description: "괴롭힘, 모욕, 위협처럼 누군가를 해치는 내용이에요.",
    label: "괴롭힘 또는 혐오",
    value: "harassment",
  },
  {
    description: "폭력적이거나 지나치게 선정적인 내용이 포함됐어요.",
    label: "민감하거나 부적절한 내용",
    value: "sensitive_content",
  },
  {
    description: "반복 홍보, 사기성 링크, 무관한 광고로 보여요.",
    label: "스팸 또는 홍보",
    value: "spam",
  },
  {
    description: "위 항목에 없지만 운영팀의 확인이 필요해요.",
    label: "기타",
    value: "other",
  },
];

export function CommunityProfileReportScreen({
  displayName,
  publicSnapshotId,
}: {
  displayName: string;
  publicSnapshotId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const profileHref = `/feed/profiles/${publicSnapshotId}`;

  async function submitReport() {
    if (!reason || pending) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/community/profile-safety", {
        body: JSON.stringify({
          action: "report",
          details: details.trim() || undefined,
          publicSnapshotId,
          reason,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (response.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(pathname)}&reason=community`,
        );
        return;
      }

      if (!response.ok) {
        setError(payload?.message ?? "신고를 접수하지 못했어요.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <CommunityScreenShell backHref={profileHref} title="신고 접수 완료">
        <section className={styles.completeState}>
          <span aria-hidden="true">
            <Check size={24} />
          </span>
          <strong>알려주셔서 고마워요</strong>
          <p>
            접수한 내용은 운영 기준에 따라 확인해요. 검토 결과와 관계없이 신고한
            사람의 정보는 상대에게 공개하지 않아요.
          </p>
          <Link href="/feed">커뮤니티로 돌아가기</Link>
        </section>
      </CommunityScreenShell>
    );
  }

  return (
    <CommunityScreenShell backHref={profileHref} title="프로필 신고">
      <section className={styles.intro}>
        <ShieldCheck aria-hidden="true" size={20} />
        <div>
          <strong>{displayName}님의 프로필을 신고하는 이유를 알려주세요</strong>
          <p>가장 가까운 이유 하나를 선택하면 운영팀이 확인해요.</p>
        </div>
      </section>

      <fieldset className={styles.reasonList}>
        <legend className="sr-only">신고 사유</legend>
        {reasons.map((item) => (
          <label key={item.value}>
            <input
              checked={reason === item.value}
              name="profile-report-reason"
              onChange={() => setReason(item.value)}
              type="radio"
              value={item.value}
            />
            <span className={styles.reasonMark} aria-hidden="true" />
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <label className={styles.detailField}>
        <span>
          추가 설명 <small>선택</small>
        </span>
        <textarea
          maxLength={500}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="운영팀이 확인할 내용을 적어주세요."
          value={details}
        />
        <small>{details.length} / 500</small>
      </label>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.submitBar}>
        <button
          disabled={!reason || pending}
          onClick={submitReport}
          type="button"
        >
          {pending ? "접수 중" : "신고 접수하기"}
        </button>
      </div>
    </CommunityScreenShell>
  );
}
