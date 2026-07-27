"use client";

import { Check, Eye, FilePenLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  ResearchDecision,
  ResearchDecisionState,
} from "./server-admin-research-decisions";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import styles from "./AdminResearchDecisionActions.module.css";

type ResearchAction = "exclude" | "keep" | "revise" | "start_review";

export function AdminResearchDecisionActions({
  available,
  current,
  identity,
  scope,
}: {
  available: boolean;
  current?: ResearchDecision;
  identity: Record<string, string>;
  scope: "gate_c_item" | "trait_map_section";
}) {
  const router = useRouter();
  const [note, setNote] = useState(current?.note ?? "");
  const [pending, setPending] = useState<ResearchAction | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [message, setMessage] = useState("");

  async function run(action: ResearchAction) {
    if (action === "exclude" && !confirmation) {
      setConfirmation(true);
      return;
    }
    setConfirmation(false);
    setPending(action);
    setMessage("");
    const response = await fetch("/api/admin/research/decisions", {
      body: JSON.stringify({ action, identity, note, scope }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      ok?: boolean;
    } | null;
    if (!response.ok || !payload?.ok) {
      setMessage(payload?.message ?? "검토 결정을 저장하지 못했습니다.");
      setPending(null);
      return;
    }
    setPending(null);
    router.refresh();
  }

  if (!available) {
    return (
      <p className={styles.unavailable}>
        결정 저장소를 준비하면 이곳에서 검토 결과를 기록할 수 있습니다.
      </p>
    );
  }

  return (
    <details className={styles.wrap}>
      <summary>
        <span>운영 결정</span>
        <em data-state={current?.state ?? "waiting"}>
          {decisionLabel(current?.state)}
        </em>
      </summary>
      <div className={styles.body}>
        <label>
          <span>판단 근거 또는 수정할 점</span>
          <textarea
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="다음 검토자가 이해할 수 있게 간단히 남겨 주세요."
            rows={2}
            value={note}
          />
        </label>
        <div className={styles.actions}>
          <button disabled={Boolean(pending)} onClick={() => run("start_review")} type="button">
            <Eye aria-hidden="true" size={14} strokeWidth={1.7} />
            검토 중
          </button>
          <button disabled={Boolean(pending)} onClick={() => run("keep")} type="button">
            <Check aria-hidden="true" size={14} strokeWidth={1.8} />
            유지
          </button>
          <button disabled={Boolean(pending)} onClick={() => run("revise")} type="button">
            <FilePenLine aria-hidden="true" size={14} strokeWidth={1.7} />
            문구 개선
          </button>
          {scope === "gate_c_item" ? (
            <button
              className={styles.danger}
              disabled={Boolean(pending)}
              onClick={() => run("exclude")}
              type="button"
            >
              <X aria-hidden="true" size={14} strokeWidth={1.8} />
              후보 제외
            </button>
          ) : null}
        </div>
        {message ? <p role="alert">{message}</p> : null}
      </div>
      <AdminConfirmDialog
        confirmLabel="후보 제외"
        description="이 결정은 고객용 검사를 즉시 바꾸지는 않지만, 다음 문항 개편에서 제외 후보로 분류됩니다. 근거를 남겼는지 확인해 주세요."
        onCancel={() => setConfirmation(false)}
        onConfirm={() => run("exclude")}
        open={confirmation}
        pending={Boolean(pending)}
        title="이 문항을 제외 후보로 분류할까요?"
        tone="danger"
      />
    </details>
  );
}

function decisionLabel(state?: ResearchDecisionState) {
  return (
    {
      exclude: "제외 후보",
      keep: "유지 결정",
      revise: "개선 필요",
      reviewing: "검토 중",
      waiting: "결정 대기",
    }[state ?? "waiting"] ?? "결정 대기"
  );
}
