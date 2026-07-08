import { Link2Off, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { publicShareMaxDomainCount } from "@/features/share/public-share-contract";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

type SharePageProps = {
  params: Promise<{ token: string }>;
};

const publicSummaryRules = [
  "대표 성향과 5개 영역 요약만 표시",
  "직접 응답과 10개 세부 성향 제외",
  "만료·철회 상태 확인 후 공개",
];

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "공유 링크 확인 | NUANG",
};

export default async function SharePage({ params }: SharePageProps) {
  await params;
  const closedState = createApiClosedPayload("share_link_create_db_write_pending");

  return (
    <main className="mx-auto grid min-h-dvh max-w-[520px] place-items-center px-5 py-8">
      <section className="w-full rounded-lg border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-surface-soft text-primary">
          <Link2Off size={24} />
        </div>
        <div className="mt-5 flex justify-center">
          <StatusPill tone="neutral">공유 링크 준비 중</StatusPill>
        </div>
        <h1 className="mt-4 text-center text-2xl font-black">
          아직 공유 결과를 열 수 없어요
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          서버 공유 링크 조회가 연결되기 전까지는 임의의 결과를 보여주지
          않습니다. 공유 화면은 대표 성향과 최대 {publicShareMaxDomainCount}개
          영역 요약만 보여주고, 직접 응답과 세부 점수는 제외하는 구조로
          준비하고 있어요.
        </p>
        <div className="mt-5 rounded-lg bg-surface-soft p-3 text-sm leading-6 text-muted">
          <p className="font-semibold text-foreground">
            {closedState.display.message}
          </p>
          <div className="mt-2 flex items-start gap-2">
            <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={17} />
            <p>
              {closedState.display.nextStep}
            </p>
          </div>
          <p className="mt-2">{closedState.safeFallback}</p>
          <div className="mt-3">
            <p className="text-xs font-semibold text-foreground">공개 요약 기준</p>
            <ul className="mt-2 grid gap-1">
              {publicSummaryRules.map((rule) => (
                <li className="flex gap-2" key={rule}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {closedState.display.blockedBy.map((item) => (
              <span
                className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-muted"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <ButtonLink className="mt-6 w-full" href="/assessments/nu-core-quick">
          나도 해보기
        </ButtonLink>
      </section>
    </main>
  );
}
