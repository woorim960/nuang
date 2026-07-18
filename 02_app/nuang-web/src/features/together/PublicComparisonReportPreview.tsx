import {
  MessageCircleQuestion,
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
    title: "핵심 요약",
    body: "가까운 자리와 신호를 맞출 자리를 먼저 정리합니다.",
  },
  {
    icon: Scale,
    title: "뉴앙 코드 비교",
    body: "점수 순위가 아니라 공개된 뉴앙 코드의 관계 리듬을 보여줍니다.",
  },
  {
    icon: MessageCircleQuestion,
    title: "대화 가이드",
    body: "상대 공개 범위 안에서 꺼내기 쉬운 질문만 제안합니다.",
  },
  {
    icon: SlidersHorizontal,
    title: "조율 가이드",
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

      <div className="border-y border-line py-4">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={18} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold">비교 생성 준비 상태</h2>
              <StatusPill tone="neutral">준비 중</StatusPill>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">
              {closedState.display.message} {closedState.display.nextStep}
            </p>
          </div>
        </div>
        <div className="mt-4 grid divide-y divide-line text-sm font-semibold text-muted">
          {accessRules.map((rule) => (
            <p className="py-2 first:pt-0 last:pb-0" key={rule}>
              {rule}
            </p>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {reportSections.map((section) => {
          const Icon = section.icon;

          return (
            <article className="border-t border-line py-4 first:border-t-0 first:pt-0" key={section.title}>
              <div className="flex items-start gap-3">
                <Icon aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={18} />
                <div>
                  <h2 className="font-bold">{section.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">{section.body}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ButtonLink className="w-full" href="/my/reports" variant="secondary">
        내 리포트로
      </ButtonLink>
    </section>
  );
}
