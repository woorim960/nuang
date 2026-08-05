/**
 * Topic reports are useful as topic-specific reflections, but their mappings
 * to the five representative Nuang-code axes have not completed validation.
 *
 * This gate is intentionally release-specific and fail-closed. A current or
 * future topic slug cannot affect the representative code merely by declaring
 * itself eligible in assessment content. Enabling a topic later requires an
 * exact, reviewed release key to be added here and supplied by every evidence
 * writer.
 */
export const topicRepresentativeCodeEvidencePolicy = {
  approvedReleaseKeys: [] as readonly string[],
  defaultDecision: "exclude" as const,
  policyId: "NUANG-TOPIC-REPRESENTATIVE-CODE-GATE-1.0",
  rationale:
    "주제검사와 대표 뉴앙 코드 사이의 문항별 내용 타당도 검증이 끝나기 전까지 주제 결과는 해당 주제 리포트에만 사용합니다.",
  status: "excluded_pending_validation" as const,
};

export function canTopicEvidenceUpdateRepresentativeCode({
  releaseKey,
  slug,
}: {
  releaseKey?: string | null;
  slug: string;
}) {
  const normalizedSlug = slug.trim();
  const normalizedReleaseKey = releaseKey?.trim();
  if (!normalizedSlug || !normalizedReleaseKey) return false;

  return topicRepresentativeCodeEvidencePolicy.approvedReleaseKeys.includes(
    `${normalizedSlug}@${normalizedReleaseKey}`,
  );
}
