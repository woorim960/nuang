import {
  traitMapChangeContextEvidenceFindingsV2,
  traitMapChangeContextEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-change-context-evidence-v2";
import {
  traitMapFoundationConstructMappingsV2,
  traitMapFoundationEvidenceFindingsV2,
  traitMapFoundationEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-foundation-evidence-v2";
import {
  traitMapFriendshipEvidenceFindingsV2,
  traitMapFriendshipEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-friendship-evidence-v2";
import {
  traitMapProcessEvidenceFindingsV2,
  traitMapProcessEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-process-evidence-v2";
import {
  traitMapRelationshipEvidenceFindingsV2,
  traitMapRelationshipEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-relationship-evidence-v2";
import {
  traitMapWorkEvidenceFindingsV2,
  traitMapWorkEvidenceSourcesV2,
} from "@/features/nuang-code/trait-map-work-evidence-v2";

export const traitMapEvidenceSourcesV2 = [
  ...traitMapChangeContextEvidenceSourcesV2,
  ...traitMapFoundationEvidenceSourcesV2,
  ...traitMapFriendshipEvidenceSourcesV2,
  ...traitMapRelationshipEvidenceSourcesV2,
  ...traitMapProcessEvidenceSourcesV2,
  ...traitMapWorkEvidenceSourcesV2,
] as const;

export const traitMapEvidenceFindingsV2 = [
  ...traitMapChangeContextEvidenceFindingsV2,
  ...traitMapFoundationEvidenceFindingsV2,
  ...traitMapFriendshipEvidenceFindingsV2,
  ...traitMapRelationshipEvidenceFindingsV2,
  ...traitMapProcessEvidenceFindingsV2,
  ...traitMapWorkEvidenceFindingsV2,
] as const;

export const traitMapConstructMappingsV2 =
  traitMapFoundationConstructMappingsV2;

export const traitMapEvidenceRegistryV2 = {
  sources: traitMapEvidenceSourcesV2,
  findings: traitMapEvidenceFindingsV2,
  constructMappings: traitMapConstructMappingsV2,
} as const;

export function getIncludedTraitMapEvidenceSourceIdsV2() {
  return new Set<string>(
    traitMapEvidenceSourcesV2
      .filter((source) => source.screeningStatus === "included")
      .map((source) => source.sourceId),
  );
}
