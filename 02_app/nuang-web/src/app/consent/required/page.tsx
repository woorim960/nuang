import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RequiredConsentPanel } from "@/features/consent/RequiredConsentPanel";
import { safeRequiredConsentReturnPath } from "@/features/consent/required-consent-contract";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "필수 동의 확인",
});

type RequiredConsentPageProps = {
  searchParams?: Promise<{ next?: string | string[] }>;
};

export default async function RequiredConsentPage({
  searchParams,
}: RequiredConsentPageProps) {
  const query = searchParams ? await searchParams : {};
  const requestedNext = Array.isArray(query.next) ? query.next[0] : query.next;
  const nextPath = safeRequiredConsentReturnPath(requestedNext);

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 pb-12">
      <header className="-mx-5 grid h-14 grid-cols-[40px_minmax(0,1fr)_40px] items-center border-b border-line px-4">
        <Link
          aria-label="결과로 돌아가기"
          className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface"
          href={nextPath}
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.8} />
        </Link>
        <p className="text-center text-sm font-bold">필수 동의 확인</p>
        <span aria-hidden="true" />
      </header>

      <section className="py-8">
        <p className="text-sm font-bold text-primary">ACCOUNT CONSENT</p>
        <h1 className="mt-2 text-2xl font-black leading-8 text-ink">
          결과 저장을 이어가기 전에
          <br />한 번만 확인해 주세요
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          정책 버전이 바뀌었거나 필수 동의 기록이 없는 경우에만 이 화면을
          보여드려요.
        </p>
      </section>

      <RequiredConsentPanel nextPath={nextPath} />
    </main>
  );
}
