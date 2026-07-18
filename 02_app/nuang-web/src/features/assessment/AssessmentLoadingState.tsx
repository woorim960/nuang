"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { AssessmentMode } from "@/features/assessment/types";
import styles from "@/features/assessment/AssessmentCompletionState.module.css";

const loadingMessages = [
  "질문을 불러오고 있어요",
  "화면을 정리하고 있어요",
  "곧 첫 질문을 보여드릴게요",
] as const;

export function AssessmentLoadingState({
  mode,
}: {
  mode: AssessmentMode;
}) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 1_300);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main aria-busy="true" className={styles.root}>
      <header className={styles.header}>
        <span aria-hidden="true" />
        <div className={styles.headerCopy}>
          <p>{mode === "quick" ? "빠른 코어" : "정밀 코어"}</p>
          <span>검사를 준비하는 중</span>
        </div>
        <span aria-label="문항 수를 확인하는 중" className={styles.count}>
          — / —
        </span>
      </header>

      <div
        aria-label="검사 준비 진행률"
        aria-valuetext="검사 화면을 준비하고 있어요"
        className={styles.progressTrack}
        role="progressbar"
      >
        <span className={styles.progressPending} />
      </div>

      <section className={styles.content}>
        <div className={styles.visual}>
          <span aria-hidden="true" className={styles.glow} />
          <span
            aria-hidden="true"
            className={`${styles.signal} ${styles.signalOne}`}
          />
          <span
            aria-hidden="true"
            className={`${styles.signal} ${styles.signalTwo}`}
          />
          <span
            aria-hidden="true"
            className={`${styles.signal} ${styles.signalThree}`}
          />
          <span
            aria-hidden="true"
            className={`${styles.signal} ${styles.signalFour}`}
          />
          <span
            aria-hidden="true"
            className={`${styles.signal} ${styles.signalFive}`}
          />
          <span aria-hidden="true" className={styles.mascotShadow} />
          <Image
            alt="성향 신호를 모아 빛나는 핵을 품은 뉴앙 캐릭터"
            className={styles.mascot}
            height={512}
            priority
            src="/assets/assessment/nuang-loading-mascot-v2.png"
            width={512}
          />
        </div>

        <div className={styles.copy}>
          <h1>검사를 준비하고 있어요</h1>
          <p>답하기 편한 화면을 준비하고 있어요.</p>
          <p aria-live="polite" className={styles.liveStatus} role="status">
            <span aria-hidden="true" className={styles.liveDot} />
            {loadingMessages[messageIndex]}
          </p>
        </div>
      </section>

      <footer className={styles.actionSlot}>
        <p className={styles.statusNote}>준비가 끝나면 바로 시작할게요.</p>
      </footer>
    </main>
  );
}
