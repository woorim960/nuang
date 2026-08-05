import { enakqCustomerGuideV2 } from "@/features/nuang-code/enakq-customer-guide-v2";
import { engkcCustomerGuideV3 } from "@/features/nuang-code/engkc-customer-guide-v3";
import { candidateProfileDefinitions } from "@/features/nuang-code/candidate-profile-names";
import type { TraitMapCustomerGuide } from "@/features/nuang-code/trait-map-customer-guide-contract";
import { buildTraitMapCustomerGuideV3 } from "@/features/nuang-code/trait-map-customer-guide-v3-builder";
import {
  createTraitMapGuideReleaseDigest,
  reviewTraitMapGuideForBeta,
  type TraitMapGuideAiReviewProfile,
} from "@/features/nuang-code/trait-map-guide-review";
import { traitMapGuideBetaReleaseId } from "@/features/nuang-code/trait-map-guide-review-contract";

const generatedCustomerGuides = Object.fromEntries(
  Object.keys(candidateProfileDefinitions).map((code) => [
    code,
    buildTraitMapCustomerGuideV3(code),
  ]),
) as Record<string, TraitMapCustomerGuide>;

const publishedCustomerGuides: Readonly<Record<string, TraitMapCustomerGuide>> =
  generatedCustomerGuides;

const betaAiReviewProfiles = Object.values(publishedCustomerGuides)
  .map((guide) => reviewTraitMapGuideForBeta(guide))
  .sort((left, right) => left.profileCode.localeCompare(right.profileCode));

/**
 * 베타에서는 동일한 원고 해시를 일곱 전문 역할이 모두 통과한 코드만 상세
 * 성향지도에 노출합니다. 이 상태는 AI 베타 검수 완료이며 사람 검수 완료를
 * 뜻하지 않습니다. MVP 사람 검수는 운영센터의 별도 승인 채널에 남습니다.
 */
const customerApprovedGuideCodes = new Set(
  betaAiReviewProfiles
    .filter((profile) => profile.approved && profile.chapterCount === 15)
    .map((profile) => profile.profileCode),
);

/**
 * 결과 완료 당시 고객 가이드를 다시 열기 위한 version archive입니다.
 * 새 가이드를 발행할 때는 기존 version을 제거하지 않고 이 archive에 남겨야 합니다.
 */
const archivedCustomerGuides: Readonly<
  Record<string, Readonly<Record<string, TraitMapCustomerGuide>>>
> = Object.fromEntries(
  Object.entries(publishedCustomerGuides).map(([code, guide]) => [
    code,
    {
      [guide.version]: guide,
      ...(code === "ENAKQ"
        ? { [enakqCustomerGuideV2.version]: enakqCustomerGuideV2 }
        : {}),
      ...(code === "ENGKC"
        ? { [engkcCustomerGuideV3.version]: engkcCustomerGuideV3 }
        : {}),
    },
  ]),
);

/**
 * @deprecated Research draft/archive lookup only. Customer screens must call
 * getCustomerApprovedTraitMapGuide so an unreviewed draft cannot be exposed.
 */
export function getPublishedTraitMapCustomerGuide(code: string) {
  return publishedCustomerGuides[code.trim().toUpperCase()] ?? null;
}

export function getCustomerApprovedTraitMapGuide(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  if (!customerApprovedGuideCodes.has(normalizedCode)) return null;
  return publishedCustomerGuides[normalizedCode] ?? null;
}

export function getCustomerApprovedTraitMapGuideCodes() {
  return [...customerApprovedGuideCodes].sort();
}

export function getTraitMapBetaAiReviewProfiles(): readonly TraitMapGuideAiReviewProfile[] {
  return betaAiReviewProfiles;
}

export function getTraitMapBetaAiReviewProfile(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  return (
    betaAiReviewProfiles.find(
      (profile) => profile.profileCode === normalizedCode,
    ) ?? null
  );
}

export function getTraitMapBetaAiReleaseSummary() {
  return {
    approvedProfileCount: betaAiReviewProfiles.filter(
      (profile) => profile.approved,
    ).length,
    contentDigest: createTraitMapGuideReleaseDigest(betaAiReviewProfiles),
    profileCount: betaAiReviewProfiles.length,
    releaseId: traitMapGuideBetaReleaseId,
    unitCount: betaAiReviewProfiles.reduce(
      (total, profile) => total + profile.unitCount,
      0,
    ),
  } as const;
}

/** @deprecated Research draft/archive inventory only. */
export function getPublishedTraitMapCustomerGuideCodes() {
  return Object.keys(publishedCustomerGuides).sort();
}

export function getArchivedTraitMapCustomerGuide(
  code: string,
  version: string,
) {
  return (
    archivedCustomerGuides[code.trim().toUpperCase()]?.[version.trim()] ?? null
  );
}

export function getArchivedTraitMapCustomerGuideVersions(code: string) {
  return Object.keys(
    archivedCustomerGuides[code.trim().toUpperCase()] ?? {},
  ).sort();
}
