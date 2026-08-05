import { Link2Off } from "lucide-react";
import type { Metadata } from "next";
import { cache } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { CoreResultReportTemplate } from "@/features/result/unified-core-report/CoreResultReportTemplate";
import { GuestReportShareView } from "@/features/share/GuestReportShareView";
import { readPublicShareToken } from "@/features/share/public-share-server";
import { getAppOrigin } from "@/lib/supabase/env";

type SharePageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ share?: string | string[] }>;
};

const shareRobots: Metadata["robots"] = {
  follow: false,
  index: false,
};
const readShareToken = cache(readPublicShareToken);

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await readShareToken(token);
  const image = {
    alt: "뉴앙 결과 리포트를 나누는 보라색과 초록색 메인 캐릭터",
    height: 630,
    url: "https://nuang.app/images/share/nuang-result-share-card-v1.png",
    width: 1200,
  };

  if (result.status !== "active") {
    return {
      description: "뉴앙에서 공유한 결과 리포트입니다.",
      robots: shareRobots,
      title: "검사 결과 | 뉴앙",
    };
  }

  const resultName =
    result.shareKind === "guest_summary"
      ? result.content.resultName
      : result.model.result.currentProfileName || result.model.result.code;
  const title = `${resultName} | 뉴앙 결과 리포트`;
  const description =
    result.shareKind === "guest_summary"
      ? result.content.summary
      : `${result.model.result.code} · 뉴앙에서 발견한 성향 결과를 확인해 보세요.`;
  const imageUrl =
    result.shareKind === "guest_summary"
      ? `https://nuang.app/images/share/nuang-result-share-${result.content.reportType}-v2.png`
      : image.url;

  return {
    description,
    openGraph: {
      description,
      images: [{ ...image, url: imageUrl }],
      siteName: "뉴앙",
      title,
      type: "article",
    },
    robots: shareRobots,
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [imageUrl],
      title,
    },
  };
}

export default async function SharePage({
  params,
  searchParams,
}: SharePageProps) {
  const { token } = await params;
  const query = searchParams ? await searchParams : {};
  const share = Array.isArray(query.share) ? query.share[0] : query.share;
  const result = await readShareToken(token);

  if (result.status === "active") {
    if (result.shareKind === "guest_summary") {
      return (
        <GuestReportShareView
          canonicalUrl={new URL(`/share/${token}`, getAppOrigin()).toString()}
          content={result.content}
          resumeCommunityShare={share === "community"}
        />
      );
    }
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
