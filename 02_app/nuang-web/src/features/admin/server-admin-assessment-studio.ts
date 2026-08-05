import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assessmentStudioDocumentSchema,
  assessmentStudioStatuses,
  assessmentStudioSubtypes,
  type AssessmentStudioDashboard,
  type AssessmentStudioEntry,
  type AssessmentStudioRelease,
  type AssessmentStudioStatus,
  type AssessmentStudioSubtype,
} from "./assessment-studio-contract";
import { getBuiltinAssessmentStudioEntries } from "./assessment-studio-sources";
import { validateAssessmentStudioDocument } from "./assessment-studio-validation";

type Row = Record<string, unknown>;

export async function readAdminAssessmentStudioDashboard(
  client: SupabaseClient,
): Promise<AssessmentStudioDashboard> {
  const builtinEntries = getBuiltinAssessmentStudioEntries();
  const [entryResult, releaseResult] = await Promise.all([
    client
      .from("assessment_content_entry")
      .select(
        "id,category,subtype,slug,title,summary,status,source_origin,document,working_revision,published_release_id,has_unpublished_changes,display_order,updated_at,published_at,archived_at,deleted_at",
      )
      .order("display_order", { ascending: true })
      .order("updated_at", { ascending: false }),
    client
      .from("assessment_content_release")
      .select(
        "id,entry_id,release_number,release_key,content_hash,change_note,published_at,retired_at",
      )
      .order("release_number", { ascending: false }),
  ]);

  if (entryResult.error || releaseResult.error) {
    return dashboard(builtinEntries, false);
  }

  const releasesByEntry = new Map<string, AssessmentStudioRelease[]>();
  for (const raw of (releaseResult.data ?? []) as Row[]) {
    const entryId = text(raw.entry_id);
    const release = normalizeRelease(raw);
    if (!entryId || !release) continue;
    releasesByEntry.set(entryId, [
      ...(releasesByEntry.get(entryId) ?? []),
      release,
    ]);
  }

  const managed = ((entryResult.data ?? []) as Row[]).flatMap((row) => {
    const entry = normalizeEntry(row, releasesByEntry);
    return entry ? [entry] : [];
  });
  const managedBySourceKey = new Map(
    managed.map((entry) => [entry.sourceKey, entry]),
  );
  const entries = [
    ...builtinEntries.map(
      (entry) => managedBySourceKey.get(entry.sourceKey) ?? entry,
    ),
    ...managed.filter(
      (entry) => !builtinEntries.some((item) => item.sourceKey === entry.sourceKey),
    ),
  ].sort(
    (left, right) =>
      left.displayOrder - right.displayOrder ||
      left.title.localeCompare(right.title, "ko-KR"),
  );

  return dashboard(entries, true);
}

function normalizeEntry(
  row: Row,
  releasesByEntry: Map<string, AssessmentStudioRelease[]>,
): AssessmentStudioEntry | null {
  const id = text(row.id);
  const category = text(row.category);
  const subtype = text(row.subtype);
  const slug = text(row.slug);
  const status = text(row.status);
  const sourceOrigin = text(row.source_origin);
  const parsedDocument = assessmentStudioDocumentSchema.safeParse(row.document);
  if (
    !id ||
    !category ||
    !["core", "topic", "lab", "together"].includes(category) ||
    !subtype ||
    !assessmentStudioSubtypes.includes(subtype as AssessmentStudioSubtype) ||
    !slug ||
    !status ||
    !assessmentStudioStatuses.includes(status as AssessmentStudioStatus) ||
    (sourceOrigin !== "builtin" && sourceOrigin !== "operator") ||
    !parsedDocument.success
  ) {
    return null;
  }

  const document = parsedDocument.data;
  const metrics = documentMetrics(document);
  const releases = releasesByEntry.get(id) ?? [];
  const publishedReleaseId = text(row.published_release_id);

  return {
    archivedAt: text(row.archived_at),
    category: document.category,
    displayOrder: integer(row.display_order, 1000),
    document,
    hasUnpublishedChanges: row.has_unpublished_changes === true,
    id,
    itemCount: metrics.itemCount,
    publishedAt: text(row.published_at),
    publishedReleaseId,
    publishedReleaseKey:
      releases.find((release) => release.id === publishedReleaseId)?.releaseKey ??
      null,
    releases,
    resultCount: metrics.resultCount,
    slug,
    sourceKey: `${category}:${slug}`,
    sourceOrigin,
    status: status as AssessmentStudioStatus,
    subtype: subtype as AssessmentStudioSubtype,
    summary: text(row.summary) ?? document.description,
    title: text(row.title) ?? document.title,
    updatedAt: text(row.updated_at),
    validationIssues: validateAssessmentStudioDocument(document),
    workingRevision: integer(row.working_revision, 1),
  };
}

function normalizeRelease(row: Row): AssessmentStudioRelease | null {
  const id = text(row.id);
  const releaseKey = text(row.release_key);
  const contentHash = text(row.content_hash);
  const changeNote = text(row.change_note);
  const publishedAt = text(row.published_at);
  if (!id || !releaseKey || !contentHash || !changeNote || !publishedAt) {
    return null;
  }
  return {
    changeNote,
    contentHash,
    id,
    publishedAt,
    releaseKey,
    releaseNumber: integer(row.release_number, 1),
    retiredAt: text(row.retired_at),
  };
}

export function documentMetrics(document: AssessmentStudioEntry["document"]) {
  const payload = document.payload as Record<string, unknown>;
  if (document.category === "core") {
    const definition = object(payload.definition);
    return {
      itemCount:
        array(definition.items).length + array(definition.adaptiveItems).length,
      resultCount: 32,
    };
  }
  if (document.subtype === "free_topic") {
    const assessment = object(payload.assessment);
    return {
      itemCount: array(payload.questions).length,
      resultCount: Math.max(
        array(assessment.reportScales).length,
        array(assessment.mappings).length,
      ),
    };
  }
  if (document.subtype === "odd_lab") {
    const assessment = object(payload.assessment);
    return {
      itemCount: array(assessment.questions).length,
      resultCount: array(assessment.profiles).length,
    };
  }
  if (document.subtype === "balance_pack") {
    return {
      itemCount: array(object(payload.pack).questions).length,
      resultCount: 1,
    };
  }
  return { itemCount: 1, resultCount: 4 };
}

function dashboard(
  entries: AssessmentStudioEntry[],
  databaseAvailable: boolean,
): AssessmentStudioDashboard {
  return {
    counts: {
      archived: entries.filter((entry) => entry.status === "archived").length,
      blocked: entries.filter((entry) =>
        entry.validationIssues.some((issue) => issue.severity === "blocker"),
      ).length,
      inReview: entries.filter((entry) => entry.status === "in_review").length,
      paused: entries.filter((entry) => entry.status === "paused").length,
      published: entries.filter((entry) => entry.status === "published").length,
      total: entries.length,
    },
    databaseAvailable,
    entries,
    generatedAt: new Date().toISOString(),
  };
}

function text(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function integer(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
