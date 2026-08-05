"use client";

import { Check, Pause, RotateCcw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./AdminTraitMapGuideReviewActions.module.css";

type ReviewAction =
  | "approve_profile"
  | "approve_unit"
  | "deploy_human_release"
  | "hold_unit"
  | "request_profile_changes"
  | "request_unit_changes";

type SharedTarget = {
  contentDigest: string;
  expectedProfileCount: number;
  expectedReleaseUnitCount: number;
  expectedUnitCount: number;
  guideVersion: string;
  profileContentDigest: string;
  profileCode: string;
  releaseId: string;
};

type UnitTarget = SharedTarget & {
  contentHash: string;
  reviewRole: string;
  unitKey: string;
};

export function AdminTraitMapGuideReviewActions({
  currentStatus,
  mode,
  target,
}: {
  currentStatus?: string;
  mode: "profile" | "release" | "unit";
  target: SharedTarget | UnitTarget;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<ReviewAction | null>(null);

  async function run(action: ReviewAction) {
    setPending(action);
    setMessage("");
    const response = await fetch("/api/admin/trait-map-guide-review", {
      body: JSON.stringify({ action, note, ...target }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      ok?: boolean;
    } | null;
    if (!response.ok || !payload?.ok) {
      setMessage(payload?.message ?? "검토 상태를 저장하지 못했습니다.");
      setPending(null);
      return;
    }
    setNote("");
    setPending(null);
    router.refresh();
  }

  if (mode === "release") {
    return (
      <div className={styles.wrap}>
        <button
          className={styles.primary}
          disabled={Boolean(pending)}
          onClick={() => run("deploy_human_release")}
          type="button"
        >
          <Send aria-hidden="true" size={14} strokeWidth={1.8} />
          MVP 사람 검수본 배포
        </button>
        {message ? <p role="alert">{message}</p> : null}
      </div>
    );
  }

  if (mode === "profile") {
    return (
      <div className={styles.wrap}>
        <textarea
          aria-label="프로필 검토 메모"
          onChange={(event) => setNote(event.target.value)}
          placeholder="승인 근거 또는 수정할 범위를 기록해 주세요."
          rows={2}
          value={note}
        />
        <div className={styles.actions}>
          <button
            disabled={Boolean(pending)}
            onClick={() => run("request_profile_changes")}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={14} strokeWidth={1.8} />
            프로필 수정 요청
          </button>
          <button
            className={styles.primary}
            disabled={Boolean(pending) || currentStatus === "approved"}
            onClick={() => run("approve_profile")}
            type="button"
          >
            <Check aria-hidden="true" size={14} strokeWidth={1.8} />
            프로필 최종 승인
          </button>
        </div>
        {message ? <p role="alert">{message}</p> : null}
      </div>
    );
  }

  const unitTarget = target as UnitTarget;
  return (
    <div className={styles.wrap}>
      <textarea
        aria-label={`${unitTarget.reviewRole} 검토 메모`}
        onChange={(event) => setNote(event.target.value)}
        placeholder="수정 요청이나 승인 근거를 구체적으로 적어 주세요."
        rows={2}
        value={note}
      />
      <div className={styles.actions}>
        <button
          disabled={Boolean(pending)}
          onClick={() => run("request_unit_changes")}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={14} strokeWidth={1.8} />
          수정 요청
        </button>
        <button
          disabled={Boolean(pending)}
          onClick={() => run("hold_unit")}
          type="button"
        >
          <Pause aria-hidden="true" size={14} strokeWidth={1.8} />
          보류
        </button>
        <button
          className={styles.primary}
          disabled={Boolean(pending) || currentStatus === "approved"}
          onClick={() => run("approve_unit")}
          type="button"
        >
          <Check aria-hidden="true" size={14} strokeWidth={1.8} />이 역할 승인
        </button>
      </div>
      {message ? <p role="alert">{message}</p> : null}
    </div>
  );
}
