export const feedPostTopicCategories = [
  "daily_life",
  "relationships",
  "preferences",
  "thoughts",
  "concerns_questions",
] as const;

export type FeedPostTopicCategory = (typeof feedPostTopicCategories)[number];
export type FeedPostTopicSource = "local_suggestion" | "manual";

export type FeedPostTopic = {
  category: FeedPostTopicCategory | null;
  source: FeedPostTopicSource;
  tags: string[];
};

export const maxFeedTagCount = 8;

export const feedPostTopicLabels: Record<FeedPostTopicCategory, string> = {
  concerns_questions: "고민·질문",
  daily_life: "일상",
  preferences: "취향",
  relationships: "관계",
  thoughts: "생각",
};

const topicAliases = new Map<string, FeedPostTopicCategory>([
  ["고민", "concerns_questions"],
  ["고민·질문", "concerns_questions"],
  ["고민/질문", "concerns_questions"],
  ["일상", "daily_life"],
  ["질문", "concerns_questions"],
  ["취향", "preferences"],
  ["관계", "relationships"],
  ["생각", "thoughts"],
]);

const categoryKeywords: Record<FeedPostTopicCategory, string[]> = {
  concerns_questions: [
    "고민",
    "어떻게",
    "도와",
    "조언",
    "궁금",
    "힘들",
    "모르겠",
    "괜찮을까",
  ],
  daily_life: [
    "오늘",
    "주말",
    "카페",
    "산책",
    "출근",
    "퇴근",
    "여행",
    "밥",
    "하루",
  ],
  preferences: [
    "좋아",
    "취향",
    "음악",
    "영화",
    "드라마",
    "책",
    "패션",
    "공간",
    "맛집",
  ],
  relationships: [
    "친구",
    "연인",
    "가족",
    "동료",
    "사람",
    "대화",
    "관계",
    "데이트",
    "소개팅",
  ],
  thoughts: ["생각", "느꼈", "깨달", "의미", "가치", "관점", "기록", "마음"],
};

const tagKeywords = [
  "카페",
  "산책",
  "주말",
  "친구",
  "연인",
  "가족",
  "대화",
  "데이트",
  "여행",
  "음악",
  "영화",
  "드라마",
  "책",
  "패션",
  "맛집",
  "운동",
  "직장",
  "학교",
] as const;

export function parseFeedTopicInput(
  input: string,
  source: FeedPostTopicSource = "manual",
): FeedPostTopic | null {
  const tokens = splitTopicTokens(input);

  if (tokens.length === 0) return null;

  const categoryIndex = tokens.findIndex((token) => topicAliases.has(token));
  const category =
    categoryIndex >= 0
      ? (topicAliases.get(tokens[categoryIndex]) ?? null)
      : null;
  const tags = tokens.filter((_, index) => index !== categoryIndex).slice(0, 8);

  return {
    category,
    source,
    tags,
  };
}

export function formatFeedTopicInput(topic: FeedPostTopic) {
  const values = [
    topic.category ? feedPostTopicLabels[topic.category] : null,
    ...topic.tags,
  ].filter((value): value is string => Boolean(value));

  return values.join(", ");
}

export function suggestFeedTopic({
  body,
  imageHints = [],
  photoCount = 0,
}: {
  body: string;
  imageHints?: string[];
  photoCount?: number;
}): FeedPostTopic {
  const normalizedBody = body.trim().toLocaleLowerCase("ko-KR");
  const searchableText = `${normalizedBody} ${imageHints.join(" ")}`;
  const scores = new Map<FeedPostTopicCategory, number>(
    feedPostTopicCategories.map((category) => [category, 0]),
  );

  for (const category of feedPostTopicCategories) {
    const score = categoryKeywords[category].reduce(
      (total, keyword) =>
        total + (includesTopicKeyword(searchableText, keyword) ? 1 : 0),
      0,
    );
    scores.set(category, score);
  }

  if (photoCount > 0) {
    scores.set("daily_life", (scores.get("daily_life") ?? 0) + 1);
  }

  const category =
    [...scores.entries()].sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return (
        feedPostTopicCategories.indexOf(left[0]) -
        feedPostTopicCategories.indexOf(right[0])
      );
    })[0]?.[0] ?? "thoughts";
  const tags = uniqueTopicValues([
    ...tagKeywords.filter((tag) => includesTopicKeyword(searchableText, tag)),
    ...imageHints,
    ...(photoCount > 0 && imageHints.length === 0 ? ["사진"] : []),
  ]).slice(0, 4);

  return {
    category,
    source: "local_suggestion",
    tags,
  };
}

function includesTopicKeyword(text: string, keyword: string) {
  if (keyword === "책") {
    return text.replaceAll("산책", "").includes(keyword);
  }

  return text.includes(keyword.toLocaleLowerCase("ko-KR"));
}

function splitTopicTokens(input: string) {
  return uniqueTopicValues(
    input
      .split(/[,#\n]/)
      .map((value) => value.trim().replace(/\s+/g, " "))
      .filter(Boolean),
  ).slice(0, 9);
}

function uniqueTopicValues(values: string[]) {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    const normalized = value.trim().replace(/^#+/, "").slice(0, 20);
    const key = normalized.toLocaleLowerCase("ko-KR");

    if (!normalized || seen.has(key)) return [];
    seen.add(key);
    return [normalized];
  });
}

export function extractCompletedFeedTags(
  input: string,
  currentTags: string[] = [],
) {
  const tags = uniqueTopicValues(currentTags).slice(0, maxFeedTagCount);
  let limitReached = false;
  const body = input.replace(
    /(^|\s)#([\p{Letter}\p{Number}_]{1,20})(?=\s)/gu,
    (match, prefix: string, rawTag: string) => {
      const normalized = normalizeFeedTag(rawTag);
      const duplicate = tags.some(
        (tag) =>
          tag.toLocaleLowerCase("ko-KR") ===
          normalized.toLocaleLowerCase("ko-KR"),
      );

      if (duplicate) return prefix;
      if (tags.length >= maxFeedTagCount) {
        limitReached = true;
        return match;
      }

      tags.push(normalized);
      return prefix;
    },
  );

  return {
    body: body.replace(/[ \t]{2,}/g, " "),
    limitReached,
    tags,
  };
}

export function normalizeFeedTag(value: string) {
  return value
    .trim()
    .replace(/^#+/, "")
    .replace(/[^\p{Letter}\p{Number}_]/gu, "")
    .slice(0, 20);
}

export function normalizeFeedTagParam(value: string) {
  try {
    return normalizeFeedTag(decodeURIComponent(value));
  } catch {
    return normalizeFeedTag(value);
  }
}
