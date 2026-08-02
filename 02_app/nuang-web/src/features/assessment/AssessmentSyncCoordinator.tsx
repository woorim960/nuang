"use client";

import { useEffect } from "react";
import { synchronizeAccountAssessmentAttempts } from "@/features/assessment/assessment-account-sync";

/**
 * 로그인 직후나 다른 기기에서 돌아왔을 때 검사 기록을 조용히 맞춥니다.
 * 화면 전환이나 로컬 저장을 기다리게 하지 않는 전역 안전망입니다.
 */
export function AssessmentSyncCoordinator() {
  useEffect(() => {
    let active = true;

    const synchronize = () => {
      if (!active) return;
      void synchronizeAccountAssessmentAttempts();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") synchronize();
    };

    synchronize();
    window.addEventListener("online", synchronize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener("online", synchronize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
