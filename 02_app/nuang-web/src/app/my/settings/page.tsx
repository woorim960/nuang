import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Database,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { AccountConnectPanel } from "@/features/consent/AccountConnectPanel";

const settingsItems = [
  {
    description: "프로필과 로그인 상태",
    href: "#account",
    icon: UserRound,
    title: "계정 설정",
  },
  {
    description: "프로필과 비교에 쓰이는 정보",
    href: "/my/settings/visibility",
    icon: LockKeyhole,
    title: "공개 범위 설정",
  },
  {
    description: "준비 중",
    href: "#notifications",
    icon: Bell,
    title: "알림 설정",
  },
  {
    description: "내보내기와 삭제",
    href: "/my/reports",
    icon: Database,
    title: "데이터 관리",
  },
] as const;

export default function MySettingsPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 pb-12">
      <header className="sticky top-0 z-10 -mx-5 grid h-14 grid-cols-[40px_minmax(0,1fr)_40px] items-center border-b border-line bg-white/95 px-4 backdrop-blur-xl">
        <Link
          aria-label="마이로 돌아가기"
          className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface"
          href="/my"
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.9} />
        </Link>
        <p className="truncate px-2 text-center text-sm font-bold">설정</p>
        <span aria-hidden="true" />
      </header>

      <section className="border-b border-line pb-5 pt-7">
        <h1 className="text-2xl font-black">설정</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          계정, 공개 범위, 데이터 관리를 이곳에서 조정해요.
        </p>
      </section>

      <nav aria-label="설정 메뉴" className="border-b border-line">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          const isReadyLink = item.href.startsWith("/");

          return (
            <Link
              aria-disabled={!isReadyLink}
              className="flex min-h-16 items-center gap-3 border-b border-line py-3 last:border-b-0"
              href={item.href}
              key={item.title}
            >
              <Icon aria-hidden="true" className="shrink-0 text-muted" size={19} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{item.title}</span>
                <span className="mt-1 block truncate text-xs text-muted">
                  {item.description}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="shrink-0 text-muted"
                size={17}
              />
            </Link>
          );
        })}
      </nav>

      <section className="border-b border-line py-5">
        <div className="flex items-start gap-3 text-muted">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
          <p className="text-sm leading-6">
            일반 기능은 전연령으로 이용할 수 있고, 19세 이상 전용 기능은 해당
            기능을 열 때 별도로 확인합니다.
          </p>
        </div>
      </section>

      <section className="py-5" id="account">
        <AccountConnectPanel />
      </section>
    </main>
  );
}
