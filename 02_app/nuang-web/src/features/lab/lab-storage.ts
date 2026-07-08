"use client";

import { localCompletedRetentionDays } from "@/features/account/local-retention-policy";
import type { LabAnswer, LabScoreResult } from "@/features/lab/lab-assessments";

export type StoredLabResult = {
  answers: Record<string, LabAnswer>;
  completedAt: string;
  contentVersion?: string;
  expiresAt?: string;
  result: LabScoreResult;
  slug: string;
};

const RESULT_PREFIX = "nuang-lab-result:";

export function saveLabResult(result: StoredLabResult) {
  const completedAt = new Date(result.completedAt);
  const expiresAt =
    result.expiresAt ??
    addDays(
      Number.isNaN(completedAt.getTime()) ? new Date() : completedAt,
      localCompletedRetentionDays,
    )
      .toISOString();

  localStorage.setItem(
    `${RESULT_PREFIX}${result.slug}`,
    JSON.stringify({ ...result, expiresAt }),
  );
}

export function loadLabResult(slug: string) {
  const raw = localStorage.getItem(`${RESULT_PREFIX}${slug}`);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredLabResult;
  } catch {
    return null;
  }
}

export function listLabResults(slugs: string[]) {
  const now = Date.now();
  return slugs
    .map((slug) => loadLabResult(slug))
    .filter((result): result is StoredLabResult => Boolean(result))
    .filter((result) => new Date(getLabExpiresAt(result)).getTime() > now)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function deleteLabResult(slug: string) {
  localStorage.removeItem(`${RESULT_PREFIX}${slug}`);
}

export function getLabExpiresAt(result: StoredLabResult) {
  if (result.expiresAt) return result.expiresAt;

  const completedAt = new Date(result.completedAt);
  return addDays(
    Number.isNaN(completedAt.getTime()) ? new Date() : completedAt,
    localCompletedRetentionDays,
  ).toISOString();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
