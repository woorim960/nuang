import "server-only";

import { unstable_cache } from "next/cache";
import {
  labAssessmentCatalog,
  topicAssessmentCatalog,
  togetherAssessmentCatalog,
  type AssessmentCatalogItem,
} from "@/features/assessment/assessment-catalog";
import { assessmentStudioDocumentSchema } from "@/features/admin/assessment-studio-contract";
import { canExposeAssessmentInBeta } from "@/features/assessment/assessment-age-access-policy";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type RuntimeAssessmentCatalog = {
  labs: AssessmentCatalogItem[];
  topics: AssessmentCatalogItem[];
  together: AssessmentCatalogItem[];
};

async function readRuntimeAssessmentCatalogUncached(): Promise<RuntimeAssessmentCatalog> {
  const fallback = {
    labs: labAssessmentCatalog,
    topics: topicAssessmentCatalog.filter(
      (item) => item.publicationStatus === "published",
    ),
    together: togetherAssessmentCatalog,
  };
  const client = createSupabaseServiceClient();
  if (!client) return fallback;
  const entries = await client
    .from("assessment_content_entry")
    .select(
      "category,subtype,slug,status,source_origin,published_release_id,deleted_at,display_order",
    )
    .in("subtype", ["free_topic", "odd_lab", "friend_match"])
    .order("display_order", { ascending: true });
  if (entries.error) return fallback;
  const releaseIds = (entries.data ?? []).flatMap((entry) =>
    typeof entry.published_release_id === "string"
      ? [entry.published_release_id]
      : [],
  );
  const releases = releaseIds.length
    ? await client
        .from("assessment_content_release")
        .select("id,document")
        .in("id", releaseIds)
    : { data: [], error: null };
  if (releases.error) return fallback;
  const documentByRelease = new Map(
    (releases.data ?? []).map((release) => [release.id, release.document]),
  );
  const topicMap = new Map(
    topicAssessmentCatalog.map((item) => [item.id, item]),
  );
  const labMap = new Map(labAssessmentCatalog.map((item) => [item.id, item]));
  const togetherMap = new Map(
    togetherAssessmentCatalog.map((item) => [item.id, item]),
  );

  for (const entry of entries.data ?? []) {
    const key =
      entry.subtype === "free_topic"
        ? `topic:${entry.slug}`
        : entry.subtype === "odd_lab"
          ? `lab:${entry.slug}`
          : `together:${entry.slug}`;
    const target =
      entry.subtype === "free_topic"
        ? topicMap
        : entry.subtype === "odd_lab"
          ? labMap
          : togetherMap;
    if (
      entry.status === "paused" ||
      entry.status === "archived" ||
      entry.deleted_at
    ) {
      target.delete(key);
      continue;
    }
    if (!entry.published_release_id) {
      if (entry.source_origin === "operator") target.delete(key);
      continue;
    }
    const parsed = assessmentStudioDocumentSchema.safeParse(
      documentByRelease.get(entry.published_release_id),
    );
    if (!parsed.success) continue;
    const document = parsed.data;
    const base = target.get(key);
    const item: AssessmentCatalogItem = base
      ? {
          ...base,
          ageAccessPolicy: document.ageAccessPolicy,
          caption: document.caption,
          estimatedMinutes: document.estimatedMinutes,
          publicationStatus: "published",
          questionCount:
            document.subtype === "free_topic"
              ? Array.isArray(document.payload.questions)
                ? document.payload.questions.length
                : base.questionCount
              : document.subtype === "odd_lab"
                ? Array.isArray(
                    (
                      document.payload.assessment as
                        { questions?: unknown[] } | undefined
                    )?.questions,
                  )
                  ? (document.payload.assessment as { questions: unknown[] })
                      .questions.length
                  : base.questionCount
                : base.questionCount,
          sensitivity: document.sensitivity,
          title: document.title,
        }
      : entry.subtype === "free_topic"
        ? {
            accent: "violet",
            ageAccessPolicy: document.ageAccessPolicy,
            caption: document.caption,
            estimatedMinutes: document.estimatedMinutes,
            href: `/assessments/topics/${document.slug}`,
            iconKey: "conversation",
            id: key,
            intendedUse: "self_reflection",
            kind: "topic",
            lifecycle: "released",
            privacyPolicy: "private",
            questionCount: Array.isArray(document.payload.questions)
              ? document.payload.questions.length
              : undefined,
            publicationStatus: "published",
            resultPolicy: "result_only",
            sensitivity: document.sensitivity,
            themes: ["self"],
            title: document.title,
          }
        : entry.subtype === "odd_lab"
          ? {
              accent: "sand",
              ageAccessPolicy: document.ageAccessPolicy,
              caption: document.caption,
              estimatedMinutes: document.estimatedMinutes,
              href: `/labs/${document.slug}`,
              iconKey: "battery",
              id: key,
              intendedUse: "play",
              kind: "playful",
              lifecycle: "released",
              privacyPolicy: "private",
              questionCount: Array.isArray(
                (
                  document.payload.assessment as
                    { questions?: unknown[] } | undefined
                )?.questions,
              )
                ? (document.payload.assessment as { questions: unknown[] })
                    .questions.length
                : undefined,
              publicationStatus: "published",
              resultPolicy: "play_only",
              sensitivity: document.sensitivity,
              themes: ["lab"],
              title: document.title,
            }
          : {
              accent: "teal",
              ageAccessPolicy: document.ageAccessPolicy,
              caption: document.caption,
              estimatedMinutes: document.estimatedMinutes,
              href: `/assessments/${document.slug}`,
              iconKey: "compare",
              id: key,
              intendedUse: "play",
              kind: "together",
              lifecycle: "released",
              privacyPolicy: "invite_only",
              questionCount: 1,
              publicationStatus: "published",
              resultPolicy: "invite_only",
              sensitivity: document.sensitivity,
              themes: ["together"],
              title: document.title,
            };
    target.set(key, item);
  }

  return {
    labs: [...labMap.values()].filter(
      (item) =>
        item.publicationStatus === "published" &&
        canExposeAssessmentInBeta(item.ageAccessPolicy),
    ),
    topics: [...topicMap.values()].filter(
      (item) =>
        item.publicationStatus === "published" &&
        canExposeAssessmentInBeta(item.ageAccessPolicy),
    ),
    together: [...togetherMap.values()].filter(
      (item) =>
        item.publicationStatus === "published" &&
        canExposeAssessmentInBeta(item.ageAccessPolicy),
    ),
  };
}

export const readRuntimeAssessmentCatalog = unstable_cache(
  readRuntimeAssessmentCatalogUncached,
  ["runtime-assessment-catalog-v1"],
  {
    revalidate: 60,
    tags: ["runtime-assessment-catalog"],
  },
);
