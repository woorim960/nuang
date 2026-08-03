"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { onboardingEntryContract } from "@/features/onboarding/onboarding-storage";
import { resolveHasSeenOnboarding } from "@/features/onboarding/onboarding-sync";
import styles from "@/features/onboarding/EntryGate.module.css";

export function EntryGate() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    void resolveHasSeenOnboarding().then((hasSeen) => {
      if (!active) return;
      router.replace(
        hasSeen
          ? onboardingEntryContract.completedDestination
          : onboardingEntryContract.firstVisitDestination,
      );
    });

    return () => {
      active = false;
    };
  }, [router]);

  return <EntryLoadingState />;
}

export function OnboardingHomeGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    void resolveHasSeenOnboarding().then((hasSeen) => {
      if (!active) return;
      if (hasSeen) {
        setReady(true);
      } else {
        router.replace(onboardingEntryContract.firstVisitDestination);
      }
    });

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
