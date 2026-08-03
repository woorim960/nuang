import type { Metadata } from "next";
import { MarketingUnsubscribePanel } from "@/features/marketing/MarketingUnsubscribePanel";
import { readMarketingUnsubscribeToken } from "@/features/marketing/server-marketing-unsubscribe-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "이메일 수신 설정 | 뉴앙",
};

export default async function MarketingUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const preview = params.preview === "1";
  const valid = preview || readMarketingUnsubscribeToken(token) !== null;
  return (
    <MarketingUnsubscribePanel preview={preview} token={token} valid={valid} />
  );
}
