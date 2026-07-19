import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccountConnectPanel } from "@/features/consent/AccountConnectPanel";

export const metadata: Metadata = {
  title: "로그인 | NUANG",
};

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    reason?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = searchParams ? await searchParams : {};
  const reason = readFirst(query.reason);
  const nextPath = readSafeNextPath(readFirst(query.next));
  const isCommunityLogin = ["comment", "community", "poll"].includes(reason);
  const backHref = createBackHref(nextPath);
  const backLabel = backHref === "/home" ? "홈으로 돌아가기" : "이전 화면으로 돌아가기";
  const pageTitle =
    reason === "poll"
      ? "선택을 저장하고 결과를 확인해요"
      : reason === "comment"
        ? "작성한 댓글을 이어서 남겨요"
        : "뉴앙에 로그인";
  const pageDescription = isCommunityLogin
    ? "안전한 커뮤니티를 위해 계정을 확인해요. 로그인 후 방금 하던 곳에서 바로 이어집니다."
    : "리포트 저장, 공유하기, 나와 비교하기가 필요할 때 로그인하면 돼요.";

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 pb-12">
      <header className="sticky top-0 z-10 -mx-5 grid h-14 grid-cols-[40px_minmax(0,1fr)_40px] items-center border-b border-line bg-white/95 px-4 backdrop-blur-xl">
        <Link
          aria-label={backLabel}
          className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface"
          href={backHref}
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.9} />
        </Link>
        <p className="truncate px-2 text-center text-sm font-bold">로그인</p>
        <span aria-hidden="true" />
      </header>

      <section className="border-b border-line pb-5 pt-7">
        <h1 className="text-2xl font-black">{pageTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {pageDescription}
        </p>
      </section>

      <section className="py-5">
        <AccountConnectPanel context={isCommunityLogin ? "community" : "account"} />
      </section>
    </main>
  );
}

function readFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function readSafeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/my";
}

function createBackHref(nextPath: string) {
  const url = new URL(nextPath, "https://nuang.local");
  ["auth", "optionId", "pollId", "postId", "resumeFeed"].forEach((key) => {
    url.searchParams.delete(key);
  });
  return `${url.pathname}${url.search}`;
}
