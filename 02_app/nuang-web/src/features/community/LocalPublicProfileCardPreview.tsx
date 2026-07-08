"use client";

import { Eye, LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { getLatestCompletedAttempt } from "@/features/assessment/assessment-storage";
import {
  fullCoreAssessment,
  fullScoringRelease,
} from "@/features/assessment/full-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { createPublicProfileCardPayload } from "@/features/community/public-profile-card-contract";
import { createPublicProfileSnapshotPayload } from "@/features/together/public-comparison-contract";
import { calculateCoreScore } from "@/lib/scoring/core";
import type { ItemResponse } from "@/lib/scoring/types";

const motifByPrefix = {
  SC: "forest",
  SV: "water",
  TC: "sun",
  TV: "flame",
} as const;

export function LocalPublicProfileCardPreview() {
  const [attempt, setAttempt] = useState<LocalAssessmentAttempt | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getLatestCompletedAttempt(fullCoreAssessment.assessmentId).then(
      (nextAttempt) => {
        if (!isMounted) return;
        setAttempt(nextAttempt ?? null);
        setLoaded(true);
      },
    );

    return () => {
      isMounted = false;
    };
  }, []);

  const card = useMemo(() => {
    if (!attempt) return null;

    const responses: ItemResponse[] = Object.values(attempt.responses).map(
      (response) => ({
        itemId: response.itemId,
        isUnsure: response.isUnsure,
        value: response.value,
      }),
    );
    const result = calculateCoreScore(fullScoringRelease, responses);
    const code = result.code ?? "-----";
    const prefix = code.slice(0, 2) as keyof typeof motifByPrefix;
    const snapshot = createPublicProfileSnapshotPayload({
      createdAt: attempt.completedAt ?? attempt.updatedAt,
      displayProfile: {
        displayName: "탐험가",
        motif: motifByPrefix[prefix] ?? "purple",
      },
      result,
      snapshotId: "local-public-preview",
    });

    return createPublicProfileCardPayload({
      cardId: "local-public-profile-card-preview",
      snapshot,
    });
  }, [attempt]);

  if (!loaded) {
    return (
      <div
        aria-live="polite"
        className="rounded-lg border border-line bg-white p-4 text-sm text-muted"
        role="status"
      >
        공개 카드 미리보기 확인 중
      </div>
    );
  }

  if (!card) {
    return (
      <article className="rounded-lg border border-dashed border-line bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-surface-soft text-muted">
            <LockKeyhole aria-hidden="true" size={19} />
          </div>
          <div className="min-w-0">
            <StatusPill tone="neutral">이 기기 기준</StatusPill>
            <h3 className="mt-2 font-bold">내 공개 프로필 카드</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              정밀 코어를 완료하면 대표 성향과 성향지도 요약으로 공개 카드
              미리보기를 만들 수 있어요.
            </p>
          </div>
        </div>
        <ButtonLink
          className="mt-4 w-full"
          href="/assessments/nu-core-full"
          variant="secondary"
        >
          정밀 코어 시작
        </ButtonLink>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex items-start gap-3 bg-surface-soft p-4">
        <NuangCharacter motif={card.display.motif} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="primary">내 공개 카드 미리보기</StatusPill>
            <StatusPill tone="neutral">아직 미공개</StatusPill>
          </div>
          <h3 className="mt-3 text-lg font-black leading-6">
            {card.display.profileName}
          </h3>
          <p className="mt-1 text-sm font-semibold text-muted">
            {card.display.code} · {card.display.displayName}
          </p>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          {card.highlights.domainHighlights.map((axis) => (
            <div className="rounded-lg bg-surface-soft p-3" key={axis.id}>
              <p className="text-xs font-semibold text-muted">{axis.label}</p>
              <p className="mt-1 text-xl font-black text-primary">
                {axis.score ?? "-"}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm leading-6 text-muted">
          5영역 요약과 {card.highlights.facetSummaryCount}개 세부 성향 요약만
          공개 카드에 사용합니다.
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm font-semibold text-muted">
          <Eye aria-hidden="true" className="shrink-0 text-primary" size={16} />
          <span>직접 응답, 원점수, 민감 항목은 포함하지 않아요.</span>
        </div>
      </div>
    </article>
  );
}
