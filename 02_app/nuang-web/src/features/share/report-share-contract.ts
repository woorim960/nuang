import { z } from "zod";

const shareScoreRecordSchema = z
  .record(z.string().trim().min(1).max(80), z.number().finite().min(0).max(100))
  .superRefine((scores, context) => {
    if (Object.keys(scores).length > 12) {
      context.addIssue({
        code: "custom",
        message: "공유 결과에는 점수 항목을 12개까지만 담을 수 있어요.",
      });
    }
  });

export const reportShareSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    code: z.string().trim().min(2).max(12),
    kind: z.literal("core"),
  }),
  z.object({
    assessmentSlug: z.string().trim().min(2).max(80),
    code: z.string().trim().min(2).max(12).optional(),
    kind: z.literal("topic"),
    scoresByScaleId: shareScoreRecordSchema,
  }),
  z.object({
    assessmentSlug: z.string().trim().min(2).max(80),
    kind: z.literal("lab"),
    profileId: z.string().trim().min(1).max(80),
    scores: shareScoreRecordSchema,
  }),
]);

const reportShareSectionItemSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  text: z.string().trim().min(1).max(1_500),
  value: z.string().trim().min(1).max(40).optional(),
});

export const reportShareSectionSchema = z.object({
  description: z.string().trim().min(1).max(2_500).optional(),
  id: z.string().trim().min(1).max(100),
  items: z.array(reportShareSectionItemSchema).max(48).optional(),
  title: z.string().trim().min(1).max(120),
});

export const reportShareContentSchema = z.object({
  code: z.string().trim().min(2).max(12).optional(),
  contentVersion: z.enum(["report-share-v1", "report-share-v2"]),
  highlights: z.array(z.string().trim().min(1).max(120)).min(1).max(3),
  reportType: z.enum(["core", "lab", "topic"]),
  resultName: z.string().trim().min(1).max(100),
  sections: z.array(reportShareSectionSchema).max(20).optional(),
  source: reportShareSourceSchema.optional(),
  summary: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(100),
}).superRefine((content, context) => {
  if (content.source && content.source.kind !== content.reportType) {
    context.addIssue({
      code: "custom",
      message: "공유 원본과 결과 유형이 일치해야 해요.",
      path: ["source"],
    });
  }
});

export const createOriginalReportShareLinkRequestSchema = z.object({
  reportKey: z.string().regex(/^(core|topic|lab)_[0-9a-f-]{36}$/i),
});

export type ReportShareContent = z.infer<typeof reportShareContentSchema>;
export type ReportShareSection = z.infer<typeof reportShareSectionSchema>;
export type ReportShareSource = z.infer<typeof reportShareSourceSchema>;

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
    contentVersion: "report-share-v2",
    highlights: [...highlights],
    reportType: "core",
    resultName: profileName,
    source: { code, kind: "core" },
    summary,
    title: resultLabel,
  });
}

export function buildTopicReportShareContent({
  assessmentTitle,
  assessmentSlug,
  code,
  highlights,
  resultName,
  scoresByScaleId,
  summary,
}: {
  assessmentTitle: string;
  assessmentSlug?: string;
  code?: string | null;
  highlights: readonly string[];
  resultName: string;
  scoresByScaleId?: Readonly<Record<string, number>>;
  summary: string;
}): ReportShareContent {
  return normalizeReportShareContent({
    contentVersion: "report-share-v2",
    highlights: [...highlights],
    reportType: "topic",
    resultName,
    source:
      assessmentSlug && scoresByScaleId
        ? {
            assessmentSlug,
            ...(code ? { code } : {}),
            kind: "topic",
            scoresByScaleId: { ...scoresByScaleId },
          }
        : undefined,
    summary,
    title: `${assessmentTitle} 결과`,
  });
}

export function buildLabReportShareContent({
  assessmentTitle,
  assessmentSlug,
  highlights,
  profileId,
  resultName,
  scores,
  summary,
}: {
  assessmentTitle: string;
  assessmentSlug?: string;
  highlights: readonly string[];
  profileId?: string;
  resultName: string;
  scores?: Readonly<Record<string, number>>;
  summary: string;
}): ReportShareContent {
  return normalizeReportShareContent({
    contentVersion: "report-share-v2",
    highlights: [...highlights],
    reportType: "lab",
    resultName,
    source:
      assessmentSlug && profileId && scores
        ? {
            assessmentSlug,
            kind: "lab",
            profileId,
            scores: { ...scores },
          }
        : undefined,
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
