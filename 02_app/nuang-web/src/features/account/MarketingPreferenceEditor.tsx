"use client";

import { BellRing, Check, MailOpen, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type PrivateContactPayload,
  privateContactMarketingConsentVersion,
} from "@/features/account/private-contact-contract";
import { readJsonResponse } from "@/features/account/response-json";
import styles from "./MarketingPreferenceEditor.module.css";

type ContactResponse =
  | { contact: PrivateContactPayload; ok: true }
  | { code?: string; message?: string; ok: false };

export function MarketingPreferenceEditor() {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<"error" | "idle" | "loading" | "saving">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/me/contact", { cache: "no-store" })
      .then(async (response) => ({
        payload: await readJsonResponse<ContactResponse>(response),
        response,
      }))
      .then(({ payload, response }) => {
        if (!active) return;
        if (!response.ok || !payload || payload.ok !== true) {
          setMessage(
            payload?.ok === false && payload.message
              ? payload.message
              : "알림 설정을 불러오지 못했어요.",
          );
          setState("error");
          return;
        }
        setEnabled(payload.contact.marketingOptIn);
        setState("idle");
      })
      .catch(() => {
        if (!active) return;
        setMessage("연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.");
        setState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  async function updatePreference(nextValue: boolean) {
    if (state === "saving") return;
    const previousValue = enabled;
    setEnabled(nextValue);
    setState("saving");
    setMessage("");

    try {
      const response = await fetch("/api/me/contact", {
        body: JSON.stringify({
          consentVersion: privateContactMarketingConsentVersion,
          marketingOptIn: nextValue,
          preference: "marketing",
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = await readJsonResponse<ContactResponse>(response);
      if (!response.ok || !payload || payload.ok !== true) {
        setEnabled(previousValue);
        setMessage(
          payload?.ok === false && payload.message
            ? payload.message
            : "소식 알림 설정을 저장하지 못했어요.",
        );
        setState("error");
        return;
      }
      setEnabled(payload.contact.marketingOptIn);
      setMessage(
        payload.contact.marketingOptIn
          ? "뉴앙의 새로운 소식을 받을 수 있도록 설정했어요."
          : "광고성 소식을 받지 않도록 설정했어요.",
      );
      setState("idle");
    } catch {
      setEnabled(previousValue);
      setMessage("연결이 불안정해요. 설정은 변경되지 않았어요.");
      setState("error");
    }
  }

  return (
    <section aria-labelledby="marketing-title" className={styles.section}>
      <div className={styles.introIcon} aria-hidden="true">
        <BellRing size={22} strokeWidth={1.7} />
      </div>
      <h2 id="marketing-title">새로운 검사와 소식</h2>
      <p>
        새로 나온 검사, 함께하기 콘텐츠와 중요한 이벤트 소식을 받아볼 수
        있어요.
      </p>

      {state === "loading" ? (
        <div aria-live="polite" className={styles.loading} role="status">
          알림 설정을 확인하는 중
        </div>
      ) : (
        <>
          <label className={styles.preference}>
            <span className={styles.preferenceIcon} aria-hidden="true">
              <MailOpen size={19} strokeWidth={1.7} />
            </span>
            <span className={styles.preferenceCopy}>
              <strong>광고성 소식 받기</strong>
              <small>
                선택 항목이며 언제든 다시 변경할 수 있어요.
              </small>
            </span>
            <input
              checked={enabled}
              disabled={state === "saving"}
              onChange={(event) => void updatePreference(event.target.checked)}
              type="checkbox"
            />
            <span aria-hidden="true" className={styles.switch} />
          </label>

          <div className={styles.examples}>
            <Sparkles aria-hidden="true" size={16} />
            <span>새 검사 공개 · 특별 이벤트 · 뉴앙 주요 업데이트</span>
          </div>
        </>
      )}

      {message ? (
        <p
          className={styles.message}
          data-error={state === "error"}
          role={state === "error" ? "alert" : "status"}
        >
          {state !== "error" ? <Check aria-hidden="true" size={15} /> : null}
          {message}
        </p>
      ) : null}
    </section>
  );
}
