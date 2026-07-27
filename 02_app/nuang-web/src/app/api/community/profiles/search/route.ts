import { type NextRequest, NextResponse } from "next/server";
import {
  normalizePublicProfileSearchQuery,
  type PublicProfileSearchResponse,
} from "@/features/public-profile/public-profile-search-contract";
import { searchServerPublicProfiles } from "@/features/public-profile/server-public-profile-search";

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const normalized = normalizePublicProfileSearchQuery(rawQuery);

  if (!normalized.ok) {
    return createResponse(
      {
        code: "invalid_query",
        message: "사람 검색어를 두 글자 이상 입력해 주세요.",
        ok: false,
      },
      400,
    );
  }

  const result = await searchServerPublicProfiles(normalized.value);
  if (!result.ok) {
    return createResponse(
      {
        code: result.code,
        message: "지금은 사람을 찾을 수 없어요. 잠시 뒤 다시 시도해 주세요.",
        ok: false,
      },
      result.code === "invalid_query" ? 400 : 503,
    );
  }

  return createResponse({ ok: true, profiles: result.profiles }, 200);
}

function createResponse(body: PublicProfileSearchResponse, status: number) {
  return NextResponse.json(body, {
    headers: {
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
    status,
  });
}
