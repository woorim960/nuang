"use client";

import {
  BarChart3,
  BellRing,
  Check,
  MailCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  optionalConsentVersions,
  type OptionalConsentPreferenceName,
  type OptionalConsentPreferences,
} from "@/features/consent/optional-consent-contract";
import { readJsonResponse } from "@/features/account/response-json";
import styles from "./MarketingPreferenceEditor.module.css";

type PreferencesResponse =
  | { ok: true; preferences: OptionalConsentPreferences }
  | { code?: string; message?: string; ok: false };

export function MarketingPreferenceEditor() {
  const [preferences, setPreferences] =
    useState<OptionalConsentPreferences | null>(null);
  const [state, setState] = useState<"error" | "idle" | "loading">("loading");
  const [saving, setSaving] = useState<OptionalConsentPreferenceName | null>(
    null,
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/me/consents", { cache: "no-store" })
      .then(async (response) => ({
        payload: await readJsonResponse<PreferencesResponse>(response),
        response,
      }))
      .then(({ payload, response }) => {
        if (!active) return;
        if (!response.ok || !payload || payload.ok !== true) {
          setMessage(
            payload?.ok === false && payload.message
              ? payload.message
              : "데이터와 알림 설정을 불러오지 못했어요.",
          );
          setState("error");
          return;
        }
        setPreferences(payload.preferences);
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

  async function updatePreference(
    preference: OptionalConsentPreferenceName,
    enabled: boolean,
  ) {
    if (!preferences || saving) return;
    const previous = preferences;
    setPreferences({
      ...preferences,
      [preference]: { ...preferences[preference], enabled },
    });
    setSaving(preference);
    setMessage("");

    try {
      const response = await fetch("/api/me/consents", {
        body: JSON.stringify({
          consentVersion: optionalConsentVersions[preference],
          enabled,
          preference,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = await readJsonResponse<PreferencesResponse>(response);
      if (!response.ok || !payload || payload.ok !== true) {
        setPreferences(previous);
        setMessage(
          payload?.ok === false && payload.message
            ? payload.message
            : "설정을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        );
        setState("error");
        return;
      }

      setPreferences(payload.preferences);
      setMessage(successMessage(preference, enabled));
      setState("idle");
    } catch {
      setPreferences(previous);
      setMessage("연결이 불안정해요. 설정은 변경되지 않았어요.");
      setState("error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section aria-labelledby="preferences-title" className={styles.section}>
      <div className={styles.introIcon} aria-hidden="true">
        <SlidersHorizontal size={22} strokeWidth={1.7} />
      </div>
      <h2 id="preferences-title">내 데이터와 소식 설정</h2>
      <p>필요한 항목만 직접 선택하고 언제든 다시 바꿀 수 있어요.</p>

      {state === "loading" ? (
        <div aria-live="polite" className={styles.loading} role="status">
          현재 설정을 확인하는 중
        </div>
      ) : preferences ? (
        <div className={styles.preferenceList}>
          <PreferenceRow
            checked={preferences.analytics.enabled}
            description="방문한 서비스 영역과 이용 시각만 모아요. 검사 답변, 뉴앙코드와 작성한 내용은 포함하지 않아요."
            disabled={saving !== null}
            icon={BarChart3}
            label="서비스 개선을 위한 이용 데이터"
            onChange={(enabled) => void updatePreference("analytics", enabled)}
            tone="analytics"
          />
          <PreferenceRow
            checked={preferences.marketing.enabled}
            description="뉴앙의 새 검사, 함께하기, 이벤트, 혜택과 제휴 소식을 이메일로 받아봐요. 동의하지 않아도 모든 서비스를 이용할 수 있고 언제든 철회할 수 있어요."
            disabled={saving !== null}
            icon={BellRing}
            label="광고성 이메일 수신 동의 (선택)"
            onChange={(enabled) => void updatePreference("marketing", enabled)}
            tone="marketing"
          />
          <div className={styles.examples}>
            <MailCheck aria-hidden="true" size={16} />
            <span>
              선택하지 않아도 검사와 커뮤니티는 똑같이 이용할 수 있어요.
            </span>
          </div>
        </div>
      ) : null}

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

function PreferenceRow({
  checked,
  description,
  disabled,
  icon: Icon,
  label,
  onChange,
  tone,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  icon: typeof BellRing;
  label: string;
  onChange: (enabled: boolean) => void;
  tone: "analytics" | "marketing";
}) {
  return (
    <label className={styles.preference} data-tone={tone}>
      <span className={styles.preferenceIcon} aria-hidden="true">
        <Icon size={19} strokeWidth={1.7} />
      </span>
      <span className={styles.preferenceCopy}>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span aria-hidden="true" className={styles.switch} />
    </label>
  );
}

function successMessage(
  preference: OptionalConsentPreferenceName,
  enabled: boolean,
) {
  if (preference === "analytics") {
    return enabled
      ? "서비스 개선을 위한 이용 데이터 수집을 켰어요."
      : "앞으로 선택형 이용 데이터를 저장하지 않아요.";
  }
  return enabled
    ? "뉴앙의 새 소식을 이메일로 받도록 설정했어요."
    : "광고성 소식을 받지 않도록 설정했어요.";
}
