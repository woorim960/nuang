import { enakqCustomerGuideV2 } from "@/features/nuang-code/enakq-customer-guide-v2";
import { engkcCustomerGuideV3 } from "@/features/nuang-code/engkc-customer-guide-v3";
import { longformCustomerGuideSources } from "@/features/nuang-code/longform-customer-guide-sources";
import type { TraitMapCustomerGuide } from "@/features/nuang-code/trait-map-customer-guide-contract";
import { buildTraitMapCustomerGuideV3 } from "@/features/nuang-code/trait-map-customer-guide-v3-builder";

const generatedCustomerGuides = Object.fromEntries(
  Object.keys(longformCustomerGuideSources).map((code) => [
    code,
    buildTraitMapCustomerGuideV3(code),
  ]),
) as Record<string, TraitMapCustomerGuide>;

const publishedCustomerGuides: Readonly<Record<string, TraitMapCustomerGuide>> =
  {
    ...generatedCustomerGuides,
    ENAKQ: enakqCustomerGuideV2,
    ENGKC: engkcCustomerGuideV3,
  };

/**
 * 결과 완료 당시 고객 가이드를 다시 열기 위한 version archive입니다.
 * 새 가이드를 발행할 때는 기존 version을 제거하지 않고 이 archive에 남겨야 합니다.
 */
const archivedCustomerGuides: Readonly<
  Record<string, Readonly<Record<string, TraitMapCustomerGuide>>>
> = Object.fromEntries(
  Object.entries(publishedCustomerGuides).map(([code, guide]) => [
    code,
    { [guide.version]: guide },
  ]),
);

export function getPublishedTraitMapCustomerGuide(code: string) {
  return publishedCustomerGuides[code.trim().toUpperCase()] ?? null;
}

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
