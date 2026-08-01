"use client";

import { Check, Clock3, Lightbulb, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminProductFeedbackStatus } from "@/features/admin/server-admin-feedback";
import styles from "./AdminFeedbackActions.module.css";

const actions: Array<{
  icon: typeof Clock3;
  label: string;
  status: Exclude<AdminProductFeedbackStatus, "received">;
}> = [
  { icon: Clock3, label: "확인 시작", status: "reviewing" },
  { icon: Lightbulb, label: "반영 예정", status: "planned" },
  { icon: Check, label: "처리 완료", status: "resolved" },
  { icon: X, label: "검토 종료", status: "closed" },
];

export function AdminFeedbackActions({
  feedbackId,
  status,
}: {
  feedbackId: string;
  status: AdminProductFeedbackStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<AdminProductFeedbackStatus | null>(
    null,
  );
  const [message, setMessage] = useState("");

  async function update(nextStatus: AdminProductFeedbackStatus) {
    if (pending || nextStatus === status) return;
    setPending(nextStatus);
    setMessage("");

    try {
      const response = await fetch("/api/admin/feedback", {
        body: JSON.stringify({ feedbackId, status: nextStatus }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        ok?: boolean;
      } | null;
      if (!response.ok || !payload?.ok) {
        setMessage(payload?.message ?? "의견 상태를 변경하지 못했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("연결이 불안정합니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.actions}>
        {actions.map((action) => {
          const Icon = action.icon;
          const visible =
            action.status !== status &&
            !(
              status === "received" &&
              !["reviewing", "closed"].includes(action.status)
            );
          if (!visible) return null;
          return (
            <button
              data-status={action.status}
              disabled={Boolean(pending)}
              key={action.status}
              onClick={() => update(action.status)}
              type="button"
            >
              <Icon aria-hidden="true" size={15} strokeWidth={1.7} />
              {pending === action.status ? "변경 중" : action.label}
            </button>
          );
        })}
      </div>
      {message ? <p role="alert">{message}</p> : null}
    </div>
  );
}
