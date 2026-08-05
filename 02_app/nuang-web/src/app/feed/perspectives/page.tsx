import type { Metadata } from "next";
import { PerspectiveCollection } from "@/features/feed/PerspectiveCollection";
import { createServerFeedPlaygroundRecordsPayload } from "@/features/feed/server-read";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "성향 놀이터 기록",
});

export default async function PerspectiveCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const [payload, params] = await Promise.all([
    createServerFeedPlaygroundRecordsPayload(),
    searchParams,
  ]);
  const from = Array.isArray(params.from) ? params.from[0] : params.from;

  return (
    <PerspectiveCollection
      backHref={from === "home" ? "/home" : from === "my" ? "/my" : "/feed"}
      payload={payload}
    />
  );
}
