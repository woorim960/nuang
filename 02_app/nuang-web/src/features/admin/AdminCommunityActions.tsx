"use client";

import { Check, EyeOff, RotateCcw, ShieldAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import styles from "./AdminCommunityActions.module.css";

type CommunityAction =
  | "dismiss_content_report"
  | "dismiss_report"
  | "hide_reported_content"
  | "hide_reported_profile"
  | "limit_post"
  | "publish_post"
  | "remove_post"
  | "start_content_report_review"
  | "start_report_review";

export function AdminCommunityActions({
  id,
  kind,
  status,
}: {
  id: string;
  kind: "content_report" | "post" | "profile_report";
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<CommunityAction | null>(null);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<CommunityAction | null>(null);

  async function run(action: CommunityAction) {
    if (
      (action === "hide_reported_profile" ||
        action === "hide_reported_content" ||
        action === "remove_post" ||
        (action === "publish_post" && status === "limited")) &&
      confirmation !== action
    ) {
      setConfirmation(action);
      return;
    }
    setConfirmation(null);
    setPending(action);
    setMessage("");
    const response = await fetch("/api/admin/community", {
      body: JSON.stringify({ action, id }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      ok?: boolean;
    } | null;
    if (!response.ok || !payload?.ok) {
      setMessage(payload?.message ?? "운영 조치를 반영하지 못했습니다.");
      setPending(null);
      return;
    }
    setPending(null);
    router.refresh();
  }

  if (kind === "profile_report" || kind === "content_report") {
    const contentReport = kind === "content_report";
    const startAction = contentReport
      ? "start_content_report_review"
      : "start_report_review";
    const dismissAction = contentReport
      ? "dismiss_content_report"
      : "dismiss_report";
    const hideAction = contentReport
      ? "hide_reported_content"
      : "hide_reported_profile";

    return (
      <div className={styles.wrap}>
        <div className={styles.buttons}>
          {status === "queued" ? (
            <button
              disabled={Boolean(pending)}
              onClick={() => run(startAction)}
              type="button"
            >
              <ShieldAlert aria-hidden="true" size={15} strokeWidth={1.7} />
              검토 시작
            </button>
          ) : null}
          <button
            disabled={Boolean(pending)}
            onClick={() => run(dismissAction)}
            type="button"
          >
            <X aria-hidden="true" size={15} strokeWidth={1.7} />
            조치 없음
          </button>
          <button
            className={styles.danger}
            disabled={Boolean(pending)}
            onClick={() => run(hideAction)}
            type="button"
          >
            <EyeOff aria-hidden="true" size={15} strokeWidth={1.7} />
            {contentReport ? "콘텐츠 숨김" : "프로필 숨김"}
          </button>
        </div>
        {message ? <p role="alert">{message}</p> : null}
        <AdminConfirmDialog
          confirmLabel={contentReport ? "콘텐츠 숨기기" : "프로필 숨기기"}
          description={
            contentReport
              ? "신고된 게시물 또는 댓글이 즉시 보이지 않게 되며, 조치 내용은 운영 기록에 남습니다."
              : "해당 프로필은 검색과 커뮤니티에서 즉시 보이지 않게 되며, 조치 내용은 운영 기록에 남습니다."
          }
          onCancel={() => setConfirmation(null)}
          onConfirm={() => run(hideAction)}
          open={confirmation === hideAction}
          pending={pending === hideAction}
          title={
            contentReport
              ? "신고된 콘텐츠를 숨길까요?"
              : "신고된 프로필을 숨길까요?"
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.buttons}>
        {status === "pending_review" || status === "limited" ? (
          <button
            disabled={Boolean(pending)}
            onClick={() => run("publish_post")}
            type="button"
          >
            {status === "limited" ? (
              <RotateCcw aria-hidden="true" size={15} strokeWidth={1.8} />
            ) : (
              <Check aria-hidden="true" size={15} strokeWidth={1.8} />
            )}
            {status === "limited" ? "다시 게시" : "게시 허용"}
          </button>
        ) : null}
        {status !== "limited" ? (
          <button
            disabled={Boolean(pending)}
            onClick={() => run("limit_post")}
            type="button"
          >
            노출 제한
          </button>
        ) : null}
        <button
          className={styles.danger}
          disabled={Boolean(pending)}
          onClick={() => run("remove_post")}
          type="button"
        >
          삭제 처리
        </button>
      </div>
      {message ? <p role="alert">{message}</p> : null}
      <AdminConfirmDialog
        confirmLabel="다시 게시"
        description="기존 게시 시각은 유지되며, 해당 게시물이 커뮤니티와 작성자의 프로필에 다시 노출됩니다."
        onCancel={() => setConfirmation(null)}
        onConfirm={() => run("publish_post")}
        open={confirmation === "publish_post"}
        pending={pending === "publish_post"}
        title="이 게시물을 다시 공개할까요?"
      />
      <AdminConfirmDialog
        confirmLabel="삭제 처리"
        description="게시물은 커뮤니티에서 즉시 숨겨지고 삭제 상태로 기록됩니다. 조치 전 내용을 한 번 더 확인해 주세요."
        onCancel={() => setConfirmation(null)}
        onConfirm={() => run("remove_post")}
        open={confirmation === "remove_post"}
        pending={pending === "remove_post"}
        title="게시물을 삭제 처리할까요?"
      />
    </div>
  );
}
