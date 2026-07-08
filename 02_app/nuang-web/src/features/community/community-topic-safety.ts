export const sensitiveCommunityTopicKeywords = [
  "adhd",
  "마약",
  "사이코패스",
  "성적 지향",
  "약물",
  "우울",
  "자살",
  "중독",
  "트라우마",
  "폭력",
  "해치",
] as const;

export function hasSensitiveCommunityTopic(body: string) {
  const normalized = body.toLowerCase();

  return sensitiveCommunityTopicKeywords.some((keyword) =>
    normalized.includes(keyword.toLowerCase()),
  );
}
