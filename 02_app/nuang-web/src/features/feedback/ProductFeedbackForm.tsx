"use client";

import {
  Check,
  CircleAlert,
  Lightbulb,
  MonitorSmartphone,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  productFeedbackAreaLabels,
  productFeedbackAreas,
  productFeedbackKindLabels,
  type ProductFeedbackArea,
  type ProductFeedbackKind,
} from "@/features/feedback/product-feedback-contract";
import styles from "./ProductFeedbackForm.module.css";

type SubmitState =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "error" }
  | { receiptId: string; status: "success" };

const draftStorageKey = "nuang:product-feedback:draft.v1";
const sessionStorageKey = "nuang:product-feedback:session.v1";

const kindOptions: Array<{
  icon: typeof CircleAlert;
  kind: ProductFeedbackKind;
  shortLabel: string;
}> = [
  { icon: CircleAlert, kind: "bug", shortLabel: "오류" },
  { icon: SlidersHorizontal, kind: "usability", shortLabel: "불편" },
  { icon: Lightbulb, kind: "idea", shortLabel: "아이디어" },
];

const kindGuides: Record<ProductFeedbackKind, string> = {
  bug: "어떤 화면에서 무엇을 했을 때 문제가 생겼는지 알려주세요.",
  usability: "어떤 점이 불편했고, 어떻게 바뀌면 좋을지 알려주세요.",
  idea: "뉴앙에 있으면 좋을 기능이나 바라는 점을 알려주세요.",
};

