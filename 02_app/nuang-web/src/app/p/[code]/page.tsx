import { BadgeCheck, Link2Off, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { normalizePublicProfileReference } from "@/features/community/public-profile-resolver-contract";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

type PublicProfilePageProps = {
  params: Promise<{ code: string }>;
};

const publicProfileRules = [
  "대표 성향과 공개 성향지도 요약만 표시",
  "직접 응답·원점수·민감 항목 제외",
  "공개 범위 변경 시 접근 재평가",
];

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "공개 프로필 확인 | NUANG",
};

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { code } = await params;
  const normalizedCode = normalizePublicProfileReference(code);
  const closedState = createApiClosedPayload(
    "public_profile_resolver_lookup_pending",
  );

  return (
    <main className="mx-auto grid min-h-dvh max-w-[520px] place-items-center px-5 py-8">
      <section className="w-full rounded-lg border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-surface-soft text-primary">
          {normalizedCode ? <BadgeCheck size={24} /> : <Link2Off size={24} />}
        </div>
        <div className="mt-5 flex justify-center">
          <StatusPill tone={normalizedCode ? "primary" : "caution"}>
            공개 프로필 준비 중
          </StatusPill>
        </div>
        <h1 className="mt-4 text-center text-2xl font-black">
          아직 공개 프로필을 열 수 없어요
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {normalizedCode
            ? `${normalizedCode} 공개 프로필 링크는 준비 중입니다. 서버 조회가 연결되기 전까지는 임의 프로필을 보여주지 않아요.`
            : "공개 프로필 코드 형식을 확인해 주세요. 뉴앙 공개 코드는 NUANG-A7K2M9처럼 표시됩니다."}
        </p>
        <div className="mt-5 rounded-lg bg-surface-soft p-3 text-sm leading-6 text-muted">
          <p className="font-semibold text-foreground">
            {closedState.display.message}
          </p>
          <div className="mt-2 flex items-start gap-2">
            <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={17} />
            <p>{closedState.display.nextStep}</p>
          </div>
          <p className="mt-2">{closedState.safeFallback}</p>
          <div className="mt-3">
            <p className="text-xs font-semibold text-foreground">
              공개 프로필 기준
            </p>
            <ul className="mt-2 grid gap-1">
              {publicProfileRules.map((rule) => (
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
        <ButtonLink className="mt-6 w-full" href="/home">
          뉴앙 홈으로
        </ButtonLink>
      </section>
    </main>
  );
}
