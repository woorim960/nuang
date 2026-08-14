"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  resultContinuityCopy,
  type ResultContinuityKind,
  type ResultContinuityState,
} from "./result-continuity";
import styles from "./ResultContinuityCard.module.css";

export function ResultContinuityCard({
  kind,
  loginHref,
  modalOpen = false,
  state,
}: {
  kind: ResultContinuityKind;
  loginHref: string;
  modalOpen?: boolean;
  state: ResultContinuityState;
}) {
  const inlineRef = useRef<HTMLElement>(null);
  const [inlinePassed, setInlinePassed] = useState(false);
  const [dockDismissed, setDockDismissed] = useState(false);

  useEffect(() => {
    const target = inlineRef.current;
    if (!target) return;

    const updateInlinePosition = () => {
      // 카드가 아직 화면 아래에 있을 때는 도크를 먼저 보여주지 않습니다.
      // 사용자가 카드 전체를 읽고 위로 지나간 뒤에만 짧은 저장 도크를 띄웁니다.
      setInlinePassed(target.getBoundingClientRect().bottom < 0);
    };

    updateInlinePosition();
    window.addEventListener("resize", updateInlinePosition);
    window.addEventListener("scroll", updateInlinePosition, { passive: true });
    return () => {
      window.removeEventListener("resize", updateInlinePosition);
      window.removeEventListener("scroll", updateInlinePosition);
    };
  }, [state]);

  if (state === "checking") return null;

  if (state === "saved") {
    return (
      <section
        aria-live="polite"
        className={`${styles.section} ${styles.saved}`}
        ref={inlineRef}
      >
        <p className={styles.eyebrow}>저장 완료</p>
        <h2>이 결과를 내 기록에 저장했어요</h2>
        <p className={styles.description}>
          이제 다른 기기에서도 다시 볼 수 있어요.
          {kind === "lab" ? " 이 결과는 뉴앙코드에는 반영되지 않아요." : ""}
        </p>
        <Link className={styles.textLink} href="/my/reports/history">
          내 기록 보기
        </Link>
      </section>
    );
  }

  const copy = resultContinuityCopy[kind];
  const isSaving = state === "saving";
  const isError = state === "error";
  const showDock =
    state === "guest" && inlinePassed && !dockDismissed && !modalOpen;

  return (
    <>
      <section
        aria-labelledby={`result-continuity-${kind}`}
        className={styles.section}
        ref={inlineRef}
      >
        <p className={styles.eyebrow}>
          {isSaving
            ? "내 기록에 연결 중"
            : isError
              ? "현재 이 브라우저에 보관 중"
              : "지금은 이 브라우저에만 보관 중"}
        </p>
        <h2 id={`result-continuity-${kind}`}>
          {isSaving
            ? "로그인했어요. 이번 결과를 저장하고 있어요"
            : isError
              ? "결과는 아직 이 브라우저에 남아 있어요"
              : "로그인하고 이번 결과를 내 기록에 이어가세요"}
        </h2>
        <p
          className={styles.description}
          role={isError ? "alert" : undefined}
        >
          {isSaving
            ? "리포트는 계속 볼 수 있어요. 저장이 끝나면 이곳에서 바로 알려드릴게요."
            : isError
              ? "저장을 마치지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요."
              : copy.description}
        </p>

        {!isSaving ? (
          <ul className={styles.benefits}>
            {copy.benefits.map((benefit) => (
              <li key={benefit}>
                <Check aria-hidden="true" size={16} strokeWidth={2.2} />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {state === "guest" || isError ? (
          <Link className={styles.primaryAction} href={loginHref}>
            {isError ? "다시 저장" : "로그인하고 결과 저장"}
          </Link>
        ) : (
          <span aria-live="polite" className={styles.savingStatus} role="status">
            결과 저장 중…
          </span>
        )}

        {state === "guest" ? (
          <button
            className={styles.continueButton}
            onClick={() => setDockDismissed(true)}
            type="button"
          >
            지금은 리포트 계속 보기
          </button>
        ) : null}

        <p className={styles.trustCopy}>
          저장한 결과 요약은 프로필에 공개되며 설정에서 언제든 비공개로 바꿀
          수 있어요. 개별 답변과 원점수는 공개되지 않아요.
        </p>
        <p className={styles.linkGuide}>
          다른 기기나 사람에게 보낼 때는 주소창 주소 대신 상단의 공유 버튼으로
          만든 링크를 이용해 주세요.
        </p>
      </section>

      {showDock ? (
        <aside aria-label="결과 저장 안내" className={styles.dock}>
          <Link href={loginHref}>로그인하고 이번 결과 저장</Link>
          <button
            aria-label="저장 안내 닫기"
            onClick={() => setDockDismissed(true)}
            type="button"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
        </aside>
      ) : null}
    </>
  );
}
