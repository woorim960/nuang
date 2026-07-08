import {
  MessageCircleQuestion,
  RefreshCcw,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

const reportSections = [
  {
    icon: ShieldCheck,
    title: "공통점",
    body: "두 사람이 함께 쓰기 쉬운 대화 기반을 요약합니다.",
  },
  {
    icon: Scale,
    title: "차이점",
    body: "점수 순위가 아니라 조율이 필요한 차이를 보여줍니다.",
  },
  {
    icon: MessageCircleQuestion,
    title: "대화 질문",
    body: "상대 공개 범위 안에서 꺼내기 쉬운 질문만 제안합니다.",
  },
  {
    icon: SlidersHorizontal,
    title: "조절 가이드",
    body: "갈등 예측 대신 서로 맞춰볼 행동 단서를 정리합니다.",
  },
] as const;

const accessRules = [
  "상대 공개 범위 재평가",
  "active 공개 스냅샷 필요",
  "궁합 점수 없음",
] as const;

export function PublicComparisonReportPreview() {
  const closedState = createApiClosedPayload("public_comparison_db_write_pending");

  return (
    <section className="grid gap-5">
      <header>
        <StatusPill tone="primary">1:1 비교 미리보기</StatusPill>
        <h1 className="mt-3 text-2xl font-black">공개 범위 안에서만 비교해요</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          실제 비교 리포트는 서버 연결 후 열립니다. 지금은 리포트의 구성과
          접근 안전선만 미리 확인할 수 있어요.
        </p>
      </header>

      <div className="rounded-lg border border-primary/20 bg-surface-soft p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-primary">
            <RefreshCcw aria-hidden="true" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold">비교 생성 준비 상태</h2>
              <StatusPill tone="neutral">서버 준비 중</StatusPill>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">
              {closedState.display.message} {closedState.display.nextStep}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {accessRules.map((rule) => (
            <span
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-muted"
              key={rule}
            >
              {rule}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {reportSections.map((section) => {
          const Icon = section.icon;

          return (
            <article className="rounded-lg border border-line bg-white p-4" key={section.title}>
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
                  <Icon aria-hidden="true" size={18} />
                </div>
                <div>
                  <h2 className="font-bold">{section.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">{section.body}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ButtonLink className="w-full" href="/together" variant="secondary">
        함께 탭으로
      </ButtonLink>
    </section>
  );
}
