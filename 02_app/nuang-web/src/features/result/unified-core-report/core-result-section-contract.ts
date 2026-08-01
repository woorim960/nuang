import type {
  CoreResultKind,
  CoreResultReportSection,
} from "./core-result-report-model";
import type { ResolvedTraitMapResultSummaryClaimV2 } from "@/features/nuang-code/trait-map-result-summary-publication-v2";

type OwnerSectionInput = {
  code: string;
  facetContentVersion: string;
  guideVersion: string | null;
  kind: CoreResultKind;
  measurementVersion: string | null;
  profileContentVersion: string;
  renderGuide: boolean;
  renderMeasurement: boolean;
};

const releaseTwoOmissionCodes = [
  "APPROVED_CANONICAL_SUMMARY",
  "ACTION_EXPERIMENT",
] as const;
const resultReadingGuideVersion = "NUANG-RESULT-READING-GUIDE-1.0";

export function buildReleaseOneOwnerSections({
  code,
  facetContentVersion,
  guideVersion,
  kind,
  measurementVersion,
  profileContentVersion,
  renderGuide,
  renderMeasurement,
}: OwnerSectionInput): CoreResultReportSection[] {
  const sections: CoreResultReportSection[] = [
    ownerSection({
      contentKey: `profile.${code}.overview`,
      contentVersion: profileContentVersion,
      requiredSignals: ["profile_code"],
      sectionId: "profile_overview",
      sourceClass: "current_customer_guide",
    }),
  ];

  if (renderMeasurement) {
    sections.push(
      ownerSection({
        contentKey: "measurement.domain_directions",
        contentVersion: measurementVersion ?? "measurement-version-unknown",
        requiredSignals: ["five_domain_scores"],
        sectionId: "five_letter_explorer",
        sourceClass: "measurement",
      }),
    );
    if (kind === "full") {
      sections.push(
        ownerSection({
          contentKey: "customer_copy.precision_facets",
          contentVersion: facetContentVersion,
          requiredSignals: ["valid_precision_facets"],
          sectionId: "precision_signals",
          sourceClass: "current_customer_guide",
        }),
      );
    }
  }

  if (renderGuide && guideVersion) {
    sections.push(
      ownerSection({
        contentKey: `guide.${code}.contexts`,
        contentVersion: guideVersion,
        requiredSignals: ["profile_code"],
        sectionId: "life_contexts",
        sourceClass: "current_customer_guide",
      }),
      ownerSection({
        contentKey: `guide.${code}.strength_and_growth`,
        contentVersion: guideVersion,
        requiredSignals: ["profile_code"],
        sectionId: "strength_and_overuse",
        sourceClass: "current_customer_guide",
      }),
      ownerSection({
        contentKey: `guide.${code}.misread_and_conversation`,
        contentVersion: guideVersion,
        requiredSignals: ["profile_code"],
        sectionId: "misread_and_conversation",
        sourceClass: "current_customer_guide",
      }),
    );
  }

  sections.push(
    ownerSection({
      contentKey: `profile.${code}.map_bridge`,
      contentVersion: profileContentVersion,
      requiredSignals: ["profile_code"],
      sectionId: "map_bridge",
      sourceClass: "current_customer_guide",
    }),
    ownerSection({
      contentKey: "reflection.result_reading_guide",
      contentVersion: resultReadingGuideVersion,
      requiredSignals: [],
      sectionId: "result_reading_guide",
      sourceClass: "reflection_prompt",
    }),
  );
  if (renderGuide && guideVersion) {
    sections.push(
      ownerSection({
        contentKey: `guide.${code}.evidence_references`,
        contentVersion: guideVersion,
        requiredSignals: ["profile_code"],
        sectionId: "evidence_references",
        sourceClass: "current_customer_guide",
      }),
    );
  }

  return sections;
}

export function buildReleaseTwoOwnerSections(
  input: OwnerSectionInput,
  canonicalClaims: readonly ResolvedTraitMapResultSummaryClaimV2[],
): CoreResultReportSection[] {
  const sections = buildReleaseOneOwnerSections(input);

  canonicalClaims.forEach((claim, index) => {
    const placementSectionId =
      claim.placement === "headline"
        ? "approved_canonical_summary"
        : claim.placement === "overuse_cost"
          ? "approved_overuse_cost"
          : "action_experiment";
    sections.push({
      allowedSurfaces: ["completion", "my"],
      availability: "render",
      canonicalVariantId: claim.canonicalVariantId,
      canonicalVersion: claim.version,
      contentKey: claim.contentKey,
      contentVersion: `canonical-${claim.version}`,
      omissionCode: null,
      privacyScope: "owner_only",
      requiredSignals: ["profile_code"],
      sectionId: `${placementSectionId}.${index + 1}`,
      sourceClass: "approved_canonical",
    });
  });

  return sections;
}

