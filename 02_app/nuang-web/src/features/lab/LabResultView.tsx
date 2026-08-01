"use client";

import {
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  RotateCcw,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import type { NuangCharacterMotif } from "@/components/character/nuang-character-assets";
import { AssessmentBottomSheet } from "@/features/assessment/AssessmentQuestionControls";
import { type LabAssessment } from "@/features/lab/lab-assessments";
import {
  deleteLabResult,
  loadLabResult,
  loadLabResultById,
  syncLabResult,
  type StoredLabResult,
} from "@/features/lab/lab-storage";
import { ReportShareSheet } from "@/features/share/ReportShareSheet";
import { buildLabReportShareContent } from "@/features/share/report-share-contract";
import styles from "./LabResultView.module.css";

const motifBySlug: Record<string, NuangCharacterMotif> = {
  "conflict-repair": "water",
  "conversation-temperature": "purple",
  "recharge-ritual": "sun",
};

export function LabResultView({
  answeredCountOverride,
  assessment,
  backHref = "/home?view=lab",
  canonicalShareUrl,
  initialResult,
  localResultId,
  readOnly = false,
  shareEnabled = true,
}: {
  answeredCountOverride?: number;
  assessment: LabAssessment;
  backHref?: string;
  canonicalShareUrl?: string;
  initialResult?: StoredLabResult;
  localResultId?: string;
  readOnly?: boolean;
  shareEnabled?: boolean;
}) {
  const router = useRouter();
  const [storedResult, setStoredResult] = useState<StoredLabResult | null>(
    initialResult ?? null,
  );
  const [loaded, setLoaded] = useState(Boolean(initialResult));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (initialResult) return;

    window.setTimeout(() => {
      const selectedResult = localResultId
        ? loadLabResultById(localResultId)
        : null;
      const nextResult =
        selectedResult?.slug === assessment.slug
          ? selectedResult
          : loadLabResult(assessment.slug);
      setStoredResult(nextResult);
      setLoaded(true);
      if (nextResult && nextResult.sync?.status !== "synced") {
        void syncLabResult({
          ...nextResult,
          contentVersion:
            nextResult.contentVersion ?? assessment.contentVersion,
        }).then(setStoredResult);
      }
    }, 0);
  }, [
    assessment.contentVersion,
    assessment.slug,
    initialResult,
    localResultId,
  ]);

  if (!loaded) {
    return (
      <main aria-busy="true" className={styles.loading}>
        <NuangCharacter motif={motifBySlug[assessment.slug]} size="lg" />
        <h1>결과를 정리하고 있어요</h1>
        <p aria-live="polite" role="status">
          내 답에서 자주 나타난 모습을 살펴보는 중
        </p>
      </main>
    );
  }

  if (!storedResult) {
    return (
      <main className={styles.root}>
        <header className={styles.appBar}>
          <Link aria-label="이전 화면으로 돌아가기" href={backHref}>
            <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.75} />
          </Link>
          <p>검사 결과</p>
          <span aria-hidden="true" />
        </header>
        <section className={styles.missing}>
          <NuangCharacter motif={motifBySlug[assessment.slug]} size="lg" />
          <h1>아직 결과가 없어요</h1>
          <p>짧게 답하고 지금 나와 가까운 생활 방식을 살펴보세요.</p>
          <Link href={`/labs/${assessment.slug}`}>
            검사 시작하기
            <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
          </Link>
        </section>
      </main>
    );
  }

  const { profile, scores, tiedProfileIds } = storedResult.result;
  const selectedLocalResultId = storedResult.localResultId;
  const answeredCount =
    answeredCountOverride ?? Object.keys(storedResult.answers).length;
  const totalSelections = Math.max(
    1,
    Object.values(scores).reduce((total, value) => total + value, 0),
  );
  const hasTie = tiedProfileIds.length > 1;
  const shareContent = buildLabReportShareContent({
    assessmentTitle: assessment.title,
    highlights: [
      ...profile.strengths.slice(0, 2),
      `관계에서는 이렇게 알려주세요: ${profile.relationTip}`,
    ],
    resultName: profile.title,
    summary: profile.summary,
  });
  const canShare = Boolean(
    shareEnabled && (canonicalShareUrl || storedResult.serverResultId),
  );

  function handleDelete() {
    deleteLabResult(selectedLocalResultId);
    router.replace("/home?view=lab");
  }

  return (
    <main className={styles.root}>
      <header className={styles.appBar}>
        <Link aria-label="이전 화면으로 돌아가기" href={backHref}>
          <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.75} />
        </Link>
        <p>검사 결과</p>
        <div className={styles.headerActions}>
          {canShare ? (
            <button
              aria-haspopup="dialog"
              aria-label="검사 결과 공유"
              onClick={() => setIsShareOpen(true)}
              ref={shareButtonRef}
              type="button"
            >
              <Share2 aria-hidden="true" size={19} strokeWidth={1.75} />
            </button>
          ) : null}
          {!readOnly ? (
            <button
              aria-label="결과 메뉴"
              onClick={() => setIsMenuOpen(true)}
              type="button"
            >
              <MoreHorizontal aria-hidden="true" size={21} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p>{assessment.resultLabel}</p>
            <h1>{profile.title}</h1>
            <span>{profile.summary}</span>
          </div>
          <NuangCharacter
            className={styles.character}
            motif={motifBySlug[assessment.slug]}
            size="lg"
          />
          <p className={styles.meta}>
            {formatCompletedDate(storedResult.completedAt)} · {answeredCount}개
            장면
          </p>
        </section>

        {hasTie ? (
          <section className={styles.tieNotice}>
            <strong>두 방식이 비슷하게 나타났어요</strong>
          </section>
        ) : null}

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>내 선택 분포</h2>
          </div>
          <div className={styles.distribution}>
            {assessment.profiles.map((item) => (
              <DistributionBar
                active={item.id === profile.id}
                key={item.id}
                label={item.shortTitle}
                value={scores[item.id] ?? 0}
                total={totalSelections}
              />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>잘 활용되는 모습</h2>
          </div>
          <div className={styles.editorialList}>
            {profile.strengths.map((strength, index) => (
              <article key={strength}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{strength}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>관계에서 편하게 맞추는 방법</h2>
          </div>
          <div className={styles.guideList}>
            <article>
              <h3>오해가 생기기 쉬운 순간</h3>
              <p>{profile.watch}</p>
            </article>
            <article>
              <h3>상대에게 알려주면 좋은 말</h3>
              <p>{profile.relationTip}</p>
            </article>
            <article>
              <h3>오늘 해볼 작은 시도</h3>
              <p>{profile.smallExperiment}</p>
            </article>
          </div>
        </section>

        <section className={styles.readingNote}>
          <h2>이 결과는</h2>
          <p>
            {answeredCount}개 장면에서 고른 답을 정리한 생활 방식이에요. 뉴앙
            코드에는 반영되지 않아요.
          </p>
        </section>

        <section className={styles.nextActions}>
          <Link className={styles.primaryAction} href="/home?view=lab">
            {readOnly ? "나도 검사해 보기" : "다른 검사 만나보기"}
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </Link>
          {readOnly ? (
            <Link className={styles.secondaryAction} href={backHref}>
              프로필로 돌아가기
            </Link>
          ) : (
            <Link
              className={styles.secondaryAction}
              href={`/labs/${assessment.slug}`}
            >
              <RotateCcw aria-hidden="true" size={17} strokeWidth={1.8} />
              다시 하기
            </Link>
          )}
        </section>
      </div>

      {!readOnly && isMenuOpen ? (
        <AssessmentBottomSheet
          onClose={() => setIsMenuOpen(false)}
          title="결과 관리"
        >
          <button
            className={styles.deleteMenuButton}
            onClick={() => {
              setIsMenuOpen(false);
              setIsDeleteOpen(true);
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" size={18} strokeWidth={1.75} />이 결과
            삭제
          </button>
        </AssessmentBottomSheet>
      ) : null}

      {!readOnly && isDeleteOpen ? (
        <AssessmentBottomSheet
          copy="삭제한 결과는 다시 불러올 수 없어요."
          onClose={() => setIsDeleteOpen(false)}
          title="결과를 삭제할까요?"
        >
          <div className={styles.deleteActions}>
            <button onClick={() => setIsDeleteOpen(false)} type="button">
              취소
            </button>
            <button onClick={handleDelete} type="button">
              삭제
            </button>
          </div>
        </AssessmentBottomSheet>
      ) : null}
      {canShare ? (
        <ReportShareSheet
          canonicalUrl={canonicalShareUrl}
          content={shareContent}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          onNavigate={(href) => router.push(href)}
          originalReportKey={
            storedResult.serverResultId
              ? `lab_${storedResult.serverResultId}`
              : undefined
          }
          returnFocusRef={shareButtonRef}
        />
      ) : null}
    </main>
  );
}

function formatCompletedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "오늘";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "long",
  }).format(date);
}

function DistributionBar({
  active,
  label,
  total,
  value,
}: {
  active: boolean;
  label: string;
  total: number;
  value: number;
}) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div className={styles.distributionRow} data-active={active}>
      <div>
        <span>{label}</span>
        <strong>{percentage}%</strong>
      </div>
      <div
        aria-label={`${label} ${percentage}퍼센트`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        className={styles.track}
        role="progressbar"
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
