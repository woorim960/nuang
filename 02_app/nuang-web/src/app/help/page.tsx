import {
  ArrowLeft,
  ExternalLink,
  HeartHandshake,
  Info,
  Phone,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  helpBoundaries,
  helpPrivacyNotice,
  helpResources,
  sourceLinks,
  urgentCallActions,
  urgentSteps,
  type HelpResource,
} from "@/features/help/help-resources";
import { cn } from "@/lib/utils/cn";

const toneClass: Record<HelpResource["tone"], string> = {
  danger: "border-danger/25 bg-[#fff1ef] text-danger",
  primary: "border-primary/20 bg-surface-soft text-primary",
  water: "border-water/20 bg-[#edf5ff] text-water",
  forest: "border-forest/20 bg-[#edf8f3] text-forest",
  sun: "border-sun/25 bg-[#fff7e8] text-[#936300]",
  neutral: "border-line bg-white text-muted",
};

export default function HelpPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-muted"
        href="/assessments"
      >
        <ArrowLeft aria-hidden="true" size={18} />
        검사
      </Link>

      <header className="mt-5">
        <StatusPill tone="caution">도움 연결 허브</StatusPill>
        <h1 className="mt-3 text-2xl font-black leading-8">
          혼자 견디기 어려운 순간
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          이곳은 검사가 아니라 도움 정보입니다. 위기와 치료가 필요한 주제는
          점수화하지 않고, 안전한 연결을 먼저 보여줍니다.
        </p>
      </header>

      <section
        aria-labelledby="urgent-help-title"
        className="mt-5 rounded-lg border border-danger/25 bg-[#fff1ef] p-4"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-danger">
            <ShieldAlert aria-hidden="true" size={21} />
          </div>
          <div>
            <h2 className="font-bold text-danger" id="urgent-help-title">
              지금 위험하다면
            </h2>
            <ul className="mt-2 grid gap-2 text-sm leading-6 text-muted">
              {urgentSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {urgentCallActions.map((action) => (
            <a
              aria-label={action.ariaLabel}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold",
                action.variant === "danger"
                  ? "bg-danger text-white"
                  : "border border-danger/25 bg-white text-danger",
              )}
              href={action.href}
              key={action.label}
            >
              <Phone aria-hidden="true" size={17} />
              {action.label}
            </a>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-3">
        <h2 className="text-base font-bold">연결할 수 있는 곳</h2>
        {helpResources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </section>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <HeartHandshake aria-hidden="true" size={20} />
          </div>
          <div>
            <h2 className="font-bold">뉴앙이 하지 않는 것</h2>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-muted">
              {helpBoundaries.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <h2 className="font-bold">기록하지 않는 정보</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{helpPrivacyNotice}</p>
      </section>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eff0f6] text-muted">
            <Info aria-hidden="true" size={20} />
          </div>
          <div>
            <h2 className="font-bold">출처와 업데이트</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              연락처는 2026.07.03 KST 기준 공식 기관 페이지에서 확인한
              정보입니다. 실제 운영 시간과 세부 지원은 각 기관 안내를 확인해
              주세요.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sourceLinks.map((source) => (
                <a
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line px-3 text-xs font-semibold text-muted"
                  href={source.href}
                  key={source.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.label}
                  <ExternalLink aria-hidden="true" size={13} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ResourceCard({ resource }: { resource: HelpResource }) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{resource.availability}</p>
          <h3 className="mt-1 text-lg font-bold">{resource.title}</h3>
        </div>
        {resource.phone && (
          <span
            className={cn(
              "shrink-0 rounded-lg border px-3 py-2 text-sm font-black tabular-nums",
              toneClass[resource.tone],
            )}
          >
            {resource.phone}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{resource.summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {resource.fit.map((item) => (
          <span
            className="rounded-full bg-[#eff0f6] px-3 py-1 text-xs font-semibold text-muted"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {resource.phone && (
          <a
            aria-label={`${resource.title} ${resource.phone}로 전화하기`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-white"
            href={`tel:${resource.phone}`}
          >
            <Phone aria-hidden="true" size={17} />
            전화
          </a>
        )}
        {resource.href && (
          <a
            aria-label={`${resource.title} 공식 안내 열기`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-bold text-foreground"
            href={resource.href}
            rel="noreferrer"
            target="_blank"
          >
            안내
            <ExternalLink aria-hidden="true" size={15} />
          </a>
        )}
      </div>
    </article>
  );
}
