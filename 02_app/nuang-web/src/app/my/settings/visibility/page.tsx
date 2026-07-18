import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProfileVisibilityPreview } from "@/features/account/ProfileVisibilityPreview";

export default function VisibilitySettingsPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 pb-12">
      <header className="sticky top-0 z-10 -mx-5 grid h-14 grid-cols-[40px_minmax(0,1fr)_40px] items-center border-b border-line bg-white/95 px-4 backdrop-blur-xl">
        <Link
          aria-label="설정으로 돌아가기"
          className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface"
          href="/my/settings"
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.9} />
        </Link>
        <p className="truncate px-2 text-center text-sm font-bold">공개 범위</p>
        <span aria-hidden="true" />
      </header>

      <section className="pb-5 pt-7">
        <h1 className="text-2xl font-black">공개 범위 설정</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          프로필과 비교에 쓰이는 정보만 가볍게 공개하고, 민감한 정보는 기본으로
          보호합니다.
        </p>
      </section>

      <ProfileVisibilityPreview />
    </main>
  );
}
