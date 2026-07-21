"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { LocalResultView } from "@/features/result/LocalResultView";
import { MyTraitDetailView } from "@/features/account/MyTraitDetailView";
import styles from "./MyTraitDetailRoute.module.css";

export function MyTraitDetailRoute() {
  const [latestResultId, setLatestResultId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    listLocalAttempts()
      .then((attempts) => {
        if (!mounted) return;
        const completed = attempts.filter(isCompletedResult);
        const latestFull = completed.find(
          (attempt) => attempt.assessmentId === "nu-core-full",
        );
        setLatestResultId((latestFull ?? completed[0])?.id ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (mounted) setLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!loaded) {
    return <p className={styles.loading}>최근 결과를 불러오고 있어요.</p>;
  }

  if (latestResultId) {
    return <LocalResultView localResultId={latestResultId} />;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="마이로 돌아가기" href="/my">
          <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.7} />
        </Link>
        <p>결과 리포트</p>
        <span aria-hidden="true" />
      </header>
      <MyTraitDetailView />
    </main>
  );
}

function isCompletedResult(
  attempt: LocalAssessmentAttempt,
): attempt is LocalAssessmentAttempt & {
  resultSnapshot: NonNullable<LocalAssessmentAttempt["resultSnapshot"]>;
} {
  return (
    attempt.state === "completed" &&
    Boolean(attempt.resultSnapshot?.scoreResult?.code)
  );
}
