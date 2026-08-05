import { describe, expect, it } from "vitest";
import { candidateFullScoringRelease } from "@/features/assessment/candidate-full-core-seed";
import {
  buildReportContentSnapshot,
  reportContentSnapshotSchema,
  resolveReportContentSnapshot,
} from "./report-content-snapshot";

describe("core result report content snapshot v2", () => {
  it("freezes every rendered section with an exact content version", () => {
    const snapshot = buildReportContentSnapshot({
      code: "ENAKQ",
      kind: "full",
      measurementVersion: "candidate-result-copy.v1",
    });

    expect(snapshot.schemaVersion).toBe(
      "nuang-core-result-content-snapshot.v2",
    );
    expect(snapshot.guideVersion).toBe("ENAKQ-CUSTOMER-GUIDE-4.0-BETA-AI");
    expect(snapshot.excerptManifestDigest).toMatch(/^fnv1a32x2:[a-f0-9]{16}$/);
    expect(snapshot.sections.length).toBeGreaterThan(5);
    expect(snapshot.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contentKey: "guide.ENAKQ.contexts",
          contentVersion: "ENAKQ-CUSTOMER-GUIDE-4.0-BETA-AI",
          sourceClass: "current_customer_guide",
        }),
      ]),
    );
    expect(snapshot.sections.every((section) => section.contentVersion)).toBe(
      true,
    );
  });

  it("resolves only the exact archived manifest and section versions", () => {
    const snapshot = buildReportContentSnapshot({
      code: "ENAKQ",
      kind: "full",
      measurementVersion: "candidate-result-copy.v1",
    });
    const resolved = resolveReportContentSnapshot({
      code: "ENAKQ",
      kind: "full",
      measurementVersion: "candidate-result-copy.v1",
      snapshot,
    });

    expect(resolved.status).toBe("resolved");
    expect(resolved.sections).toHaveLength(snapshot.sections.length);
    expect(resolved).toMatchObject({
      excerptManifestDigest: snapshot.excerptManifestDigest,
      guideVersion: snapshot.guideVersion,
    });
  });

  it("fails closed if a stored section version is no longer archived", () => {
    const snapshot = buildReportContentSnapshot({
      code: "ENAKQ",
      kind: "full",
      measurementVersion: "candidate-result-copy.v1",
    });
    const tampered = reportContentSnapshotSchema.parse({
      ...snapshot,
      sections: snapshot.sections.map((section, index) =>
        index === 0
          ? { ...section, contentVersion: "REMOVED-CONTENT-9.9" }
          : section,
      ),
    });

    expect(
      resolveReportContentSnapshot({
        code: "ENAKQ",
        kind: "full",
        measurementVersion: "candidate-result-copy.v1",
        snapshot: tampered,
      }),
    ).toMatchObject({
      diagnostic: "SECTION_ARCHIVE_MISSING",
      sections: [],
      status: "unavailable",
    });
  });

  it("rejects an unknown manifest instead of silently using current copy", () => {
    const snapshot = buildReportContentSnapshot({
      code: "ENAKQ",
      kind: "full",
      measurementVersion: candidateFullScoringRelease.scoringModelVersion,
    });

    expect(
      resolveReportContentSnapshot({
        code: "ENAKQ",
        kind: "full",
        measurementVersion: candidateFullScoringRelease.scoringModelVersion,
        snapshot: { ...snapshot, manifestDigest: "UNKNOWN-MANIFEST" },
      }),
    ).toMatchObject({
      diagnostic: "MANIFEST_ARCHIVE_MISSING",
      status: "unavailable",
    });
  });

  it("rejects a guide version that is absent from the immutable archive", () => {
    const snapshot = buildReportContentSnapshot({
      code: "ENAKQ",
      kind: "full",
      measurementVersion: "candidate-result-copy.v1",
    });

    expect(
      resolveReportContentSnapshot({
        code: "ENAKQ",
        kind: "full",
        measurementVersion: "candidate-result-copy.v1",
        snapshot: { ...snapshot, guideVersion: "REMOVED-GUIDE-9.9" },
      }),
    ).toMatchObject({
      diagnostic: "GUIDE_ARCHIVE_MISSING",
      status: "unavailable",
    });
  });

  it("rejects a changed excerpt manifest instead of showing different copy", () => {
    const snapshot = buildReportContentSnapshot({
      code: "ENAKQ",
      kind: "quick",
      measurementVersion: "candidate-result-copy.v1",
    });

    expect(
      resolveReportContentSnapshot({
        code: "ENAKQ",
        kind: "quick",
        measurementVersion: "candidate-result-copy.v1",
        snapshot: {
          ...snapshot,
          excerptManifestDigest: "fnv1a32x2:0000000000000000",
        },
      }),
    ).toMatchObject({
      diagnostic: "EXCERPT_MANIFEST_ARCHIVE_MISSING",
      status: "unavailable",
    });
  });
});
