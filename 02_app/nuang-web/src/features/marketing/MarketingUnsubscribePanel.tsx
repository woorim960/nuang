"use client";

import { CheckCircle2, LoaderCircle, MailX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import styles from "./MarketingUnsubscribePanel.module.css";

export function MarketingUnsubscribePanel({
  preview,
  token,
  valid,
}: {
  preview: boolean;
  token: string;
  valid: boolean;
}) {
  const [state, setState] = useState<"error" | "idle" | "saving" | "success">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function unsubscribe() {
    if (!valid || preview || state === "saving") return;
    setState("saving");
    const response = await fetch("/api/marketing/unsubscribe", {
      body: JSON.stringify({ token }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as {
      message?: unknown;
      unsubscribed?: unknown;
    } | null;
    if (response?.ok && payload?.unsubscribed === true) {
      setMessage("앞으로 뉴앙의 광고성 이메일을 보내지 않을게요.");
      setState("success");
      return;
    }
    setMessage(
      typeof payload?.message === "string"
        ? payload.message
        : "수신 설정을 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    );
    setState("error");
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brand}>NUANG</div>
        <div className={styles.icon} data-success={state === "success"}>
          {state === "success" ? (
            <CheckCircle2 aria-hidden="true" size={28} />
          ) : (
            <MailX aria-hidden="true" size={28} />
          )}
        </div>
        <h1>
          {state === "success"
            ? "이메일 수신을 해제했어요"
            : "뉴앙 소식 이메일을 그만 받을까요?"}
        </h1>
        <p>
          {preview
            ? "테스트 메일의 미리보기 화면이에요. 실제 수신 설정은 바뀌지 않습니다."
            : state === "success"
              ? message
              : valid
                ? "해제하면 새 검사, 함께하기, 이벤트와 혜택 소식을 이메일로 보내지 않아요. 앱은 그대로 이용할 수 있습니다."
                : "링크가 올바르지 않아요. 뉴앙 앱의 마이 > 설정에서 이메일 수신 여부를 바꿀 수 있어요."}
        </p>
        {message && state === "error" ? (
          <div className={styles.error} role="alert">
            {message}
          </div>
        ) : null}
        {state !== "success" && valid && !preview ? (
          <button
            disabled={state === "saving"}
            onClick={() => void unsubscribe()}
            type="button"
          >
            {state === "saving" ? (
              <LoaderCircle aria-hidden="true" className={styles.spinner} />
            ) : null}
            이메일 수신 해제
          </button>
        ) : null}
        <Link href="/home">뉴앙 홈으로 이동</Link>
      </section>
    </main>
  );
}
