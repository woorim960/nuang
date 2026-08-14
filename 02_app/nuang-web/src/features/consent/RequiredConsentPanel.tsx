"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { buildResultSaveLoginHref } from "@/features/result-persistence/result-continuity";
import { ConsentCheck } from "@/features/consent/ConsentCheck";
import {
  safeRequiredConsentReturnPath,
} from "@/features/consent/required-consent-contract";
import styles from "./AccountConnectPanel.module.css";

export function RequiredConsentPanel({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const safeNextPath = useMemo(
    () => safeRequiredConsentReturnPath(nextPath),
    [nextPath],
  );
  const [is14OrOlder, setIs14OrOlder] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const allChecked = is14OrOlder && terms && privacy;

  async function submitRequiredConsent() {
    if (!allChecked || pending) return;
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/me/required-consents", {
        body: JSON.stringify({ is14OrOlder, privacy, terms }),
        cache: "no-store",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        ok?: boolean;
      } | null;

      if (response.status === 401) {
        router.replace(buildResultSaveLoginHref(safeNextPath));
        return;
      }
      if (!response.ok || body?.ok !== true) {
        setMessage(
          body?.message ??
            "필수 동의를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        );
        return;
      }

      router.replace(safeNextPath);
      router.refresh();
    } catch {
      setMessage("연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="required-consent-title" className={styles.panel}>
      <div className={styles.intro}>
        <h2 id="required-consent-title">현재 필수 항목을 확인해 주세요</h2>
        <p>
          계정은 그대로 유지돼요. 확인을 마치면 보던 결과로 돌아가 저장을
          이어갑니다.
        </p>
      </div>

      <div className={styles.consentBox}>
        <ConsentCheck
          checked={allChecked}
          emphasis
          label="필수 항목 모두 동의"
          onChange={(checked) => {
            setIs14OrOlder(checked);
            setTerms(checked);
            setPrivacy(checked);
          }}
        />
        <div className={styles.consentGroup}>
          <ConsentCheck
            checked={is14OrOlder}
            label="만 14세 이상이며, 사실대로 확인했어요"
            onChange={setIs14OrOlder}
          />
          <ConsentCheck
            checked={terms}
            label="이용약관에 동의해요"
            onChange={setTerms}
          />
          <ConsentCheck
            checked={privacy}
            label="개인정보 수집·이용에 동의해요"
            onChange={setPrivacy}
          />
        </div>
        <details className={styles.requiredConsentNotice}>
          <summary>필수 개인정보 수집·이용 안내</summary>
          <dl>
            <div>
              <dt>목적</dt>
              <dd>로그인, 계정 관리, 검사 결과 저장과 커뮤니티 활동 제공</dd>
            </div>
            <div>
              <dt>항목</dt>
              <dd>
                소셜 로그인 식별값, 제공자가 전달한 이메일·이름·프로필 이미지,
                동의 기록, 저장한 검사 응답·결과와 커뮤니티 활동
              </dd>
            </div>
            <div>
              <dt>보유 기간</dt>
              <dd>
                계정 삭제 시까지. 법령상 보관이나 분쟁 대응이 필요한 정보는 해당
                기간 동안 분리 보관 후 삭제
              </dd>
            </div>
            <div>
              <dt>거부 권리와 영향</dt>
              <dd>
                동의를 거부할 수 있으며, 이 경우 계정 저장 기능은 이용할 수
                없습니다. 로그인 없는 일반 검사는 이용할 수 있습니다.
              </dd>
            </div>
          </dl>
        </details>
      </div>

      <p className={styles.policyCopy}>
        자세한 내용은 <Link href="/policies/terms">이용약관</Link>과{" "}
        <Link href="/policies/privacy">개인정보 처리방침</Link>에서 확인할 수
        있습니다.
      </p>

      <button
        aria-busy={pending}
        className={styles.consentSubmit}
        disabled={!allChecked || pending}
        onClick={() => void submitRequiredConsent()}
        type="button"
      >
        {pending ? (
          <LoaderCircle
            aria-hidden="true"
            className={styles.spinner}
            size={18}
          />
        ) : null}
        {pending ? "저장 중" : "동의하고 결과로 돌아가기"}
      </button>

      {!allChecked ? (
        <p aria-live="polite" className={styles.authHint}>
          세 가지 필수 항목을 모두 확인해 주세요.
        </p>
      ) : null}
      {message ? (
        <p aria-live="polite" className={styles.statusNotice} role="alert">
          {message}
        </p>
      ) : null}
    </section>
  );
}
