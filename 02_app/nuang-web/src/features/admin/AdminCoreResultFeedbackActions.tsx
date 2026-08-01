"use client";

import { Check, Clock3, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CoreResultFeedbackStatus } from "@/features/result/unified-core-report/core-result-feedback-contract";
import styles from "./AdminFeedbackActions.module.css";

const actions = [
  { icon: Clock3, label: "검토 시작", status: "reviewing" },
  { icon: Check, label: "개선에 반영", status: "incorporated" },
  { icon: X, label: "근거 부족", status: "dismissed" },
] as const;

export function AdminCoreResultFeedbackActions({
  feedbackId,
  status,
}: {
  feedbackId: string;
  status: CoreResultFeedbackStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<CoreResultFeedbackStatus | null>(null);
  const [message, setMessage] = useState("");

  async function update(
    nextStatus: Exclude<CoreResultFeedbackStatus, "received">,
  ) {
    if (pending || nextStatus === status) return;
    setPending(nextStatus);
    setMessage("");
    try {
      const response = await fetch("/api/admin/core-result-feedback", {
        body: JSON.stringify({ feedbackId, status: nextStatus }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        ok?: boolean;
      } | null;
      if (!response.ok || !payload?.ok) {
        setMessage(payload?.message ?? "상태를 변경하지 못했습니다.");
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
          if (action.status === status) return null;
          const Icon = action.icon;
          return (
            <button
              data-status={action.status}
              disabled={Boolean(pending)}
              key={action.status}
              onClick={() => void update(action.status)}
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
