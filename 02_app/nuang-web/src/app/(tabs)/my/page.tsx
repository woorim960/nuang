import { FileText, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { LocalResultManager } from "@/features/account/LocalResultManager";
import { ProfileVisibilityPreview } from "@/features/account/ProfileVisibilityPreview";
import { PublicProfileCodeIssuePreview } from "@/features/community/PublicProfileCodeIssuePreview";
import { AccountConnectPanel } from "@/features/consent/AccountConnectPanel";

const accountActions = [
  "공개 범위 설정",
  "공유 링크 관리",
  "동의 관리",
  "계정 데이터 내보내기",
];

const myRouteCards = [
  {
    caption: "검사 결과와 로컬 데이터 내보내기",
    href: "#local-results",
    icon: FileText,
    label: "내 결과",
    status: "로컬",
  },
  {
    caption: "기본 공개와 기본 비공개 범위 확인",
    href: "#visibility-preview",
    icon: ShieldCheck,
    label: "공개 범위",
    status: "읽기 전용",
  },
  {
    caption: "저장, 공유, 공개 코드를 열기 위한 준비",
    href: "#account-connect",
    icon: LockKeyhole,
    label: "계정 연결",
    status: "선택",
  },
] as const;

export default function MyPage() {
  return (
    <div className="grid gap-5">
      <header>
        <h1 className="text-2xl font-bold">마이</h1>
        <p className="mt-1 text-sm text-muted">
          내 결과를 확인하고, 공개 범위를 살핀 뒤 필요한 순간 계정을 연결해요.
        </p>
      </header>

      <section aria-labelledby="my-route-title" className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold" id="my-route-title">
              먼저 확인할 순서
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              비회원 상태에서도 결과와 공개 기준을 먼저 이해할 수 있어요.
            </p>
          </div>
          <StatusPill tone="success">기본</StatusPill>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {myRouteCards.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="grid min-h-32 content-between rounded-lg border border-line bg-white p-3 shadow-[0_10px_24px_rgb(63_56_118_/_6%)]"
                href={item.href}
                key={item.href}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <StatusPill tone="neutral">{item.status}</StatusPill>
                </span>
                <span className="mt-3">
                  <span className="block text-sm font-black">{item.label}</span>
                  <span className="mt-1 block text-[11px] font-semibold leading-4 text-muted">
                    {item.caption}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div id="local-results">
        <LocalResultManager />
      </div>

      <div id="visibility-preview">
        <ProfileVisibilityPreview />
      </div>

      <div id="account-connect">
        <AccountConnectPanel />
      </div>

      <div id="public-profile-code">
        <PublicProfileCodeIssuePreview />
      </div>

      <section className="grid gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <KeyRound aria-hidden="true" size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold">계정 관리</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              계정 서버 연결이 준비되면 공개 범위, 공유 링크, 동의, 계정 데이터
              내보내기를 열겠습니다.
            </p>
          </div>
        </div>
        <p className="sr-only">
          마이 탭은 내 결과, 공개 범위, 계정 연결, 공개 코드, 계정 관리 순서로
          구성됩니다.
        </p>
        {accountActions.map((item) => (
          <button
            aria-label={`${item} 준비 중`}
            className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 text-left font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            disabled
            key={item}
            type="button"
          >
            <span>{item}</span>
            <StatusPill tone="neutral">준비 중</StatusPill>
          </button>
        ))}
      </section>
    </div>
  );
}
