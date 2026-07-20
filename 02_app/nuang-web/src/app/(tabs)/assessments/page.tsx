import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { AssessmentHomeCoreSection } from "@/features/assessment/AssessmentHomeCoreSection";
import {
  openFreeTopicAssessments,
  plannedFreeTopicAssessments,
} from "@/features/assessment/free-topic-assessments";
import { labAssessments } from "@/features/lab/lab-assessments";

export default function AssessmentsPage() {
  return (
    <div className="grid gap-5">
      <header>
        <div>
          <p className="text-sm font-black text-primary">NUANG TEST</p>
          <h1 className="mt-2 text-2xl font-black">검사</h1>
          <p className="mt-1 text-sm text-muted">
            무료 코어부터 가벼운 주제 검사까지, 나를 알아가는 시작점이에요.
          </p>
        </div>
      </header>

      <AssessmentHomeCoreSection />

      <section className="grid gap-3">
        <div>
          <p className="text-xs font-black text-primary">함께 해보기</p>
          <h2 className="mt-1 text-base font-bold">친구 성향 맞히기</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            같은 질문에 내가 답하고 친구의 선택도 예상해 보세요. 친구가 직접
            답하면 두 사람의 관점을 함께 볼 수 있어요.
          </p>
        </div>
        <Link
          aria-label="친구 성향 맞히기 시작"
          className="flex min-h-20 items-center justify-between gap-3 border-y border-line py-4"
          href="/assessments/friend-match"
        >
          <div className="min-w-0">
            <p className="font-bold">친구와 한 질문씩 맞혀보기</p>
            <p className="mt-1 text-sm text-muted">가볍게 참여 · 약 3분</p>
          </div>
          <ChevronRight
            aria-hidden="true"
            className="shrink-0 text-muted"
            size={18}
          />
        </Link>
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="text-base font-bold">무료 주제 검사</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            짧은 검사를 할수록 내 성향 해석이 더 선명해져요.
          </p>
        </div>
        {openFreeTopicAssessments.map((assessment) => (
          <Link
            aria-label={`${assessment.title}: ${assessment.caption}, 약 ${assessment.estimatedMinutes}분`}
            className="flex min-h-20 items-center justify-between gap-3 border-t border-line py-4"
            href={`/assessments/topics/${assessment.slug}`}
            key={assessment.slug}
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-muted">
                {assessment.categoryLabel}
              </p>
              <h3 className="mt-1 font-bold">{assessment.title}</h3>
              <p className="mt-1 text-sm text-muted">
                {assessment.caption} · 약 {assessment.estimatedMinutes}분
              </p>
            </div>
            <ChevronRight
              aria-hidden="true"
              className="shrink-0 text-muted"
              size={18}
            />
          </Link>
        ))}
        <div className="border-t border-line pt-4">
          <p className="text-sm font-bold">다음 업데이트 예정</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {plannedFreeTopicAssessments
              .map((assessment) => assessment.title)
              .join(", ")}
            도 순차적으로 추가됩니다.
          </p>
        </div>
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="text-base font-bold">별난 성향 연구소</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            무료로 즐기는 생활형 주제 검사예요. 공식 성향지도에는 반영하지
            않아요.
          </p>
        </div>
        {labAssessments.map((assessment) => (
          <Link
            aria-label={`${assessment.cardTitle}: ${assessment.caption}, 약 ${assessment.estimatedMinutes}분`}
            className="flex min-h-24 items-center justify-between gap-3 border-t border-line py-4"
            href={`/labs/${assessment.slug}`}
            key={assessment.slug}
          >
            <div className="min-w-0">
              <h3 className="font-bold">{assessment.cardTitle}</h3>
              <p className="mt-1 text-sm text-muted">
                {assessment.caption} · 약 {assessment.estimatedMinutes}분
              </p>
              <p className="mt-2 text-xs font-semibold text-muted">
                코어 미반영 · 서버 전송 없음 · 공유 닫힘 ·{" "}
                {assessment.sensitivity}
              </p>
            </div>
            <ChevronRight
              aria-hidden="true"
              className="shrink-0 text-muted"
              size={18}
            />
          </Link>
        ))}
      </section>

      <Link
        aria-label="도움 연결 허브 열기"
        className="flex items-start justify-between gap-3 border-t border-line py-4"
        href="/help"
      >
        <div className="min-w-0 flex-1">
          <StatusPill tone="caution">도움 연결 허브</StatusPill>
          <h2 className="mt-3 text-lg font-bold">혼자 견디기 어려운 순간</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            위기와 치료가 필요한 주제는 점수화하지 않고, 안전한 도움 정보로만
            연결합니다.
          </p>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="mt-2 shrink-0 text-muted"
          size={18}
        />
      </Link>
    </div>
  );
}
