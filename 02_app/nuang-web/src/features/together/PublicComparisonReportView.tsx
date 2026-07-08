import {
  MessageCircleQuestion,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import type {
  PublicComparisonAxisDelta,
  PublicComparisonReportPayload,
} from "@/features/together/public-comparison-contract";

export function PublicComparisonReportView({
  report,
}: {
  report: PublicComparisonReportPayload;
}) {
  const { comparison } = report;

  return (
    <section className="grid gap-5">
      <header>
        <StatusPill tone="primary">1:1 비교 리포트</StatusPill>
        <h1 className="mt-3 text-2xl font-black">우리는 이렇게 달라요</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          상대가 공개한 범위 안에서만 만든 리포트예요. 직접 응답, 원점수,
          민감 항목은 사용하지 않습니다.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <ProfileCard
          label="나"
          name={comparison.viewer.profileName}
          code={comparison.viewer.code}
          displayName={comparison.viewer.displayName}
        />
        <ProfileCard
          label="상대"
          name={comparison.target.profileName}
          code={comparison.target.code}
          displayName={comparison.target.displayName}
        />
      </div>

      <div className="rounded-lg border border-line bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <ShieldCheck aria-hidden="true" size={18} />
          </div>
          <div>
            <h2 className="font-bold">접근 안전선</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              공개 범위가 바뀌면 이 리포트도 다시 확인합니다.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill tone="neutral">궁합 점수 없음</StatusPill>
          <StatusPill tone="neutral">순위 없음</StatusPill>
          <StatusPill tone="neutral">비공개 추정 없음</StatusPill>
        </div>
      </div>

      <AxisDeltaSection
        deltas={comparison.sections.commonGround}
        icon={<UsersRound aria-hidden="true" size={18} />}
        title="공통점"
      />
      <AxisDeltaSection
        deltas={comparison.sections.differences}
        icon={<Scale aria-hidden="true" size={18} />}
        title="차이점"
      />
      <TextListSection
        icon={<MessageCircleQuestion aria-hidden="true" size={18} />}
        items={comparison.sections.conversationStarters}
        title="대화 질문"
      />
      <TextListSection
        icon={<SlidersHorizontal aria-hidden="true" size={18} />}
        items={comparison.sections.adjustmentGuide}
        title="조절 가이드"
      />
    </section>
  );
}

function ProfileCard({
  code,
  displayName,
  label,
  name,
}: {
  code: string;
  displayName: string;
  label: string;
  name: string;
}) {
  return (
    <article className="rounded-lg border border-line bg-white p-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <h2 className="mt-1 text-sm font-black leading-5">{name}</h2>
      <p className="mt-1 text-xs font-semibold text-muted">
        {code} · {displayName}
      </p>
    </article>
  );
}

function AxisDeltaSection({
  deltas,
  icon,
  title,
}: {
  deltas: PublicComparisonAxisDelta[];
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
          {icon}
        </div>
        <h2 className="font-bold">{title}</h2>
      </div>
      <div className="mt-3 grid gap-3">
        {deltas.map((delta) => (
          <div className="rounded-lg bg-surface-soft p-3" key={delta.domainId}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold">{delta.label}</p>
              <StatusPill tone={delta.difference >= 25 ? "caution" : "neutral"}>
                차이 {delta.difference}점
              </StatusPill>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-muted">
              <span>나 {delta.viewerScore}점</span>
              <span className="text-right">상대 {delta.targetScore}점</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TextListSection({
  icon,
  items,
  title,
}: {
  icon: ReactNode;
  items: string[];
  title: string;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
          {icon}
        </div>
        <h2 className="font-bold">{title}</h2>
      </div>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li className="rounded-lg bg-surface-soft px-3 py-2 text-sm leading-6 text-muted" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
