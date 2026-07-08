"use client";

import { ArrowLeft, FlaskConical } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { type LabAssessment } from "@/features/lab/lab-assessments";
import { loadLabResult, type StoredLabResult } from "@/features/lab/lab-storage";

export function LabResultView({ assessment }: { assessment: LabAssessment }) {
  const [storedResult, setStoredResult] = useState<StoredLabResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      setStoredResult(loadLabResult(assessment.slug));
      setLoaded(true);
    }, 0);
  }, [assessment.slug]);

  if (!loaded) {
    return (
      <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
        <div className="rounded-lg border border-line bg-white p-5 text-sm text-muted">
          결과 불러오는 중
        </div>
      </main>
    );
  }

  if (!storedResult) {
    return (
      <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
        <MissingLabResult assessment={assessment} />
      </main>
    );
  }

  const { profile, scores, tiedProfileIds } = storedResult.result;
  const hasTie = tiedProfileIds.length > 1;
  const contentVersion = storedResult.contentVersion ?? assessment.contentVersion;
  const answeredCount = Object.keys(storedResult.answers).length;

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-muted"
        href="/assessments"
      >
        <ArrowLeft size={18} />
        검사
      </Link>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="primary">{assessment.resultLabel}</StatusPill>
              <StatusPill tone="neutral">{assessment.sensitivity}</StatusPill>
              <StatusPill tone="neutral">문구 v{toDisplayVersion(contentVersion)}</StatusPill>
            </div>
            <h1 className="mt-4 text-2xl font-black leading-8">{profile.title}</h1>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <FlaskConical size={23} />
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">{profile.summary}</p>
        <p className="mt-3 text-xs leading-5 text-muted">
          검사일 {formatCompletedDate(storedResult.completedAt)} · 응답 {answeredCount}개 ·
          로컬 저장 결과
        </p>
        {hasTie && (
          <p className="mt-3 rounded-lg bg-[#fff7e8] p-3 text-sm leading-6 text-muted">
            가까운 결과가 두 개 이상 나왔어요. 이런 경우에는 제목보다 아래
            설명 중 지금 더 와닿는 문장을 기준으로 봐주세요.
          </p>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <h2 className="text-base font-bold">잘 드러날 수 있는 점</h2>
        <div className="mt-3 grid gap-2">
          {profile.strengths.map((strength) => (
            <p
              className="rounded-lg bg-surface-soft px-3 py-2 text-sm leading-6 text-muted"
              key={strength}
            >
              {strength}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-3 rounded-lg border border-line bg-white p-4">
        <h2 className="text-base font-bold">생활 속 참고</h2>
        <InfoLine label="살펴볼 점" value={profile.watch} />
        <InfoLine label="관계 팁" value={profile.relationTip} />
        <InfoLine label="작은 실험" value={profile.smallExperiment} />
      </section>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <h2 className="text-base font-bold">결과 분포</h2>
        <div className="mt-3 grid gap-2">
          {assessment.profiles.map((item) => (
            <DistributionBar
              key={item.id}
              label={item.shortTitle}
              value={scores[item.id] ?? 0}
              max={assessment.questions.length}
            />
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <h2 className="text-base font-bold">읽을 때 기억할 점</h2>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-muted">
          <p>{assessment.safetyNote}</p>
          <p>
            이 결과는 코어 성향지도와 5글자 코드를 바꾸지 않아요. 별난 성향
            연구소 안에서만 보는 가벼운 참고 결과입니다.
          </p>
          <p>
            결과 문구는 {assessment.contentVersion} 기준이며, 공개 전까지 내부
            QA를 계속 거칩니다.
          </p>
          <p>
            진단, 치료, 위험 판정, 관계 성공 예측, 채용·금융 판단에 사용할 수
            없어요.
          </p>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ButtonLink href={`/labs/${assessment.slug}`} variant="secondary">
          다시 하기
        </ButtonLink>
        <ButtonLink href="/assessments">검사 홈</ButtonLink>
      </div>
    </main>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm leading-6">
      <span className="font-semibold text-foreground">{label} </span>
      <span className="text-muted">{value}</span>
    </p>
  );
}

function formatCompletedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "알 수 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function toDisplayVersion(value: string) {
  const match = value.match(/v(\d+\.\d+)$/);
  return match?.[1] ?? value;
}

function DistributionBar({
  label,
  max,
  value,
}: {
  label: string;
  max: number;
  value: number;
}) {
  const width = Math.round((value / max) * 100);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#eceaf4]">
        <div
          aria-hidden="true"
          className="h-full rounded-full bg-primary"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MissingLabResult({ assessment }: { assessment: LabAssessment }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <StatusPill tone="neutral">결과 없음</StatusPill>
      <h1 className="mt-4 text-xl font-black">저장된 결과를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        이 기기에 남아 있는 별난 성향 연구소 결과가 없어요. 짧게 다시 확인할
        수 있습니다.
      </p>
      <ButtonLink className="mt-5 w-full" href={`/labs/${assessment.slug}`}>
        다시 하기
      </ButtonLink>
    </section>
  );
}
