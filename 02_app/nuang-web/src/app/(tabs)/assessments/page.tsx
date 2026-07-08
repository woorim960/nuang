import {
  ArrowRight,
  Brain,
  ChevronRight,
  Clock3,
  FlaskConical,
  Map,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { AssessmentHomeCoreSection } from "@/features/assessment/AssessmentHomeCoreSection";
import { labAssessments } from "@/features/lab/lab-assessments";
import { NuangNextActionFlow } from "@/features/navigation/NuangNextActionFlow";

const assessmentRoutes = [
  {
    caption: "3분 안에 예비 결과",
    href: "/assessments/nu-core-quick",
    icon: Clock3,
    label: "빠른 코어 20문항",
    note: "처음이면 여기부터",
    tone: "water",
  },
  {
    caption: "성향지도와 5글자 코드",
    href: "/assessments/nu-core-full",
    icon: Map,
    label: "정밀 코어 60문항",
    note: "대표 성향 확정",
    tone: "primary",
  },
  {
    caption: "재미형 주제 검사",
    href: "/labs/conversation-temperature",
    icon: Sparkles,
    label: "별난 연구소",
    note: "코어 결과 미반영",
    tone: "sun",
  },
] as const;

const assessmentPrinciples = [
  "로그인 없이 시작",
  "결과 즉시 확인",
  "직접 응답 비공개",
  "위기 주제 점수화 금지",
] as const;

const feedHooks = [
  {
    body: "결과를 공개 카드로 바꿔 함께 탭 피드에 올리는 흐름",
    icon: MessageCircle,
    label: "성향 카드 피드",
  },
  {
    body: "정밀 코어 완료 후 5축·10축 그래프로 내 지도 확인",
    icon: Brain,
    label: "성향지도 연결",
  },
  {
    body: "민감 항목은 기본 비공개, 공개 범위 안에서만 비교",
    icon: ShieldCheck,
    label: "공개 범위 보호",
  },
] as const;

export default function AssessmentsPage() {
  return (
    <div className="grid gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black text-primary">NUANG TEST</p>
          <h1 className="mt-2 text-2xl font-black">검사</h1>
          <p className="mt-1 text-sm text-muted">
            가볍게 시작하고, 원할 때 더 깊게 이어가요.
          </p>
        </div>
        <StatusPill tone="success">무료 시작</StatusPill>
      </header>

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-[var(--shadow-soft)]">
        <div className="border-b border-line bg-surface-soft p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <StatusPill tone="primary">처음이라면</StatusPill>
              <h2 className="mt-3 text-xl font-black">3분 빠른 코어부터</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                문항을 길게 설명하지 않고 바로 답할 수 있게 시작점을 단순화했어요.
              </p>
            </div>
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[34%] bg-primary text-white shadow-[0_14px_28px_rgb(101_70_215_/_22%)]">
              <Sparkles aria-hidden="true" size={30} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-line border-y border-line text-center">
          {assessmentPrinciples.map((item) => (
            <div className="min-w-0 px-2 py-3" key={item}>
              <p className="truncate text-[11px] font-black text-muted">{item}</p>
            </div>
          ))}
        </div>
        <div className="p-4">
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgb(101_70_215_/_22%)]"
            href="/assessments/nu-core-quick"
          >
            빠른 코어 시작
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </section>

      <NuangNextActionFlow eyebrow="검사 후 흐름" title="결과가 쓰이는 순서" />

      <section className="rounded-lg border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <StatusPill tone="primary">추천 루트</StatusPill>
            <h2 className="mt-2 text-lg font-bold">오늘 바로 시작하기</h2>
          </div>
          <span className="rounded-full bg-[#eff0f6] px-3 py-1 text-xs font-bold text-muted">
            3분부터
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {assessmentRoutes.map((route) => {
            const Icon = route.icon;

            return (
              <Link
                className="flex min-h-24 items-center gap-3 rounded-lg border border-line bg-background p-3"
                href={route.href}
                key={route.href}
              >
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white ${
                    route.tone === "water"
                      ? "bg-water"
                      : route.tone === "sun"
                        ? "bg-sun"
                        : "bg-primary"
                  }`}
                >
                  <Icon aria-hidden="true" size={19} />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-black">{route.label}</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-muted">
                    {route.caption} · {route.note}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="shrink-0 text-muted" size={18} />
              </Link>
            );
          })}
        </div>
      </section>

      <AssessmentHomeCoreSection />

      <section className="grid gap-3 rounded-lg border border-line bg-white p-4">
        <div>
          <StatusPill tone="primary">결과가 이어지는 곳</StatusPill>
          <h2 className="mt-3 text-base font-bold">검사 후 바로 쓰이는 기능</h2>
        </div>
        {feedHooks.map((item) => {
          const Icon = item.icon;

          return (
            <div
              className="flex min-h-16 items-center gap-3 rounded-lg bg-surface-soft p-3"
              key={item.label}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-primary">
                <Icon aria-hidden="true" size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-bold">{item.label}</p>
                <p className="mt-1 text-sm leading-5 text-muted">{item.body}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-3">
        <SectionHeader
          icon={<FlaskConical aria-hidden="true" size={18} />}
          label="별난 성향 연구소"
          note="성향지도에 반영하지 않는 생활형 주제"
          pill="무료"
        />
        <p className="text-sm leading-6 text-muted">
          치료나 진단이 아닌 S1~S2 생활형 주제만 가볍게 살펴봐요.
        </p>
        {labAssessments.map((assessment) => (
          <Link
            aria-label={`${assessment.cardTitle}: ${assessment.caption}, 약 ${assessment.estimatedMinutes}분`}
            className="flex min-h-24 items-center justify-between gap-3 rounded-lg border border-line bg-white p-4"
            href={`/labs/${assessment.slug}`}
            key={assessment.slug}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold">{assessment.cardTitle}</h3>
                <StatusPill
                  tone={assessment.sensitivity === "S2" ? "caution" : "neutral"}
                >
                  {assessment.sensitivity}
                </StatusPill>
              </div>
              <p className="mt-1 text-sm text-muted">
                {assessment.caption} · 약 {assessment.estimatedMinutes}분
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <TinyBadge>코어 미반영</TinyBadge>
                <TinyBadge>서버 전송 없음</TinyBadge>
                <TinyBadge>공유 닫힘</TinyBadge>
              </div>
            </div>
            <ChevronRight aria-hidden="true" className="shrink-0 text-muted" size={18} />
          </Link>
        ))}
      </section>

      <Link
        aria-label="도움 연결 허브 열기"
        className="flex items-start gap-3 rounded-lg border border-line bg-[#fffaf0] p-4"
        href="/help"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#fff4dc] text-[#9a6400]">
          <ShieldAlert aria-hidden="true" size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <StatusPill tone="caution">도움 연결 허브</StatusPill>
          <h2 className="mt-3 text-lg font-bold">혼자 견디기 어려운 순간</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            위기와 치료가 필요한 주제는 점수화하지 않고, 안전한 도움 정보로만
            연결합니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <TinyBadge>자살·자해</TinyBadge>
            <TinyBadge>우울·중독</TinyBadge>
            <TinyBadge>트라우마</TinyBadge>
          </div>
        </div>
        <ChevronRight aria-hidden="true" className="mt-2 shrink-0 text-muted" size={18} />
      </Link>
    </div>
  );
}

function SectionHeader({
  icon,
  label,
  note,
  pill,
}: {
  icon: React.ReactNode;
  label: string;
  note: string;
  pill?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold">{label}</h2>
          {pill && <StatusPill tone="success">{pill}</StatusPill>}
        </div>
        <p className="mt-1 text-sm leading-6 text-muted">{note}</p>
      </div>
    </div>
  );
}

function TinyBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#eff0f6] px-2.5 py-1 text-xs font-semibold text-muted">
      {children}
    </span>
  );
}
