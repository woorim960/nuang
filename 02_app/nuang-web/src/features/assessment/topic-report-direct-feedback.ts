import type {
  FreeTopicLongReportBlock,
  FreeTopicLongReportSection,
} from "@/features/assessment/free-topic-assessments";

export type DirectFeedbackAxis = {
  action: string;
  gap: string;
  gapLabel?: string;
  id: string;
  label: string;
  overuseRisk: string;
  score: number;
  strength: string;
};

export function buildDirectFeedbackSection({
  axes,
  balancedHigh,
  balancedHighRisk,
  balancedLow,
  balancedLowAction,
  balancedMiddle,
  balancedMiddleAction,
  claimId,
  title = "강점과 약점, 다음 개선점",
}: {
  axes: DirectFeedbackAxis[];
  balancedHigh: string;
  balancedHighRisk: string;
  balancedLow: string;
  balancedLowAction: string;
  balancedMiddle: string;
  balancedMiddleAction: string;
  claimId: string;
  title?: string;
}): FreeTopicLongReportSection | null {
  if (axes.length === 0) return null;

  const sorted = [...axes].sort((left, right) => right.score - left.score);
  const strongest = sorted[0];
  const weakest = sorted.at(-1) ?? strongest;
  const average = axes.reduce((sum, item) => sum + item.score, 0) / axes.length;
  const isBalanced = strongest.score - weakest.score <= 12;
  const items: Extract<
    FreeTopicLongReportBlock,
    { kind: "labeled_list" }
  >["items"] = isBalanced
    ? average >= 63
      ? [
          { label: "확인된 강점", text: balancedHigh },
          { label: "강점이 과해질 때", text: balancedHighRisk },
        ]
      : average < 38
        ? [
            { label: "지금 부족한 부분", text: balancedLow },
            { label: "우선 바꿀 행동", text: balancedLowAction },
          ]
        : [
            { label: "현재 패턴", text: balancedMiddle },
            { label: "다음 개선점", text: balancedMiddleAction },
          ]
    : [
        {
          label: `확인된 강점 · ${strongest.label}`,
          text: strongest.strength,
        },
        {
          label: `${weakest.gapLabel ?? "지금 약한 부분"} · ${weakest.label}`,
          text: weakest.gap,
        },
        {
          label: "강점을 과하게 쓰면",
          text: strongest.overuseRisk,
        },
        {
          label: "우선 바꿀 행동",
          text: weakest.action,
        },
      ];
  const body = items.map((item) => `${item.label}\n${item.text}`).join("\n\n");

  return {
    blocks: [{ items, kind: "labeled_list" }],
    body,
    claimIds: [claimId],
    title,
  };
}
