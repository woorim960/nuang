"use client";

import { useEffect } from "react";

const initialSyncFallbackDelayMs = 400;
const initialSyncIdleTimeoutMs = 1_500;
const visibilitySyncMinimumIntervalMs = 60_000;

/**
 * 로그인 직후나 다른 기기에서 돌아왔을 때 검사 기록을 조용히 맞춥니다.
 * 화면 전환이나 로컬 저장을 기다리게 하지 않는 전역 안전망입니다.
 */
export function AssessmentSyncCoordinator() {
  useEffect(() => {
    let active = true;
    let idleCallbackId: number | null = null;
    let fallbackTimerId: number | null = null;
    let lastSyncStartedAt = 0;

    const synchronize = async (force = false) => {
      if (!active) return;
      const now = Date.now();
      if (
        !force &&
        lastSyncStartedAt > 0 &&
        now - lastSyncStartedAt < visibilitySyncMinimumIntervalMs
      ) {
        return;
      }
      lastSyncStartedAt = now;
      const { synchronizeAccountAssessmentAttempts } = await import(
        "@/features/assessment/assessment-account-sync"
      );
      if (!active) return;
      void synchronizeAccountAssessmentAttempts();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void synchronize();
    };

    if (typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(() => void synchronize(), {
        timeout: initialSyncIdleTimeoutMs,
      });
    } else {
      fallbackTimerId = window.setTimeout(
        () => void synchronize(),
        initialSyncFallbackDelayMs,
      );
    }
    const handleOnline = () => void synchronize(true);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      if (idleCallbackId !== null) {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (fallbackTimerId !== null) {
        window.clearTimeout(fallbackTimerId);
      }
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