export function buildReleaseOnePublicSections({
  code,
  guideVersion,
  profileContentVersion,
}: {
  code: string;
  guideVersion?: string | null;
  profileContentVersion: string;
}): CoreResultReportSection[] {
  return (["profile", "share"] as const).flatMap((surface) => {
    const privacyScope =
      surface === "profile" ? "profile_public" : "share_public";
    const sections = [
      publicSection({
        contentKey: `profile.${code}.overview`,
        contentVersion: profileContentVersion,
        privacyScope,
        sectionId: `${surface}_profile_overview`,
        surface,
      }),
      publicSection({
        contentKey: `profile.${code}.map_bridge`,
        contentVersion: profileContentVersion,
        privacyScope,
        sectionId: `${surface}_map_bridge`,
        surface,
      }),
      publicSection({
        contentKey: "profile.public_reading_guide",
        contentVersion: profileContentVersion,
        privacyScope,
        sectionId: `${surface}_reading_guide`,
        surface,
      }),
      publicSection({
        contentKey: `profile.${code}.five_letters`,
        contentVersion: profileContentVersion,
        privacyScope,
        sectionId: `${surface}_five_letter_explorer`,
        surface,
      }),
    ];

    if (guideVersion) {
      sections.push(
        publicSection({
          contentKey: `guide.${code}.contexts`,
          contentVersion: guideVersion,
          privacyScope,
          sectionId: `${surface}_life_contexts`,
          surface,
        }),
        publicSection({
          contentKey: `guide.${code}.strength_and_growth`,
          contentVersion: guideVersion,
          privacyScope,
          sectionId: `${surface}_strength_and_overuse`,
          surface,
        }),
        publicSection({
          contentKey: `guide.${code}.misread_and_conversation`,
          contentVersion: guideVersion,
          privacyScope,
          sectionId: `${surface}_misread_and_conversation`,
          surface,
        }),
        publicSection({
          contentKey: `guide.${code}.evidence_references`,
          contentVersion: guideVersion,
          privacyScope,
          sectionId: `${surface}_evidence_references`,
          surface,
        }),
      );
    }

    return sections;
  });
}

export function getReleaseOneOmissionCodes({
  kind,
  publicProjection = false,
  renderGuide,
  renderMeasurement,
}: {
  kind: CoreResultKind;
  publicProjection?: boolean;
  renderGuide: boolean;
  renderMeasurement: boolean;
}) {
  const omissions: string[] = [...releaseTwoOmissionCodes];
  if (publicProjection) omissions.push("OWNER_ONLY_MEASUREMENT");
  if (!renderMeasurement) omissions.push("MEASUREMENT_SECTION_UNAVAILABLE");
  if (kind === "quick") {
    omissions.push("PRECISION_FACETS");
  } else if (!renderGuide) {
    omissions.push("PRECISION_GUIDE_UNAVAILABLE");
  }
  return omissions;
}

function ownerSection({
  contentKey,
  contentVersion,
  requiredSignals,
  sectionId,
  sourceClass,
}: Pick<
  CoreResultReportSection,
  | "contentKey"
  | "contentVersion"
  | "requiredSignals"
  | "sectionId"
  | "sourceClass"
>): CoreResultReportSection {
  return {
    allowedSurfaces: ["completion", "my"],
    availability: "render",
    canonicalVariantId: null,
    canonicalVersion: null,
    contentKey,
    contentVersion,
    omissionCode: null,
    privacyScope: "owner_only",
    requiredSignals,
    sectionId,
    sourceClass,
  };
}

function publicSection({
  contentKey,
  contentVersion,
  privacyScope,
  sectionId,
  surface,
}: {
  contentKey: string;
  contentVersion: string;
  privacyScope: "profile_public" | "share_public";
  sectionId: string;
  surface: "profile" | "share";
}): CoreResultReportSection {
  return {
    allowedSurfaces: [surface],
    availability: "render",
    canonicalVariantId: null,
    canonicalVersion: null,
    contentKey,
    contentVersion,
    omissionCode: null,
    privacyScope,
    requiredSignals: ["profile_code"],
    sectionId,
    sourceClass: "current_customer_guide",
  };
}
