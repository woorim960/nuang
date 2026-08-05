import { isTopicAssessmentPublished } from "@/features/assessment/assessment-catalog";
import {
  buildFreeTopicResultReport,
  getFreeTopicAssessment,
  type FreeTopicLongReportSection,
} from "@/features/assessment/free-topic-assessments";
import { buildFreeTopicNuangCodeSection } from "@/features/assessment/free-topic-long-report";
import { getLabAssessment } from "@/features/lab/lab-assessments";
import { getCustomerApprovedTraitMapGuide } from "@/features/nuang-code/trait-map-customer-guide-registry";
import {
  reportShareContentSchema,
  type ReportShareContent,
  type ReportShareSection,
} from "@/features/share/report-share-contract";

/**
 * 서명된 공유 링크에는 짧은 결과 식별 정보만 보관하고, 고객 화면에서는
 * 현재 베타 검수 게이트를 통과한 원고로 상세 리포트를 다시 조립합니다.
 * 답변 원문, 문항별 응답, 계정 식별자는 공유 링크에 넣지 않습니다.
 */
export function resolveRichReportShareContent(
  content: ReportShareContent,
): ReportShareContent {
  const sections = content.source
    ? buildSectionsFromApprovedSource(content.source)
    : [];

  if (sections.length === 0) return content;

  return reportShareContentSchema.parse({
    ...content,
    sections,
  });
}

function buildSectionsFromApprovedSource(
  source: NonNullable<ReportShareContent["source"]>,
) {
  if (source.kind === "topic") return buildTopicSections(source);
  if (source.kind === "lab") return buildLabSections(source);
  return buildCoreSections(source.code);
}

function buildTopicSections(
  source: Extract<
    NonNullable<ReportShareContent["source"]>,
    { kind: "topic" }
  >,
) {
  if (!isTopicAssessmentPublished(source.assessmentSlug)) return [];
  const assessment = getFreeTopicAssessment(source.assessmentSlug);
  if (!assessment) return [];

  const report = buildFreeTopicResultReport({
    assessment,
    result: {
      observations: [],
      scoresByScaleId: source.scoresByScaleId,
      scoresByTargetId: {},
    },
  });
  const sections: ReportShareSection[] = [];

  if (report.personalizedSummary) {
    sections.push({
      description: report.personalizedSummary.body,
      id: "topic-summary",
      items: report.personalizedSummary.steps.map((step) => ({
        label: step.label,
        text: step.text,
      })),
      title: report.personalizedSummary.title,
    });
  }

  if (report.signals.length > 0) {
    sections.push({
      description: report.confidenceCopy,
      id: "topic-signals",
      items: report.signals.map((signal) => ({
        label: `${signal.areaLabel} · ${signal.levelLabel}`,
        text: signal.interpretation,
        value: `${signal.score}점`,
      })),
      title: "내 답에서 보인 세부 모습",
    });
  }

  sections.push(
    ...report.longReportSections.map((section, index) =>
      convertTopicSection(section, index),
    ),
  );

  const nuangCodeSection = source.code
    ? buildFreeTopicNuangCodeSection({
        assessment,
        code: source.code,
        scoresByScaleId: source.scoresByScaleId,
      })
    : null;
  if (nuangCodeSection) {
    sections.push(convertTopicSection(nuangCodeSection, sections.length));
  }

  return uniqueSections(sections).slice(0, 20);
}

function convertTopicSection(
  section: FreeTopicLongReportSection,
  index: number,
): ReportShareSection {
  return {
    description: section.body,
    id: `topic-detail-${index + 1}`,
    items: (section.blocks ?? [])
      .flatMap((block) => {
        if (block.kind === "paragraph") return [{ text: block.text }];
        if (block.kind === "ordered_list") {
          return block.items.map((text, itemIndex) => ({
            label: `${itemIndex + 1}`,
            text,
          }));
        }
        return block.items.map((item) => ({
          label: item.label,
          text: item.text,
        }));
      })
      .slice(0, 48),
    title: section.title,
  };
}

function buildLabSections(
  source: Extract<
    NonNullable<ReportShareContent["source"]>,
    { kind: "lab" }
  >,
) {
  const assessment = getLabAssessment(source.assessmentSlug);
  const profile = assessment?.profiles.find(
    (candidate) => candidate.id === source.profileId,
  );
  if (!assessment || !profile) return [];

  const total = Math.max(
    1,
    Object.values(source.scores).reduce((sum, score) => sum + score, 0),
  );

  return [
    {
      description: profile.summary,
      id: "lab-distribution",
      items: assessment.profiles.map((candidate) => ({
        label: candidate.shortTitle,
        text:
          candidate.id === profile.id
            ? "이번 답에서 가장 가까운 생활 방식이에요."
            : "상황에 따라 함께 나타날 수 있는 생활 방식이에요.",
        value: `${Math.round(((source.scores[candidate.id] ?? 0) / total) * 100)}%`,
      })),
      title: "내 선택 분포",
    },
    {
      id: "lab-strengths",
      items: profile.strengths.map((text) => ({ text })),
      title: "잘 활용되는 모습",
    },
    {
      id: "lab-relationships",
      items: [
        { label: "오해가 생기기 쉬운 순간", text: profile.watch },
        { label: "상대에게 알려주면 좋은 말", text: profile.relationTip },
        { label: "오늘 해볼 작은 시도", text: profile.smallExperiment },
      ],
      title: "관계에서 편하게 맞추는 방법",
    },
    {
      description: `${assessment.questions.length}개 장면에서 고른 답을 정리한 생활 방식이에요. 뉴앙 코드에는 반영되지 않아요.`,
      id: "lab-reading-note",
      title: "이 결과를 읽는 방법",
    },
  ] satisfies ReportShareSection[];
}

function buildCoreSections(code: string) {
  const guide = getCustomerApprovedTraitMapGuide(code);
  if (!guide) return [];

  return guide.chapters.map(
    (chapter): ReportShareSection => ({
      description: chapter.summary,
      id: `core-${chapter.id}`,
      items: [
        ...chapter.sections.flatMap((section) =>
          section.paragraphs.map((text) => ({
            label: section.title,
            text,
          })),
        ),
        { label: "내 모습과 비교해 보기", text: chapter.checkQuestion },
        ...(chapter.references ?? []).map((reference) => ({
          label: reference.title,
          text: reference.description,
        })),
      ].slice(0, 48),
      title: `${String(chapter.number).padStart(2, "0")} · ${chapter.title}`,
    }),
  );
}

function uniqueSections(sections: readonly ReportShareSection[]) {
  const seen = new Set<string>();

  return sections.filter((section) => {
    const key = `${section.title}\u0000${section.description ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
