import { ShieldCheck } from "lucide-react";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import { getNuangCodeLetterInsight } from "@/features/nuang-code/nuang-code-dictionary";
import type {
  PublicComparisonAxisDelta,
  PublicComparisonAxisInsight,
  PublicComparisonProfileCard,
  PublicComparisonReportPayload,
} from "@/features/together/public-comparison-contract";
import { cn } from "@/lib/utils/cn";

export function PublicComparisonReportView({
  report,
}: {
  report: PublicComparisonReportPayload;
}) {
  const { comparison } = report;
  const sections = comparison.sections;
  const axisComparisons = getAxisComparisons(sections);
  const summary = sections.summary ?? {
    body: "공개된 성향 정보를 기준으로 서로의 관계 리듬을 정리했어요.",
    closestAxisLabel: sections.commonGround[0]?.label ?? null,
    headline: "공개된 성향 정보를 기준으로 서로의 리듬을 확인했어요.",
    strongestDifferenceLabel: sections.differences[0]?.label ?? null,
  };

  return (
    <section className="mx-auto grid max-w-[520px] gap-7 pb-8 text-[#111111]">
      <header className="border-b border-[#eeeeee] pb-6 pt-1">
        <p className="text-xs font-bold text-[#737373]">1:1 비교 리포트</p>
        <h1 className="mt-4 text-[28px] font-black leading-9 tracking-normal">
          {summary.headline}
        </h1>
        <p className="mt-3 text-[15px] leading-6 text-[#555555]">
          {summary.body}
        </p>

        <section
          aria-label="비교 대상"
          className="mt-5 grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-stretch gap-2"
        >
          <ProfileCard label="나" profile={comparison.viewer} />
          <div className="grid place-items-center text-[11px] font-black text-[#8a8a8a]">
            VS
          </div>
          <ProfileCard label="상대" profile={comparison.target} />
        </section>
      </header>

      <section>
        <p className="text-xs font-bold text-[#737373]">
          핵심 요약
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <SummaryLine
            label="가장 가까운 코드 자리"
            value={summary.closestAxisLabel ?? "공개된 정보 기준으로 더 확인이 필요해요"}
          />
          <SummaryLine
            label="신호를 맞출 코드 자리"
            value={summary.strongestDifferenceLabel ?? "큰 차이가 선명하지 않아요"}
          />
        </div>
      </section>

      <section>
        <SectionTitle
          description="두 사람의 뉴앙 코드가 같은 자리와 다른 자리를 생활 장면으로 풀어봤어요."
          title="뉴앙 코드 비교"
        />
        <div className="mt-4 grid gap-5">
          {axisComparisons.map((axis) => (
            <AxisComparisonRow axis={axis} key={axis.domainId} />
          ))}
        </div>
      </section>

      <section className="border-t border-[#eeeeee] pt-5">
        <SectionTitle
          description="차이가 큰 축에서 실제 관계 장면으로 나타날 수 있는 부분이에요."
          title="오해가 생길 수 있는 장면"
        />
        <TextList items={sections.misunderstandingScenes ?? []} />
      </section>

      <section className="border-t border-[#eeeeee] pt-5">
        <SectionTitle
          description="서로를 추정하지 않고 확인하기 위한 질문이에요."
          title="대화 가이드"
        />
        <TextList items={sections.conversationStarters} />
      </section>

      <section className="border-t border-[#eeeeee] pt-5">
        <SectionTitle
          description="서로 다른 속도를 맞추기 위한 실천 문장이에요."
          title="조율 가이드"
        />
        <TextList items={sections.adjustmentGuide} />
      </section>

      <section className="border-t border-[#eeeeee] pt-5">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[#111111]" size={18} />
          <div>
            <h2 className="text-[15px] font-extrabold">공개 범위 기준</h2>
            <p className="mt-1 text-sm leading-6 text-[#666666]">
              이 리포트는 서로 공개된 성향 정보만 기준으로 만들었어요. 직접
              응답, 원점수, 민감 항목, 비공개 정보는 사용하지 않습니다.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function ProfileCard({
  label,
  profile,
}: {
  label: string;
  profile: PublicComparisonProfileCard;
}) {
  return (
    <article className="min-w-0 rounded-lg border border-[#eeeeee] bg-white p-3 text-center">
      <PublicProfileImageView
        className="mx-auto"
        image={profile.profileImage}
        size="md"
      />
      <p className="mt-3 text-xs font-bold text-[#8a8a8a]">{label}</p>
      <h2 className="mt-1 text-[15px] font-black leading-5">
        {profile.profileName}
      </h2>
      <p className="mt-2 font-mono text-[15px] font-black tracking-normal text-[#111111]">
        {profile.code}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-[#777777]">
        {profile.displayName}
      </p>
    </article>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#eeeeee] bg-[#fafafa] p-4">
      <p className="text-xs font-bold text-[#8a8a8a]">{label}</p>
      <p className="mt-1 text-[16px] font-extrabold leading-6">{value}</p>
    </div>
  );
}

function SectionTitle({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <header>
      <h2 className="text-[19px] font-black tracking-normal">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#666666]">{description}</p>
    </header>
  );
}

function AxisComparisonRow({ axis }: { axis: PublicComparisonAxisInsight }) {
  const closenessLabel = getClosenessLabel(axis);

  return (
    <article className="rounded-lg border border-[#eeeeee] bg-white p-4 shadow-[0_10px_30px_rgba(17,17,17,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-black">{axis.label}</h3>
          <p className="mt-1 text-sm leading-6 text-[#666666]">
            {axis.interpretation}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 whitespace-nowrap text-xs font-extrabold",
            axis.difference >= 25 ? "text-[#d9480f]" : "text-[#555555]",
          )}
        >
          {closenessLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CodeSignalCard label="나" pattern={axis.viewerPattern} symbol={axis.viewerSymbol} />
        <CodeSignalCard label="상대" pattern={axis.targetPattern} symbol={axis.targetSymbol} />
      </div>

      <div className="mt-4 grid gap-3 border-t border-[#eeeeee] pt-4">
        <ReportNote
          label="오해될 수 있는 장면"
          text={axis.possibleMisread}
        />
        <ReportNote
          label={closenessLabel === "같은 자리" ? "함께 유지할 질문" : "맞추는 질문"}
          text={axis.adjustmentTip}
        />
      </div>
    </article>
  );
}

function CodeSignalCard({
  label,
  pattern,
  symbol,
}: {
  label: string;
  pattern: string;
  symbol?: string | null;
}) {
  const signal = splitPattern(pattern);

  return (
    <div className="rounded-lg bg-[#fafafa] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-[#777777]">{label}</span>
        <span className="font-mono text-lg font-black text-[#111111]">
          {symbol ?? "-"}
        </span>
      </div>
      <p className="mt-2 text-sm font-black leading-5 text-[#111111]">
        {signal.title}
      </p>
      {signal.body ? (
        <p className="mt-1 text-[13px] leading-5 text-[#666666]">
          {signal.body}
        </p>
      ) : null}
    </div>
  );
}

function ReportNote({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#8a8a8a]">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#333333]">{text}</p>
    </div>
  );
}

function splitPattern(pattern: string) {
  const [title, ...rest] = pattern.split(". ");

  return {
    body: rest.join(". ").trim(),
    title: title.trim() || pattern,
  };
}

function TextList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="mt-3 text-sm leading-6 text-[#666666]">
        공개된 정보 기준으로 더 확인이 필요해요.
      </p>
    );
  }

  return (
    <ul className="mt-3 grid divide-y divide-[#eeeeee]">
      {items.map((item) => (
        <li className="py-3 text-sm leading-6 text-[#555555] first:pt-0 last:pb-0" key={item}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function getAxisComparisons(sections: PublicComparisonReportPayload["comparison"]["sections"]) {
  if (Array.isArray(sections.axisComparisons) && sections.axisComparisons.length > 0) {
    return sections.axisComparisons;
  }

  return [...sections.commonGround, ...sections.differences].map((axis) => ({
    ...axis,
    adjustmentTip: "서로 편한 속도와 표현 방식을 먼저 확인해보세요.",
    closeness: axis.difference <= 16 ? "close" : "different",
    interpretation:
      axis.difference <= 16
        ? `${axis.label}에서는 서로 기대하는 흐름이 가까운 편이에요.`
        : `${axis.label}에서는 서로 다른 리듬이 보일 수 있어요.`,
    possibleMisread: "한쪽은 충분하다고 느끼고, 다른 한쪽은 설명이 더 필요하다고 느낄 수 있어요.",
    targetPattern: buildFallbackPattern("상대", axis.targetSymbol),
    viewerPattern: buildFallbackPattern("나", axis.viewerSymbol),
  })) satisfies PublicComparisonAxisInsight[];
}

function buildFallbackPattern(subject: "나" | "상대", symbol?: string | null) {
  const insight = getNuangCodeLetterInsight(symbol);

  if (!insight) {
    return `${subject}의 공개된 뉴앙 코드 정보를 더 확인해야 해요.`;
  }

  return `${insight.name}. ${insight.summary}`;
}

function getClosenessLabel(axis: PublicComparisonAxisDelta) {
  if (axis.viewerSymbol && axis.targetSymbol && axis.viewerSymbol === axis.targetSymbol) {
    return "같은 자리";
  }
  if (axis.difference <= 8) return "매우 가까움";
  if (axis.difference <= 16) return "가까움";
  if (axis.difference <= 28) return "조율 가능";
  return "차이 큼";
}
