import { describe, expect, it } from "vitest";
import {
  sanitizeNonCoreReportShareInPublicProjection,
  sanitizeNonCoreReportShareProjection,
} from "@/features/feed/report-share-projection-containment";

describe("feed report share projection containment", () => {
  it.each([
    ["topic", "조용한 곁 지킴"],
    ["lab", "천천히 확인하는 관계 탐색가"],
  ] as const)(
    "keeps the %s result while removing its attached candidate code",
    (reportType, profileName) => {
      expect(
        sanitizeNonCoreReportShareProjection({
          profileCode: "INGMC",
          profileName,
          reportType,
          resultLabel: profileName,
          summary: "일반 결과 내용은 유지해요.",
        }),
      ).toEqual({
        profileCode: "",
        profileName,
        reportType,
        resultLabel: profileName,
        summary: "일반 결과 내용은 유지해요.",
      });
    },
  );

  it("replaces a stored candidate role with the non-core result label", () => {
    expect(
      sanitizeNonCoreReportShareProjection({
        assessmentTitle: "애착 탐색",
        profileCode: "ENAKQ",
        profileName: "관계를 여는 선도자",
        reportType: "lab",
        resultLabel: "별난 연구소 결과",
      }),
    ).toMatchObject({
      profileCode: "",
      profileName: "별난 연구소 결과",
      reportType: "lab",
    });
  });

  it("infers a legacy non-core projection from its canonical report key", () => {
    expect(
      sanitizeNonCoreReportShareProjection({
        profileCode: "INGMC",
        profileName: "조용한 곁 지킴",
        reportKey: "topic_44444444-4444-4444-8444-444444444444",
        assessmentTitle: "위로받을 때 필요한 것",
      }),
    ).toMatchObject({
      profileCode: "",
      profileName: "위로받을 때 필요한 것",
      reportType: "topic",
    });
  });

  it.each([
    {
      assessmentTitle: "위로받을 때 필요한 것",
      expected: "위로받을 때 필요한 것",
      profileCode: "",
      profileName: "새 가능성을 찾는 탐험가",
      reportType: "topic",
    },
    {
      assessmentTitle: "애착 탐색",
      expected: "안전한 관계 탐색",
      profileCode: "INGMC",
      profileName: "관계를 여는 선도자",
      reportType: "lab",
      resultLabel: "안전한 관계 탐색",
    },
  ] as const)(
    "does not trust a stored candidate role for a $reportType projection",
    ({ expected, ...projection }) => {
      expect(sanitizeNonCoreReportShareProjection(projection)).toMatchObject({
        profileCode: "",
        profileName: expected,
        reportType: projection.reportType,
      });
    },
  );

  it.each([
    ["topic", "주제 검사 결과"],
    ["lab", "별난 연구소 결과"],
  ] as const)(
    "uses the generic %s label when no non-core result label is available",
    (reportType, expected) => {
      expect(
        sanitizeNonCoreReportShareProjection({
          profileCode: "",
          profileName: "새 가능성을 찾는 탐험가",
          reportType,
        }),
      ).toMatchObject({
        profileCode: "",
        profileName: expected,
        reportType,
      });
    },
  );

  it("leaves core projections unchanged", () => {
    const reportShare = {
      profileCode: "ENAKQ",
      profileName: "관계를 여는 선도자",
      reportType: "core",
    };
    const publicProjection = { reportShare, source: "report_share" };

    expect(sanitizeNonCoreReportShareInPublicProjection(publicProjection)).toBe(
      publicProjection,
    );
    expect(publicProjection.reportShare).toBe(reportShare);
  });
});
