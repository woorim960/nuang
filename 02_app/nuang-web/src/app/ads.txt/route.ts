import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const publisherId = normalizePublisherId(process.env.ADSENSE_PUBLISHER_ID);
  if (!publisherId) {
    return new NextResponse("ads.txt is not configured\n", {
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
      },
      status: 404,
    });
  }

  return new NextResponse(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      "cache-control": "public, max-age=3600, s-maxage=3600",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

function normalizePublisherId(value: string | undefined) {
  const normalized = value?.trim().replace(/^ca-/, "");
  return normalized && /^pub-\d{16}$/.test(normalized) ? normalized : null;
}
