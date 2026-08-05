import { z } from "zod";

export const reportShareContentSchema = z.object({
  code: z.string().trim().min(2).max(12).optional(),
  contentVersion: z.literal("report-share-v1"),
  highlights: z.array(z.string().trim().min(1).max(120)).min(1).max(3),
  reportType: z.enum(["core", "lab", "topic"]),
  resultName: z.string().trim().min(1).max(100),
  summary: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(100),
});

export const createOriginalReportShareLinkRequestSchema = z.object({
  reportKey: z.string().regex(/^(core|topic|lab)_[0-9a-f-]{36}$/i),
});

export type ReportShareContent = z.infer<typeof reportShareContentSchema>;

export type ReportShareFeedAttachment = {
  id: string;
  type: "result_summary";
};

export const reportShareActions = [
  {
    id: "kakao_share",
    label: "카카오톡으로 보내기",
  },
  {
    id: "copy_link",
    label: "링크 복사",
  },
  {
    id: "native_share",
    label: "다른 앱으로 공유",
  },
  {
    id: "feed_share",
    label: "커뮤니티에 공유",
  },
] as const;

export function createReportShareText(content: ReportShareContent) {
  const codeLine = content.code ? `${content.code} · ` : "";
  const highlightLine = content.highlights.join(" · ");

  return [
    content.title,
    `${codeLine}${content.resultName}`,
    content.summary,
    highlightLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export function createReportShareFeedBody(content: ReportShareContent) {
  return `${createReportShareText(content)}\n\n뉴앙에서 내 결과를 확인해 보세요.`.slice(
    0,
    800,
  );
}

export function buildCoreReportShareContent({
  code,
  highlights,
  profileName,
  resultLabel,
  summary,
}: {
  code: string;
  highlights: readonly string[];
  profileName: string;
  resultLabel: string;
  summary: string;
}): ReportShareContent {
  return normalizeReportShareContent({
    code,
    contentVersion: "report-share-v1",
    highlights: [...highlights],
    reportType: "core",
    resultName: profileName,
    summary,
    title: resultLabel,
  });
}

export function buildTopicReportShareContent({
  assessmentTitle,
  highlights,
  resultName,
  summary,
}: {
  assessmentTitle: string;
  highlights: readonly string[];
  resultName: string;
  summary: string;
}): ReportShareContent {
  return normalizeReportShareContent({
    contentVersion: "report-share-v1",
    highlights: [...highlights],
    reportType: "topic",
    resultName,
    summary,
    title: `${assessmentTitle} 결과`,
  });
}

export function buildLabReportShareContent({
  assessmentTitle,
  highlights,
  resultName,
  summary,
}: {
  assessmentTitle: string;
  highlights: readonly string[];
  resultName: string;
  summary: string;
}): ReportShareContent {
  return normalizeReportShareContent({
    contentVersion: "report-share-v1",
    highlights: [...highlights],
    reportType: "lab",
    resultName,
    summary,
    title: `${assessmentTitle} 결과`,
  });
}

function normalizeReportShareContent(
  content: ReportShareContent,
): ReportShareContent {
  const normalized = {
    ...content,
    code: content.code?.trim() || undefined,
    highlights: uniqueNonEmpty(content.highlights).slice(0, 3),
    resultName: content.resultName.trim(),
    summary: content.summary.trim(),
    title: content.title.trim(),
  };

  if (normalized.highlights.length === 0) {
    normalized.highlights = ["나에게 자주 나타난 모습을 확인했어요."];
  }

  return reportShareContentSchema.parse(normalized);
}

function uniqueNonEmpty(values: readonly string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}
