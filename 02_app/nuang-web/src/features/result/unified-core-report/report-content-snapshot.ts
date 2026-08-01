import {
  candidateProfileNameReleaseId,
  candidateProfileNarrativeVersion,
} from "@/features/nuang-code/candidate-profile-names";
import {
  getArchivedTraitMapCustomerGuide,
  getPublishedTraitMapCustomerGuide,
} from "@/features/nuang-code/trait-map-customer-guide-registry";
import {
  getTraitMapResultSummaryPublicationByDigestV2,
  resolveTraitMapResultSummaryV2,
} from "@/features/nuang-code/trait-map-result-summary-publication-v2";
import { precisionFacetInsightCopyVersion } from "@/features/result/precision-report-insights";
import { buildReleaseTwoOwnerSections } from "./core-result-section-contract";
import { buildCoreResultExcerpt } from "./core-result-excerpt-manifest";
import type {
  CoreResultKind,
  CoreResultReportSection,
} from "./core-result-report-model";
import {
  reportContentSnapshotSchema,
  reportContentSnapshotVersion,
  type ReportContentSnapshot,
} from "./report-content-snapshot-contract";

export {
  reportContentSnapshotSchema,
  reportContentSnapshotVersion,
  type ReportContentSnapshot,
};

export type ReportContentSnapshotResolution =
  | {
      status: "resolved";
      canonicalRefs: Array<{
        canonicalVariantId: string;
        contentKey: string;
        version: number;
      }>;
      excerptManifestDigest: string | null;
      guideVersion: string | null;
      sections: CoreResultReportSection[];
    }
  | {
      status: "unavailable";
      canonicalRefs: [];
      diagnostic:
        | "MANIFEST_ARCHIVE_MISSING"
        | "PROFILE_NAME_RELEASE_MISMATCH"
        | "SECTION_ARCHIVE_MISSING"
        | "CANONICAL_ARCHIVE_MISSING"
        | "GUIDE_ARCHIVE_MISSING"
        | "EXCERPT_MANIFEST_ARCHIVE_MISSING";
      excerptManifestDigest: null;
      guideVersion: null;
      sections: CoreResultReportSection[];
    };

type SnapshotBuildInput = {
  code: string;
  kind: CoreResultKind;
  measurementVersion: string;
};

export function buildReportContentSnapshot({
  code,
  kind,
  measurementVersion,
}: SnapshotBuildInput): ReportContentSnapshot {
  const guide = getPublishedTraitMapCustomerGuide(code);
  const canonicalResolution = resolveTraitMapResultSummaryV2({ code });
  const excerptManifest = guide
    ? buildCoreResultExcerpt(guide, kind).manifest
    : null;
  const sections = buildReleaseTwoOwnerSections(
    {
      code,
      facetContentVersion: precisionFacetInsightCopyVersion,
      guideVersion: guide?.version ?? null,
      kind,
      measurementVersion,
      profileContentVersion: candidateProfileNarrativeVersion,
      renderGuide: Boolean(guide),
      renderMeasurement: true,
    },
    canonicalResolution.claims,
  );

  return reportContentSnapshotSchema.parse({
    excerptManifestDigest: excerptManifest?.digest ?? null,
    guideVersion: guide?.version ?? null,
    manifestDigest: canonicalResolution.manifestDigest,
    profileNameReleaseId: candidateProfileNameReleaseId,
    schemaVersion: reportContentSnapshotVersion,
    sections: sections.map((section) => ({
      canonicalVariantId: section.canonicalVariantId,
      canonicalVersion: section.canonicalVersion,
      contentKey: section.contentKey,
      contentVersion: section.contentVersion,
      privacyScope: section.privacyScope,
      sectionId: section.sectionId,
      sourceClass: section.sourceClass,
    })),
    surface: "owner_report",
    traitMapBaselineId: canonicalResolution.baselineId,
  });
}

