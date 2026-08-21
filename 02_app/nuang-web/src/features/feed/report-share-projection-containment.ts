import { parseProfileReportKey } from "@/features/public-profile/profile-report-contract";

type ReportShareProjectionRecord = Record<string, unknown>;

export function sanitizeNonCoreReportShareProjection<
  T extends ReportShareProjectionRecord,
>(projection: T): T {
  const reportType = readNonCoreReportType(projection);
  if (!reportType) return projection;

  return {
    ...projection,
    profileCode: "",
    profileName: readNonCoreResultNameFallback(projection),
    reportType,
  } as T;
}

export function sanitizeNonCoreReportShareInPublicProjection<
  T extends ReportShareProjectionRecord,
>(publicProjection: T): T {
  const reportShare = publicProjection.reportShare;
  if (
    !reportShare ||
    typeof reportShare !== "object" ||
    Array.isArray(reportShare)
  ) {
    return publicProjection;
  }

  const sanitizedReportShare = sanitizeNonCoreReportShareProjection(
    reportShare as ReportShareProjectionRecord,
  );
  if (sanitizedReportShare === reportShare) return publicProjection;

  return {
    ...publicProjection,
    reportShare: sanitizedReportShare,
  } as T;
}

function readNonCoreResultNameFallback(
  projection: ReportShareProjectionRecord,
) {
  const fallbackCandidates = [
    projection.resultLabel,
    projection.assessmentTitle,
  ];

  for (const value of fallbackCandidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return readNonCoreReportType(projection) === "topic"
    ? "주제 검사 결과"
    : "별난 연구소 결과";
}

function readNonCoreReportType(projection: ReportShareProjectionRecord) {
  if (projection.reportType === "topic" || projection.reportType === "lab") {
    return projection.reportType;
  }

  const parsedKey =
    typeof projection.reportKey === "string"
      ? parseProfileReportKey(projection.reportKey)
      : null;
  return parsedKey?.kind === "topic" || parsedKey?.kind === "lab"
    ? parsedKey.kind
    : null;
}
