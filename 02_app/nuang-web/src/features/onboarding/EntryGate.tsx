"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import {
  hasCompletedOnboarding,
  onboardingEntryContract,
} from "@/features/onboarding/onboarding-storage";
import styles from "@/features/onboarding/EntryGate.module.css";

export function EntryGate() {
  const router = useRouter();

  useEffect(() => {
    router.replace(
      hasCompletedOnboarding()
        ? onboardingEntryContract.completedDestination
        : onboardingEntryContract.firstVisitDestination,
    );
  }, [router]);

  return <EntryLoadingState />;
}

export function OnboardingHomeGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    if (hasCompletedOnboarding()) {
      queueMicrotask(() => {
        if (active) setReady(true);
      });
    } else {
      router.replace(onboardingEntryContract.firstVisitDestination);
    }

    return () => {
      active = false;
    };
  }, [router]);

  return ready ? children : <EntryLoadingState />;
}

function EntryLoadingState() {
  return (
    <main aria-busy="true" className={styles.root}>
      <div aria-hidden="true" className={styles.visual}>
        <span className={styles.orbit} />
        <span className={styles.core}>N</span>
      </div>
      <p className={styles.wordmark}>NUANG</p>
      <p aria-live="polite" className={styles.status} role="status">
        시작 화면을 준비하고 있어요
      </p>
    </main>
  );
}
