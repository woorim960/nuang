"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState } from "react";
import {
  coreResultFeedbackReasonLabels,
  coreResultFeedbackReasons,
  coreResultFeedbackSentimentLabels,
  type CoreResultFeedbackReason,
  type CoreResultFeedbackSentiment,
} from "./core-result-feedback-contract";
import type { CoreResultReportSection } from "./core-result-report-model";
import styles from "./CoreResultSectionFeedback.module.css";

type CoreResultSectionFeedbackProps = {
  resultReportId: string;
  section: CoreResultReportSection;
  surface: "completion" | "my";
};

export function CoreResultSectionFeedback({
  resultReportId,
  section,
  surface,
}: CoreResultSectionFeedbackProps) {
  const [selected, setSelected] = useState<CoreResultFeedbackSentiment | null>(
    null,
  );
  const [reason, setReason] = useState<CoreResultFeedbackReason | null>(null);
  const [state, setState] = useState<
    "idle" | "reason" | "sending" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function submit(
    sentiment: CoreResultFeedbackSentiment,
    nextReason: CoreResultFeedbackReason | null,
  ) {
    if (state === "sending") return;
    setSelected(sentiment);
    setReason(nextReason);
    setState("sending");
    setMessage("");

    try {
      const response = await fetch("/api/core-result-feedback", {
        body: JSON.stringify({
          contentKey: section.contentKey,
          contentVersion: section.contentVersion,
          reason: nextReason,
          resultReportId,
          sectionId: section.sectionId,
          sentiment,
          surface,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        ok?: boolean;
      } | null;
      if (!response.ok || !payload?.ok) {
        setState("error");
        setMessage(payload?.message ?? "의견을 저장하지 못했어요.");
        return;
      }
      setState("sent");
    } catch {
      setState("error");
      setMessage("연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.");
    }
  }

  if (state === "sent") {
    return (
      <div className={styles.receipt} role="status">
        <Check aria-hidden="true" size={16} strokeWidth={2.2} />
        알려주셔서 고마워요. 같은 버전의 의견과 함께 검토할게요.
      </div>
    );
  }

  const showReasons =
    state === "reason" ||
    (state === "sending" && selected !== "fit") ||
    (state === "error" && selected !== null && selected !== "fit");

  return (
    <div className={styles.root}>
      <fieldset disabled={state === "sending"}>
        <legend>이 내용은 나와 얼마나 닮았나요?</legend>
        <div className={styles.sentiments}>
          {(["fit", "depends", "not_fit"] as const).map((sentiment) => (
            <button
              aria-pressed={selected === sentiment}
              data-active={selected === sentiment}
              key={sentiment}
              onClick={() => {
                setSelected(sentiment);
                setMessage("");
                if (sentiment === "fit") {
                  void submit(sentiment, null);
                } else {
                  setReason(null);
                  setState("reason");
                }
              }}
              type="button"
            >
              {coreResultFeedbackSentimentLabels[sentiment]}
            </button>
          ))}
        </div>
        {showReasons ? (
          <div className={styles.reasonPanel}>
            <p>
              가장 가까운 이유를 고르면 문장을 더 정확하게 다듬을 수 있어요.
            </p>
            <div className={styles.reasons}>
              {coreResultFeedbackReasons.map((item) => (
                <button
                  aria-pressed={reason === item}
                  data-active={reason === item}
                  key={item}
                  onClick={() => setReason(item)}
                  type="button"
                >
                  {coreResultFeedbackReasonLabels[item]}
                </button>
              ))}
            </div>
            <button
              className={styles.submit}
              disabled={!selected || selected === "fit"}
              onClick={() =>
                selected && selected !== "fit"
                  ? void submit(selected, reason)
                  : undefined
              }
              type="button"
            >
              {state === "sending" ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={styles.spinner}
                  size={16}
                />
              ) : null}
              {state === "sending" ? "보내는 중" : "이 의견 보내기"}
            </button>
          </div>
        ) : null}
      </fieldset>
      {state === "error" && message ? <p role="alert">{message}</p> : null}
    </div>
  );
}
