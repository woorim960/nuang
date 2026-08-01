import { Link2Off } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { CoreResultReportTemplate } from "@/features/result/unified-core-report/CoreResultReportTemplate";
import { readPublicShareToken } from "@/features/share/public-share-server";

type SharePageProps = {
  params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "검사 결과 | NUANG",
};

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const result = await readPublicShareToken(token);

  if (result.status === "active") {
    return (
      <CoreResultReportTemplate
        model={result.model}
        shareEnabled={false}
        surface="share"
      />
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 pb-10">
      <header className="border-b border-line py-4">
        <p className="text-sm font-black tracking-normal text-ink">NUANG</p>
        <p className="mt-1 text-xs font-semibold text-muted">검사 결과</p>
      </header>

      <section className="grid min-h-[70dvh] place-items-center py-10">
        <div className="w-full border-y border-line py-8 text-center">
          <Link2Off
            aria-hidden="true"
            className="mx-auto text-muted"
            size={28}
          />
          <h1 className="mt-5 text-2xl font-black">
            이 리포트는 지금 볼 수 없어요
          </h1>
          <p className="mx-auto mt-3 max-w-[360px] text-sm leading-6 text-muted">
            공유한 사람이 결과를 숨겼거나 주소의 사용 기간이 끝났어요.
          </p>
          <ButtonLink className="mt-6 w-full" href="/home">
            다른 검사 둘러보기
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
