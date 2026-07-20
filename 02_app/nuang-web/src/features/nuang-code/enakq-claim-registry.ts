import registryDocument from "@/features/nuang-code/fixtures/enakq-claim-registry.generated.json";
import {
  traitClaimRegistrySchema,
  type TraitClaimRegistry,
  type TraitClaimRegistryEntry,
  type TraitKnowledgeSurface,
  type TraitProfileFixture,
} from "@/features/nuang-code/trait-map-knowledge-contract";

export const enakqClaimRegistry: TraitClaimRegistry =
  traitClaimRegistrySchema.parse(registryDocument);

export type TraitClaimSelectionMode =
  "production" | "review_preview" | "research_audit";

export type SelectTraitClaimsInput = {
  context?: TraitClaimRegistryEntry["contexts"][number];
  fixture: TraitProfileFixture;
  mode: TraitClaimSelectionMode;
  registry?: TraitClaimRegistry;
  surface: TraitKnowledgeSurface;
};

export function selectTraitClaims({
  context = "general",
  fixture,
  mode,
  registry = enakqClaimRegistry,
  surface,
}: SelectTraitClaimsInput) {
  const availableSignals = new Set(fixture.availableSignals);
  const seenContentKeys = new Set<string>();

  return registry.entries.filter((claim) => {
    if (!claim.candidateSurfaces.includes(surface)) return false;
    if (claim.contexts[0] !== "general" && !claim.contexts.includes(context)) {
      return false;
    }
    if (claim.requiredSignals.some((signal) => !availableSignals.has(signal))) {
      return false;
    }
    if (
      (surface === "comparison_report" || surface === "public_profile") &&
      claim.privacyScope === "self_only"
    ) {
      return false;
    }
    if (mode === "production" && claim.publicationState !== "approved") {
      return false;
    }
    if (
      mode === "review_preview" &&
      claim.publicationState === "research_only"
    ) {
      return false;
    }
    if (seenContentKeys.has(claim.contentKey)) return false;

    seenContentKeys.add(claim.contentKey);
    return true;
  });
}

export function getClaimById(claimId: string) {
  return (
    enakqClaimRegistry.entries.find((claim) => claim.claimId === claimId) ??
    null
  );
}