export function resolveReportContentSnapshot({
  code,
  kind,
  measurementVersion,
  snapshot,
}: SnapshotBuildInput & {
  snapshot: ReportContentSnapshot;
}): ReportContentSnapshotResolution {
  const publication = getTraitMapResultSummaryPublicationByDigestV2(
    snapshot.manifestDigest,
  );
  if (!publication) {
    return unavailable("MANIFEST_ARCHIVE_MISSING");
  }
  if (snapshot.profileNameReleaseId !== candidateProfileNameReleaseId) {
    return unavailable("PROFILE_NAME_RELEASE_MISMATCH");
  }

  const guide = snapshot.guideVersion
    ? getArchivedTraitMapCustomerGuide(code, snapshot.guideVersion)
    : getPublishedTraitMapCustomerGuide(code);
  if (snapshot.guideVersion && !guide) {
    return unavailable("GUIDE_ARCHIVE_MISSING");
  }
  const excerptManifest = guide
    ? buildCoreResultExcerpt(guide, kind).manifest
    : null;
  if (
    snapshot.excerptManifestDigest &&
    excerptManifest?.digest !== snapshot.excerptManifestDigest
  ) {
    return unavailable("EXCERPT_MANIFEST_ARCHIVE_MISSING");
  }
  const canonicalResolution = resolveTraitMapResultSummaryV2({
    code,
    publication,
  });
  const currentSections = buildReleaseTwoOwnerSections(
    {
      code,
      facetContentVersion: precisionFacetInsightCopyVersion,
      guideVersion: guide?.version ?? null,
      kind,
      measurementVersion,
      profileContentVersion: candidateProfileNarrativeVersion,
      renderGuide: Boolean(guide),
      renderMeasurement: true,
    },
    canonicalResolution.claims,
  );
  const currentByIdentity = new Map(
    currentSections.map((section) => [sectionIdentity(section), section]),
  );
  const resolvedSections = snapshot.sections.flatMap((stored) => {
    const current = currentByIdentity.get(sectionIdentity(stored));
    return current ? [current] : [];
  });

  if (resolvedSections.length !== snapshot.sections.length) {
    const missingCanonical = snapshot.sections.some(
      (section) =>
        section.canonicalVariantId &&
        !resolvedSections.some(
          (resolved) =>
            resolved.canonicalVariantId === section.canonicalVariantId &&
            resolved.canonicalVersion === section.canonicalVersion,
        ),
    );
    return unavailable(
      missingCanonical
        ? "CANONICAL_ARCHIVE_MISSING"
        : "SECTION_ARCHIVE_MISSING",
    );
  }

  return {
    status: "resolved",
    canonicalRefs: resolvedSections.flatMap((section) =>
      section.canonicalVariantId && section.canonicalVersion
        ? [
            {
              canonicalVariantId: section.canonicalVariantId,
              contentKey: section.contentKey,
              version: section.canonicalVersion,
            },
          ]
        : [],
    ),
    excerptManifestDigest: excerptManifest?.digest ?? null,
    guideVersion: guide?.version ?? null,
    sections: resolvedSections,
  };
}

function sectionIdentity(
  section: Pick<
    CoreResultReportSection,
    | "canonicalVariantId"
    | "canonicalVersion"
    | "contentKey"
    | "contentVersion"
    | "privacyScope"
    | "sectionId"
    | "sourceClass"
  >,
) {
  return [
    section.sectionId,
    section.sourceClass,
    section.contentKey,
    section.contentVersion,
    section.canonicalVariantId ?? "none",
    section.canonicalVersion ?? "none",
    section.privacyScope,
  ].join("|");
}

function unavailable(
  diagnostic: Extract<
    ReportContentSnapshotResolution,
    { status: "unavailable" }
  >["diagnostic"],
): ReportContentSnapshotResolution {
  return {
    canonicalRefs: [],
    diagnostic,
    excerptManifestDigest: null,
    guideVersion: null,
    sections: [],
    status: "unavailable",
  };
}
