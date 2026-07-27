"use client";

import { Check, Rocket, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import styles from "./AdminContentActions.module.css";

type ContentAction =
  | "approve_atom"
  | "approve_release"
  | "publish_release"
  | "request_changes"
  | "start_release_review"
  | "pass_review";

type Target = {
  atomId?: string;
  atomVersion?: number;
  releaseId: string;
  reviewRole?: string;
};

export function AdminContentActions({
  mode,
  releaseStatus,
  target,
}: {
  mode: "atom" | "release" | "review";
  releaseStatus?: string;
  target: Target;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<ContentAction | null>(null);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<ContentAction | null>(null);

  async function run(action: ContentAction) {
    if (
      (action === "publish_release" || action === "approve_release") &&
      confirmation !== action
    ) {
      setConfirmation(action);
      return;
    }
    setConfirmation(null);
    setPending(action);
    setMessage("");
    const response = await fetch("/api/admin/content", {
      body: JSON.stringify({ action, ...target }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      ok?: boolean;
    } | null;
    if (!response.ok || !payload?.ok) {
      setMessage(payload?.message ?? "콘텐츠 상태를 저장하지 못했습니다.");
      setPending(null);
      return;
    }
    setPending(null);
    router.refresh();
  }

  if (mode === "review") {
    return (
      <div className={styles.wrap} data-mode="review">
        <div className={styles.actions}>
          <button
            disabled={Boolean(pending)}
            onClick={() => run("request_changes")}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={14} strokeWidth={1.7} />
            수정 요청
          </button>
          <button
            className={styles.primary}
            disabled={Boolean(pending)}
            onClick={() => run("pass_review")}
            type="button"
          >
            <Check aria-hidden="true" size={14} strokeWidth={1.8} />
            검토 통과
          </button>
        </div>
        {message ? <p role="alert">{message}</p> : null}
      </div>
    );
  }

  if (mode === "atom") {
    return (
      <div className={styles.wrap} data-mode="atom">
        <div className={styles.actions}>
          <button
            className={styles.primary}
            disabled={Boolean(pending)}
            onClick={() => run("approve_atom")}
            type="button"
          >
            <Check aria-hidden="true" size={14} strokeWidth={1.8} />
            게시 버전에 포함
          </button>
        </div>
        {message ? <p role="alert">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className={styles.wrap} data-mode="release">
      <div className={styles.actions}>
        {releaseStatus === "draft" ? (
          <button
            className={styles.primary}
            disabled={Boolean(pending)}
            onClick={() => run("start_release_review")}
            type="button"
          >
            검토 시작
          </button>
        ) : null}
        {releaseStatus === "in_review" ? (
          <button
            className={styles.primary}
            disabled={Boolean(pending)}
            onClick={() => run("approve_release")}
            type="button"
          >
            게시 준비 완료
          </button>
        ) : null}
        {releaseStatus === "approved" ? (
          <button
            className={styles.primary}
            disabled={Boolean(pending)}
            onClick={() => run("publish_release")}
            type="button"
          >
            <Rocket aria-hidden="true" size={14} strokeWidth={1.7} />
            고객에게 게시
          </button>
        ) : null}
      </div>
      {message ? <p role="alert">{message}</p> : null}
      <AdminConfirmDialog
        confirmLabel={
          confirmation === "publish_release"
            ? "고객에게 게시"
            : "게시 준비 완료"
        }
        description={
          confirmation === "publish_release"
            ? "이 버전이 고객용 성향지도에 적용되고 기존 게시 버전은 보관됩니다. 게시 전 검토 상태를 다시 확인해 주세요."
            : "구성 데이터와 네 분야 콘텐츠 검토가 모두 끝났는지 확인한 뒤 게시 준비 상태로 변경합니다."
        }
        onCancel={() => setConfirmation(null)}
        onConfirm={() => confirmation && run(confirmation)}
        open={Boolean(confirmation)}
        pending={Boolean(pending)}
        title={
          confirmation === "publish_release"
            ? "이 콘텐츠 버전을 게시할까요?"
            : "게시 준비를 완료할까요?"
        }
        tone="brand"
      />
    </div>
  );
}