export function ProductFeedbackForm({
  initialSourcePath,
}: {
  initialSourcePath: string;
}) {
  const textareaId = useId();
  const [kind, setKind] = useState<ProductFeedbackKind>("bug");
  const [area, setArea] = useState<ProductFeedbackArea>(
    inferArea(initialSourcePath),
  );
  const [body, setBody] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(draftStorageKey);
        if (!raw) return;
        const draft = JSON.parse(raw) as {
          area?: ProductFeedbackArea;
          body?: string;
          kind?: ProductFeedbackKind;
        };
        if (draft.body?.trim()) {
          setBody(draft.body.slice(0, 2_000));
          if (draft.kind && productFeedbackKindLabels[draft.kind]) {
            setKind(draft.kind);
          }
          if (draft.area && productFeedbackAreaLabels[draft.area]) {
            setArea(draft.area);
          }
          setDraftRestored(true);
        }
      } catch {
        window.localStorage.removeItem(draftStorageKey);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (submitState.status === "success") return;
    const timer = window.setTimeout(() => {
      if (body.trim()) {
        window.localStorage.setItem(
          draftStorageKey,
          JSON.stringify({ area, body, kind }),
        );
      } else {
        window.localStorage.removeItem(draftStorageKey);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [area, body, kind, submitState.status]);

  async function submitFeedback() {
    if (submitState.status === "pending") return;
    const trimmedBody = body.trim();
    if (trimmedBody.length < 10) {
      setSubmitState({
        message: "의견을 조금만 더 자세히 적어 주세요.",
        status: "error",
      });
      document.getElementById(textareaId)?.focus();
      return;
    }

    setSubmitState({ status: "pending" });

    try {
      const response = await fetch("/api/feedback", {
        body: JSON.stringify({
          area,
          body: trimmedBody,
          clientSessionId: getClientSessionId(),
          kind,
          sourcePath: initialSourcePath,
          technicalContext: {
            locale: navigator.language || null,
            timeZone:
              Intl.DateTimeFormat().resolvedOptions().timeZone || null,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
          },
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        feedbackId?: string;
        message?: string;
        ok?: boolean;
      } | null;

      if (!response.ok || !payload?.ok || !payload.feedbackId) {
        setSubmitState({
          message:
            payload?.message ??
            "연결이 불안정해 의견을 보내지 못했어요. 작성한 내용은 그대로 두었어요.",
          status: "error",
        });
        return;
      }

      window.localStorage.removeItem(draftStorageKey);
      setSubmitState({
        receiptId: payload.feedbackId,
        status: "success",
      });
    } catch {
      setSubmitState({
        message:
          "연결이 불안정해 의견을 보내지 못했어요. 작성한 내용은 그대로 두었어요.",
        status: "error",
      });
    }
  }

  function resetForm() {
    setBody("");
    setKind("bug");
    setArea(inferArea(initialSourcePath));
    setDraftRestored(false);
    setSubmitState({ status: "idle" });
  }

  if (submitState.status === "success") {
    return (
      <section className={styles.success} aria-live="polite">
        <span>
          <Check aria-hidden="true" size={28} strokeWidth={1.8} />
        </span>
        <h2>의견이 잘 전달됐어요</h2>
        <p>개발팀이 확인하고 뉴앙을 더 편하게 만드는 데 활용할게요.</p>
        <div>
          <Link href="/my">마이로 돌아가기</Link>
          <button onClick={resetForm} type="button">
            다른 의견 보내기
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h2>뉴앙을 쓰며 느낀 점을 알려주세요</h2>
        <p>작동하지 않는 기능과 불편한 점, 필요한 기능을 모두 확인할게요.</p>
      </header>

      {draftRestored ? (
        <p className={styles.restored} role="status">
          작성하던 내용을 불러왔어요.
        </p>
      ) : null}

      <section className={styles.section}>
        <h3>어떤 의견인가요?</h3>
        <div
          aria-label="의견 종류"
          className={styles.kindOptions}
          role="radiogroup"
        >
          {kindOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                aria-checked={kind === option.kind}
                data-kind={option.kind}
                key={option.kind}
                onClick={() => {
                  setKind(option.kind);
                  setSubmitState({ status: "idle" });
                }}
                role="radio"
                type="button"
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
                <span>{option.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <p className={styles.kindGuide}>
          {productFeedbackKindLabels[kind]} · {kindGuides[kind]}
        </p>
      </section>

      <section className={styles.section}>
        <h3>어느 화면인가요?</h3>
        <div className={styles.areaOptions}>
          {productFeedbackAreas.map((option) => (
            <button
              aria-pressed={area === option}
              key={option}
              onClick={() => setArea(option)}
              type="button"
            >
              {productFeedbackAreaLabels[option]}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <label htmlFor={textareaId}>자세히 알려주세요</label>
        <textarea
          aria-describedby={`${textareaId}-guide`}
          id={textareaId}
          maxLength={2_000}
          onChange={(event) => {
            setBody(event.target.value);
            if (submitState.status === "error") {
              setSubmitState({ status: "idle" });
            }
          }}
          placeholder={kindGuides[kind]}
          value={body}
        />
        <div className={styles.fieldMeta} id={`${textareaId}-guide`}>
          <span>비밀번호나 인증번호는 적지 마세요.</span>
          {body.length >= 1_800 ? <b>{body.length.toLocaleString("ko-KR")}/2,000</b> : null}
        </div>
      </section>

      <div className={styles.technicalNote}>
        <MonitorSmartphone aria-hidden="true" size={18} strokeWidth={1.7} />
        <span>문제 확인에 필요한 화면과 기기 크기가 함께 전송돼요.</span>
      </div>

      <div className={styles.submitBar}>
        {submitState.status === "error" ? (
          <p role="alert">{submitState.message}</p>
        ) : null}
        <button
          disabled={submitState.status === "pending"}
          onClick={submitFeedback}
          type="button"
        >
          <Send aria-hidden="true" size={18} strokeWidth={1.8} />
          {submitState.status === "pending" ? "보내는 중" : "의견 보내기"}
        </button>
      </div>
    </div>
  );
}

function inferArea(path: string): ProductFeedbackArea {
  if (path.startsWith("/home")) return "home";
  if (path.startsWith("/assessments") || path.startsWith("/results")) {
    return "assessment";
  }
  if (path.startsWith("/feed")) return "community";
  if (path.startsWith("/map")) return "trait_map";
  if (path.startsWith("/login") || path.startsWith("/signup")) return "account";
  if (path.startsWith("/my")) return "my";
  return "other";
}

function getClientSessionId() {
  const stored = window.localStorage.getItem(sessionStorageKey);
  if (stored) return stored;
  const next = crypto.randomUUID();
  window.localStorage.setItem(sessionStorageKey, next);
  return next;
}
