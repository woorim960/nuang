export const freeTopicResultFormatVersion = 2;
export const freeTopicScoringVersion = "server-v2-missing-aware";
export const freeTopicReportContentVersion = "free-topic-report-v2";
export const freeTopicEvidenceVersion = "free-topic-evidence-v1";

const instrumentReleaseDate = "2026-07-28";

export function getFreeTopicInstrumentVersion(slug: string) {
  if (slug === "comfort-style") {
    return "comfort-style-v4-support-breadth-2026-07-28";
  }
  if (slug === "apology-style") {
    return "apology-style-v3-common-scenes-2026-07-28";
  }
  if (slug === "hurt-expression") {
    return "hurt-expression-v2-common-scenes-2026-07-28";
  }
  if (slug === "recharge-routine") {
    return "recharge-routine-v2-common-scenes-2026-07-29";
  }
  if (slug === "focus-switch") {
    return "focus-switch-v3-restart-language-2026-07-29";
  }
  if (slug === "organizing-style") {
    return "organizing-style-v3-four-dimensions-2026-07-29";
  }

  return `${slug}-${instrumentReleaseDate}`;
}

export function getFreeTopicScoringVersion(slug: string) {
  if (slug === "comfort-style") {
    return "comfort-style-scoring-v4-complete-scenes";
  }
  if (slug === "apology-style") {
    return "apology-style-scoring-v3-complete-scenes";
  }
  if (slug === "hurt-expression") {
    return "hurt-expression-scoring-v2-complete-scenes";
  }
  if (slug === "recharge-routine") {
    return "recharge-routine-scoring-v2-complete-scenes";
  }
  if (slug === "focus-switch") {
    return "focus-switch-scoring-v2-complete-scenes";
  }
  if (slug === "organizing-style") {
    return "organizing-style-scoring-v3-four-dimension-scenes";
  }
  return freeTopicScoringVersion;
}

export function getFreeTopicReportContentVersion(slug: string) {
  if (slug === "comfort-style") {
    return "comfort-style-report-v10-direct-fit";
  }
  if (slug === "apology-style") {
    return "apology-style-report-v6-direct-feedback";
  }
  if (slug === "hurt-expression") {
    return "hurt-expression-report-v6-direct-feedback";
  }
  if (slug === "recharge-routine") {
    return "recharge-routine-report-v3-direct-feedback";
  }
  if (slug === "focus-switch") {
    return "focus-switch-report-v4-direct-feedback";
  }
  if (slug === "organizing-style") {
    return "organizing-style-report-v3-four-dimension-feedback";
  }
  return freeTopicReportContentVersion;
}

export function getFreeTopicEvidenceVersion(slug: string) {
  if (slug === "comfort-style") return "comfort-style-evidence-v1-10-sources";
  if (slug === "apology-style") return "apology-style-evidence-v1-6-sources";
  if (slug === "hurt-expression") {
    return "hurt-expression-evidence-v1-6-sources";
  }
  if (slug === "recharge-routine") {
    return "recharge-routine-evidence-v1-8-sources-2026-07-29";
  }
  if (slug === "focus-switch") {
    return "focus-switch-evidence-v1-9-sources-2026-07-29";
  }
  if (slug === "organizing-style") {
    return "organizing-style-evidence-v2-batch-rhythm-2026-07-29";
  }
  return freeTopicEvidenceVersion;
}

export function isCurrentFreeTopicResultVersion({
  instrumentVersion,
  reportContentVersion,
  scoringVersion,
  slug,
}: {
  instrumentVersion: string;
  reportContentVersion: string;
  scoringVersion: string;
  slug: string;
}) {
  return (
    instrumentVersion === getFreeTopicInstrumentVersion(slug) &&
    reportContentVersion === getFreeTopicReportContentVersion(slug) &&
    scoringVersion === getFreeTopicScoringVersion(slug)
  );
}
