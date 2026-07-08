"use client";

import { openDB, type DBSchema } from "idb";
import type {
  AssessmentAnswer,
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import {
  localCompletedRetentionDays,
  localInProgressRetentionDays,
} from "@/features/account/local-retention-policy";

const DB_NAME = "nuang-local";
const DB_VERSION = 1;
const ATTEMPT_STORE = "assessmentAttempts";

interface NuangLocalDb extends DBSchema {
  assessmentAttempts: {
    key: string;
    value: LocalAssessmentAttempt;
    indexes: {
      "by-assessment-state": [string, string];
    };
  };
}

function getDb() {
  return openDB<NuangLocalDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(ATTEMPT_STORE, { keyPath: "id" });
      store.createIndex("by-assessment-state", ["assessmentId", "state"]);
    },
  });
}

export async function getOrCreateLocalAttempt(
  assessment: AssessmentDefinition,
  initialResponses: Record<string, AssessmentAnswer> = {},
) {
  const db = await getDb();
  const existing = await db.getAllFromIndex(ATTEMPT_STORE, "by-assessment-state", [
    assessment.assessmentId,
    "in_progress",
  ]);
  const active = existing
    .filter((attempt) => new Date(attempt.expiresAt).getTime() > Date.now())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (active) return active;

  const now = new Date();
  const allowedItemIds = new Set(assessment.items.map((item) => item.itemId));
  const reusableResponses = Object.fromEntries(
    Object.entries(initialResponses).filter(([itemId]) => allowedItemIds.has(itemId)),
  );
  const currentIndex = assessment.items.findIndex(
    (item) => !reusableResponses[item.itemId],
  );
  const attempt: LocalAssessmentAttempt = {
    id: `local_${crypto.randomUUID()}`,
    assessmentId: assessment.assessmentId,
    releaseId: assessment.releaseId,
    mode: assessment.mode,
    itemIds: assessment.items.map((item) => item.itemId),
    responses: reusableResponses,
    currentIndex: currentIndex === -1 ? assessment.items.length - 1 : currentIndex,
    state: "in_progress",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: addDays(now, localInProgressRetentionDays).toISOString(),
  };

  await db.put(ATTEMPT_STORE, attempt);
  return attempt;
}

export async function saveLocalAnswer(
  attempt: LocalAssessmentAttempt,
  answer: AssessmentAnswer,
  currentIndex: number,
) {
  const db = await getDb();
  const updatedAt = new Date();
  const nextAttempt: LocalAssessmentAttempt = {
    ...attempt,
    currentIndex,
    responses: {
      ...attempt.responses,
      [answer.itemId]: answer,
    },
    updatedAt: updatedAt.toISOString(),
    expiresAt: addDays(updatedAt, localInProgressRetentionDays).toISOString(),
  };

  await db.put(ATTEMPT_STORE, nextAttempt);
  return nextAttempt;
}

export async function saveLocalProgress(
  attempt: LocalAssessmentAttempt,
  currentIndex: number,
) {
  const db = await getDb();
  const now = new Date();
  const nextAttempt: LocalAssessmentAttempt = {
    ...attempt,
    currentIndex,
    updatedAt: now.toISOString(),
    expiresAt: addDays(now, localInProgressRetentionDays).toISOString(),
  };

  await db.put(ATTEMPT_STORE, nextAttempt);
  return nextAttempt;
}

export async function completeLocalAttempt(
  attempt: LocalAssessmentAttempt,
  resultCopyVersion?: string,
) {
  const db = await getDb();
  const now = new Date();
  const completed: LocalAssessmentAttempt = {
    ...attempt,
    state: "completed",
    resultCopyVersion,
    updatedAt: now.toISOString(),
    completedAt: now.toISOString(),
    expiresAt: addDays(now, localCompletedRetentionDays).toISOString(),
  };

  await db.put(ATTEMPT_STORE, completed);
  return completed;
}

export async function getLocalAttempt(id: string) {
  const db = await getDb();
  return db.get(ATTEMPT_STORE, id);
}

export async function listLocalAttempts() {
  const db = await getDb();
  const attempts = await db.getAll(ATTEMPT_STORE);
  const now = Date.now();

  return attempts
    .filter((attempt) => new Date(attempt.expiresAt).getTime() > now)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteLocalAttempt(id: string) {
  const db = await getDb();
  await db.delete(ATTEMPT_STORE, id);
}

export async function getLatestCompletedAttempt(assessmentId: string) {
  const db = await getDb();
  const completed = await db.getAllFromIndex(ATTEMPT_STORE, "by-assessment-state", [
    assessmentId,
    "completed",
  ]);

  return completed
    .filter((attempt) => new Date(attempt.expiresAt).getTime() > Date.now())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
