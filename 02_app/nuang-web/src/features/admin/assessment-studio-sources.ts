import {
  topicAssessmentCatalog,
  type AssessmentPublicationStatus,
} from "@/features/assessment/assessment-catalog";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import {
  freeTopicAssessments,
  getFreeTopicQuestions,
} from "@/features/assessment/free-topic-assessments";
import { defaultFriendTraitMatchContent } from "@/features/assessment/friend-trait-match-content";
import { labAssessments } from "@/features/lab/lab-assessments";
import { PUBLIC_BALANCE_PACKS } from "@/features/together-balance/content";

import type {
  AssessmentStudioDocument,
  AssessmentStudioEntry,
  AssessmentStudioStatus,
} from "./assessment-studio-contract";
import { validateAssessmentStudioDocument } from "./assessment-studio-validation";

type BuiltinEntryInput = Pick<
  AssessmentStudioEntry,
  | "category"
  | "displayOrder"
  | "itemCount"
  | "resultCount"
  | "slug"
  | "status"
  | "subtype"
> & {
  document: AssessmentStudioDocument;
};

function toStudioStatus(
  status: AssessmentPublicationStatus | undefined,
): AssessmentStudioStatus {
  if (status === "published") return "published";
  if (status === "paused") return "paused";
  return "draft";
}

function makeBuiltinEntry(input: BuiltinEntryInput): AssessmentStudioEntry {
  return {
    archivedAt: null,
    category: input.category,
    displayOrder: input.displayOrder,
    document: input.document,
    hasUnpublishedChanges: false,
    id: null,
    itemCount: input.itemCount,
    publishedAt: input.status === "published" ? "builtin" : null,
    publishedReleaseId: null,
    publishedReleaseKey: input.status === "published" ? "builtin" : null,
    releases: [],
    resultCount: input.resultCount,
    slug: input.slug,
    sourceKey: `${input.category}:${input.slug}`,
    sourceOrigin: "builtin",
    status: input.status,
    subtype: input.subtype,
    summary: input.document.description,
    title: input.document.title,
    updatedAt: null,
    validationIssues: validateAssessmentStudioDocument(input.document),
    workingRevision: 1,
  };
}

function coreDocument(
  definition:
    | typeof candidateQuickCoreAssessment
    | typeof candidateFullCoreAssessment,
): AssessmentStudioDocument {
  const quick = definition.mode === "quick";

  return {
    ageAccessPolicy: "all_ages",
    caption: quick
      ? "약 3분 만에 내 성향의 큰 방향을 확인해요."
      : "다섯 가지 성향을 더 자세하게 살펴봐요.",
    category: "core",
    description: quick
      ? "뉴앙의 다섯 가지 성향 코드를 빠르게 확인하는 핵심 검사예요."
      : "빠른 검사보다 더 많은 장면을 바탕으로 다섯 가지 성향을 세밀하게 확인해요.",
    estimatedMinutes: definition.estimatedMinutes,
    payload: {
      definition,
      engineBinding: {
        key: quick ? "core_quick_v1" : "core_precision_v1",
        locked: true,
      },
    },
    schemaVersion: 1,
    sensitivity: "general",
    slug: quick ? "quick-core" : "full-core",
    subtype: quick ? "core_quick" : "core_precision",
    title: definition.title,
  };
}

export function getBuiltinAssessmentStudioEntries(): AssessmentStudioEntry[] {
  let displayOrder = 0;
  const entries: AssessmentStudioEntry[] = [];

  for (const definition of [
    candidateQuickCoreAssessment,
    candidateFullCoreAssessment,
  ]) {
    const document = coreDocument(definition);
    entries.push(
      makeBuiltinEntry({
        category: "core",
        displayOrder: displayOrder++,
        document,
        itemCount:
          definition.items.length + (definition.adaptiveItems?.length ?? 0),
        resultCount: 32,
        slug: document.slug,
        status: "published",
        subtype: document.subtype,
      }),
    );
  }

  for (const assessment of freeTopicAssessments) {
    const catalog = topicAssessmentCatalog.find(
      (candidate) => candidate.id === `topic:${assessment.slug}`,
    );
    const questions = getFreeTopicQuestions(assessment.slug);
    const document: AssessmentStudioDocument = {
      ageAccessPolicy: catalog?.ageAccessPolicy ?? "all_ages",
      caption: assessment.caption,
      category: "topic",
      description: `${assessment.categoryLabel}에서 드러나는 나의 반응과 선택을 구체적으로 살펴봐요.`,
      estimatedMinutes: assessment.estimatedMinutes,
      payload: { assessment, questions },
      schemaVersion: 1,
      sensitivity: catalog?.sensitivity ?? "general",
      slug: assessment.slug,
      subtype: "free_topic",
      title: assessment.title,
    };
    entries.push(
      makeBuiltinEntry({
        category: "topic",
        displayOrder: displayOrder++,
        document,
        itemCount: questions.length,
        resultCount: assessment.reportScales?.length ?? assessment.mappings.length,
        slug: assessment.slug,
        status: toStudioStatus(catalog?.publicationStatus),
        subtype: "free_topic",
      }),
    );
  }

  for (const assessment of labAssessments) {
    const document: AssessmentStudioDocument = {
      ageAccessPolicy: assessment.ageAccessPolicy,
      caption: assessment.caption,
      category: "lab",
      description: assessment.safetyNote,
      estimatedMinutes: assessment.estimatedMinutes,
      payload: { assessment },
      schemaVersion: 1,
      sensitivity: assessment.sensitivity === "S2" ? "caution" : "general",
      slug: assessment.slug,
      subtype: "odd_lab",
      title: assessment.cardTitle,
    };
    entries.push(
      makeBuiltinEntry({
        category: "lab",
        displayOrder: displayOrder++,
        document,
        itemCount: assessment.questions.length,
        resultCount: assessment.profiles.length,
        slug: assessment.slug,
        status: "published",
        subtype: "odd_lab",
      }),
    );
  }

  for (const pack of PUBLIC_BALANCE_PACKS) {
    const document: AssessmentStudioDocument = {
      ageAccessPolicy: "all_ages",
      caption: pack.description,
      category: "together",
      description: pack.description,
      estimatedMinutes: 3,
      payload: { pack },
      schemaVersion: 1,
      sensitivity: pack.questions.some(
        (question) => question.sensitivity !== "general",
      )
        ? "caution"
        : "general",
      slug: pack.slug,
      subtype: "balance_pack",
      title: pack.title,
    };
    entries.push(
      makeBuiltinEntry({
        category: "together",
        displayOrder: displayOrder++,
        document,
        itemCount: pack.questions.length,
        resultCount: 1,
        slug: pack.slug,
        status: "published",
        subtype: "balance_pack",
      }),
    );
  }

  const friend = defaultFriendTraitMatchContent;
  const friendDocument: AssessmentStudioDocument = {
    ageAccessPolicy: "all_ages",
    caption: friend.description,
    category: "together",
    description: friend.description,
    estimatedMinutes: 2,
    payload: { config: friend },
    schemaVersion: 1,
    sensitivity: "general",
    slug: "friend-match",
    subtype: "friend_match",
    title: friend.title,
  };
  entries.push(
    makeBuiltinEntry({
      category: "together",
      displayOrder: displayOrder++,
      document: friendDocument,
      itemCount: 1,
      resultCount: 4,
      slug: friendDocument.slug,
      status: "published",
      subtype: "friend_match",
    }),
  );

  return entries;
}
