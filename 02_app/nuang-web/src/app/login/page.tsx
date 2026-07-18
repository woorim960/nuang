import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccountConnectPanel } from "@/features/consent/AccountConnectPanel";

export const metadata: Metadata = {
  title: "로그인 | NUANG",
};

export default function LoginPage() {
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
        <p className="truncate px-2 text-center text-sm font-bold">로그인</p>
        <span aria-hidden="true" />
      </header>

      <section className="border-b border-line pb-5 pt-7">
        <h1 className="text-2xl font-black">뉴앙에 로그인</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          리포트 저장, 공유하기, 나와 비교하기가 필요할 때만 로그인하면 돼요.
        </p>
      </section>

      <section className="py-5">
        <AccountConnectPanel />
      </section>
    </main>
  );
}
