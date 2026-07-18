import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LocalResultManager } from "@/features/account/LocalResultManager";

export default function MyReportsPage() {
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
        <p className="truncate px-2 text-center text-sm font-bold">내 리포트</p>
        <span aria-hidden="true" />
      </header>

      <section className="pb-5 pt-7">
        <h1 className="text-2xl font-black">내 리포트</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          검사 결과와 비교 리포트를 한곳에서 다시 볼 수 있어요. 그룹 리포트도
          추후 이곳에 모입니다.
        </p>
      </section>

      <LocalResultManager />
    </main>
  );
}
