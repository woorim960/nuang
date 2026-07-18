import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MyTraitDetailView } from "@/features/account/MyTraitDetailView";

export default function MyProfileDetailPage() {
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
        <p className="truncate px-2 text-center text-sm font-bold">내 성향</p>
        <span aria-hidden="true" />
      </header>

      <MyTraitDetailView />
    </main>
  );
}
