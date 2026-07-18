import { ArrowRight, CalendarDays, Link2Off, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import type { NuangCharacterMotif } from "@/components/character/nuang-character-assets";
import { ButtonLink } from "@/components/ui/Button";
import { TraitRadarChart } from "@/components/ui/TraitRadarChart";
import {
  createPublicShareSuccessPayload,
  createPublicShareUnavailablePayload,
  publicShareMaxDomainCount,
} from "@/features/share/public-share-contract";
import { readPublicShareToken } from "@/features/share/public-share-server";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

type SharePageProps = {
  params: Promise<{ token: string }>;
};

type PublicSharePayload = ReturnType<typeof createPublicShareSuccessPayload>["share"];

const publicSummaryRules = [
  "뉴앙 코드와 코드 자리 요약만 보여줘요.",
  "문항별 답변, 원점수, 계정 정보는 보이지 않아요.",
  "공유 주소는 30일 뒤 자동으로 만료돼요.",
] as const;

const domainShortLabel: Record<string, string> = {
  ER: "마음",
  OE: "감각",
  RO: "관계",
  SE: "사람",
  SM: "일상",
};

const motifByPrefix: Record<string, NuangCharacterMotif> = {
  SC: "forest",
  SV: "water",
  TC: "sun",
  TV: "flame",
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "공유 리포트 | NUANG",
};

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const result = await readPublicShareToken(token);

  if (result.status === "active") {
    return <ActiveShareView share={result.payload.share} />;
  }

  if (result.status !== "closed") {
    return <UnavailableShareView status={result.status} />;
  }

  const closedState = createApiClosedPayload("share_link_create_db_write_pending");

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 pb-10">
      <ShareHeader label="공유 리포트" />

      <section className="grid min-h-[70dvh] place-items-center py-10">
        <div className="w-full border-y border-line py-8 text-center">
          <Link2Off aria-hidden="true" className="mx-auto text-muted" size={28} />
          <p className="mt-5 text-sm font-bold text-muted">공유 리포트 준비 중</p>
          <h1 className="mt-3 text-2xl font-black">아직 공유 결과를 열 수 없어요</h1>
          <p className="mx-auto mt-3 max-w-[360px] text-sm leading-6 text-muted">
            공유 리포트 조회가 연결되기 전까지는 임의의 결과를 보여주지
            않습니다. 이 화면은 대표 성향과 최대 {publicShareMaxDomainCount}개
            영역 요약만 보여주도록 준비하고 있어요.
          </p>
          <div className="mt-6 border-t border-line pt-5 text-left">
            <p className="text-sm font-bold">{closedState.display.message}</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {closedState.display.nextStep}
            </p>
            <PublicSummaryRuleList />
          </div>
          <ButtonLink className="mt-6 w-full" href="/assessments/nu-core-quick">
            빠른 코어 시작하기
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}

