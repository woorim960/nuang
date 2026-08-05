"use client";

import { useCallback, useSyncExternalStore } from "react";
import { enqueueAssessmentQualityObservations } from "./assessment-quality-client";
import styles from "./AssessmentResultQualityPrompt.module.css";

type ResultFit = "high" | "low" | "middle";

const resultFitOptions: Array<{ label: string; value: ResultFit }> = [
  { label: "잘 맞아요", value: "high" },
  { label: "대체로 맞아요", value: "middle" },
  { label: "조금 달라요", value: "low" },
];
const fitStorageChangeEvent = "nuang:assessment-result-fit-change";

export function AssessmentResultQualityPrompt({
  assessmentSlug,
  instrumentVersion,
  localResultId,
  productReleaseId,
}: {
  assessmentSlug: string;
  instrumentVersion: string;
  localResultId: string;
  productReleaseId?: string;
}) {
  const responseStorageKey = `nuang:assessment-result-fit:${instrumentVersion}:${localResultId}`;
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(fitStorageChangeEvent, onStoreChange);
    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener(fitStorageChangeEvent, onStoreChange);
    };
  }, []);
  const getSnapshot = useCallback(
    () => readStoredFit(responseStorageKey),
    [responseStorageKey],
  );
  const fit = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function submitFit(nextFit: ResultFit) {
    writeStorageItem(responseStorageKey, nextFit);
    enqueueAssessmentQualityObservations({
      assessmentSlug,
      instrumentVersion,
      localResultId,
      ...(productReleaseId ? { productReleaseId } : {}),
      observations: [{ fit: nextFit, kind: "result_fit" }],
    });
  }

  return (
    <section
      aria-labelledby="assessment-result-fit-title"
      className={styles.root}
    >
      <p>결과 한 번 확인해 주세요</p>
      <h2 id="assessment-result-fit-title">
        이번 결과가 나와 얼마나 잘 맞았나요?
      </h2>
      {fit ? (
        <span role="status">
          답해 주셔서 고마워요. 다음 문항과 리포트를 다듬는 데 바로 반영할게요.
        </span>
      ) : (
        <div aria-label="결과 적합도" role="group">
          {resultFitOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => submitFit(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function readStorageItem(key: string) {
  try {
    return typeof window.localStorage?.getItem === "function"
      ? window.localStorage.getItem(key)
      : null;
  } catch {
    return null;
  }
}

function readStoredFit(key: string): ResultFit | null {
  const stored = readStorageItem(key);
  return stored === "high" || stored === "middle" || stored === "low"
    ? stored
    : null;
}

function getServerSnapshot() {
  return null;
}

function writeStorageItem(key: string, value: string) {
  try {
    if (typeof window.localStorage?.setItem === "function") {
      window.localStorage.setItem(key, value);
      window.dispatchEvent(new Event(fitStorageChangeEvent));
    }
  } catch {
    // 저장소를 사용할 수 없어도 한 번의 응답 경험은 유지합니다.
  }
}
