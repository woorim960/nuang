const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type QueryValue = string | string[] | undefined;

export type LegacyHomeFeedResumeQuery = Record<string, QueryValue>;

export type LegacyHomePollResumeIntent = {
  optionId: string;
  pollId: string;
};

/**
 * 이전 홈의 투표가 로그인 뒤 선택을 잃지 않도록 커뮤니티 복귀 주소로 바꿉니다.
 * 허용된 투표 복귀 신호와 UUID만 전달하고 그 밖의 query는 폐기합니다.
 */
export function getLegacyHomePollResumeHref(
  query: LegacyHomeFeedResumeQuery,
): string | null {
  const intent = parseLegacyHomePollResumeIntent(query);
  if (!intent) return null;

  const params = new URLSearchParams({
    auth: "connected",
    optionId: intent.optionId,
    pollId: intent.pollId,
    resumeFeed: "poll",
  });

  return `/feed?${params.toString()}`;
}

export function parseLegacyHomePollResumeIntent(
  query: LegacyHomeFeedResumeQuery,
): LegacyHomePollResumeIntent | null {
  const resumeFeed = readOne(query.resumeFeed);
  const auth = readOne(query.auth);
  const pollId = readOne(query.pollId);
  const optionId = readOne(query.optionId);

  if (
    resumeFeed !== "poll" ||
    auth !== "connected" ||
    !pollId ||
    !optionId ||
    !uuidPattern.test(pollId) ||
    !uuidPattern.test(optionId)
  ) {
    return null;
  }

  return { optionId, pollId };
}

function readOne(value: QueryValue) {
  return Array.isArray(value) ? value[0] : value;
}