function ActiveShareView({ share }: { share: PublicSharePayload }) {
  const result = share.result;
  const motif = getMotif(result.profileCode);
  const assessmentHref = getAssessmentHref(result.assessmentKind);
  const assessmentLabel = getAssessmentLabel(result.assessmentKind);
  const axes = result.domains.map((domain) => ({
    id: domain.domainId,
    label: domain.label,
    shortLabel: domainShortLabel[domain.domainId] ?? domain.label,
    value: domain.score,
  }));

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 pb-10">
      <ShareHeader label="공유 리포트" />

      <section className="border-b border-line pb-6 pt-7">
        <div className="flex items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted">{result.resultLabel}</p>
            <p className="mt-2 text-[38px] font-black leading-none tracking-normal text-ink">
              {result.profileCode}
            </p>
            <h1 className="mt-3 text-2xl font-black leading-8">
              {result.profileName}
            </h1>
          </div>
          <NuangCharacter motif={motif} size="lg" />
        </div>
        <p className="mt-5 text-sm leading-6 text-muted">
          누군가 공유한 뉴앙 결과 요약이에요. 이 화면은 대화의 시작점으로 볼 수
          있는 공개 요약만 보여줍니다.
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted">
          <CalendarDays aria-hidden="true" size={15} />
          <span>
            {formatCompletedDate(result.completedAt)} · {assessmentLabel}
          </span>
        </div>
      </section>

      <section className="border-b border-line py-6">
        <h2 className="text-base font-bold">코드 지도 요약</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          중심에서 멀수록 그 코드 자리의 성향을 더 자주 사용하는 편이에요.
        </p>
        {axes.length > 0 ? (
          <TraitRadarChart
            ariaLabel="공유된 코드 지도 그래프"
            axes={axes}
            centerLabel="코드 지도"
          />
        ) : (
          <p className="mt-4 border-y border-line py-4 text-sm leading-6 text-muted">
            이 공유 리포트에는 영역별 요약이 포함되지 않았어요.
          </p>
        )}
      </section>

      {result.domains.length > 0 && (
        <section className="border-b border-line py-6">
          <h2 className="text-base font-bold">코드 자리</h2>
          <div className="mt-3 divide-y divide-line border-y border-line">
            {result.domains.map((domain) => (
              <div
                className="flex min-h-14 items-center justify-between gap-4 py-3"
                key={domain.domainId}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold">{domain.label}</p>
                  {domain.symbol && (
                    <p className="mt-1 text-xs font-semibold text-muted">
                      {domain.symbol}
                    </p>
                  )}
                </div>
                <p className="text-sm font-black tabular-nums text-ink">
                  {domain.score === null ? "요약" : Math.round(domain.score)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="border-b border-line py-6">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-muted" size={18} />
          <div className="min-w-0">
            <h2 className="text-base font-bold">공유 범위</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              공유 받은 사람에게 보이는 내용은 요약으로 제한됩니다.
            </p>
          </div>
        </div>
        <PublicSummaryRuleList />
      </section>

      <section className="py-6">
        <h2 className="text-base font-bold">나도 알아보기</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          같은 검사를 해보면 내 대표 성향 코드와 성향지도를 확인할 수 있어요.
        </p>
        <ButtonLink
          className="mt-4 w-full"
          href={assessmentHref}
          icon={<ArrowRight aria-hidden="true" size={17} />}
        >
          나도 같은 검사 해보기
        </ButtonLink>
      </section>
    </main>
  );
}

function UnavailableShareView({
  status,
}: {
  status: "expired" | "not_found" | "revoked";
}) {
  const payload = createPublicShareUnavailablePayload(status);

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 pb-10">
      <ShareHeader label="공유 리포트" />

      <section className="grid min-h-[70dvh] place-items-center py-10">
        <div className="w-full border-y border-line py-8 text-center">
          <Link2Off aria-hidden="true" className="mx-auto text-muted" size={28} />
          <p className="mt-5 text-sm font-bold text-muted">공유 주소 확인</p>
          <h1 className="mt-3 text-2xl font-black">{payload.message}</h1>
          <p className="mx-auto mt-3 max-w-[360px] text-sm leading-6 text-muted">
            공유 범위와 만료 상태를 확인한 뒤 안전하게 닫았어요. 뉴앙 검사는
            로그인 없이도 가볍게 시작할 수 있습니다.
          </p>
          <ButtonLink className="mt-6 w-full" href="/assessments/nu-core-quick">
            빠른 코어 시작하기
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}

function ShareHeader({ label }: { label: string }) {
  return (
    <header className="border-b border-line py-4">
      <p className="text-sm font-black tracking-normal text-ink">NUANG</p>
      <p className="mt-1 text-xs font-semibold text-muted">{label}</p>
    </header>
  );
}

function PublicSummaryRuleList() {
  return (
    <ul className="mt-4 grid gap-2 text-sm leading-6 text-muted">
      {publicSummaryRules.map((rule) => (
        <li className="border-t border-line pt-2 first:border-t-0 first:pt-0" key={rule}>
          {rule}
        </li>
      ))}
    </ul>
  );
}

function getMotif(code: string): NuangCharacterMotif {
  return motifByPrefix[code.slice(0, 2)] ?? "purple";
}

function getAssessmentHref(kind: "full" | "quick") {
  return kind === "full" ? "/assessments/nu-core-full" : "/assessments/nu-core-quick";
}

function getAssessmentLabel(kind: "full" | "quick") {
  return kind === "full" ? "정밀 코어" : "빠른 코어";
}

function formatCompletedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "날짜 알 수 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
