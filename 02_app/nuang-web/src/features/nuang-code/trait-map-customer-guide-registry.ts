import { enakqCustomerGuideV2 } from "@/features/nuang-code/enakq-customer-guide-v2";
import type { TraitMapCustomerGuide } from "@/features/nuang-code/trait-map-customer-guide-contract";

const publishedCustomerGuides: Readonly<Record<string, TraitMapCustomerGuide>> =
  {
    ENAKQ: enakqCustomerGuideV2,
  };

export function getPublishedTraitMapCustomerGuide(code: string) {
  return publishedCustomerGuides[code.trim().toUpperCase()] ?? null;
}
