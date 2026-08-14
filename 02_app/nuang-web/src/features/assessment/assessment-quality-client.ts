"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { AssessmentQualityObservationInput } from "./assessment-quality-observation";

type AssessmentQualityObservation =
  AssessmentQualityObservationInput["observations"][number];

type QueuedAssessmentQualitySubmission = AssessmentQualityObservationInput & {
  ownerSupabaseUserId: string;
  queuedAt: string;
};

const queueStorageKey = "nuang:assessment-quality-queue:v1";
const sessionStorageKey = "nuang:assessment-quality-session:v1";
const maxQueuedSubmissions = 20;

export function enqueueAssessmentQualityObservations({
  assessmentSlug,
  instrumentVersion,
  localResultId,
  observations,
  productReleaseId,
}: {
  assessmentSlug: string;
  instrumentVersion: string;
  localResultId?: string;
  observations: AssessmentQualityObservation[];
  productReleaseId?: string;
}) {
  if (typeof window === "undefined" || observations.length === 0) return;
  void enqueueForCurrentUser({
    assessmentSlug,
    instrumentVersion,
    localResultId,
    observations,
    productReleaseId,
  });
}

async function enqueueForCurrentUser({
  assessmentSlug,
  instrumentVersion,
  localResultId,
  observations,
  productReleaseId,
}: {
  assessmentSlug: string;
  instrumentVersion: string;
  localResultId?: string;
  observations: AssessmentQualityObservation[];
  productReleaseId?: string;
}) {
  const localStorage = getUsableStorage("localStorage");
  const sessionStorage = getUsableStorage("sessionStorage");
  if (!localStorage || !sessionStorage) return;

  const supabase = createBrowserSupabaseClient();
  const session = supabase ? await supabase.auth.getSession() : null;
  const ownerSupabaseUserId = session?.data.session?.user?.id;
  if (!ownerSupabaseUserId) {
    // 비회원 관찰값과 이전 버전의 소유자 없는 큐는 이후 계정에 귀속하지 않습니다.
    writeQueue(localStorage, []);
    return;
  }

  const submission: QueuedAssessmentQualitySubmission = {
    assessmentSlug,
    clientSessionId: readOrCreateSessionId(sessionStorage),
    instrumentVersion,
    ...(localResultId ? { localResultId } : {}),
    ...(productReleaseId ? { productReleaseId } : {}),
    observations,
    ownerSupabaseUserId,
    queuedAt: new Date().toISOString(),
    submissionId: crypto.randomUUID(),
  };
  writeQueue(localStorage, [submission, ...readQueue(localStorage)]);
  await flushAssessmentQualityObservationQueue();
}

export async function flushAssessmentQualityObservationQueue() {
  if (
    typeof window === "undefined" ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  ) {
    return;
  }

  const localStorage = getUsableStorage("localStorage");
  if (!localStorage) return;
  const pending = readQueue(localStorage);
  if (pending.length === 0) {
    writeQueue(localStorage, []);
    return;
  }

  const supabase = createBrowserSupabaseClient();
  const session = supabase ? await supabase.auth.getSession() : null;
  const currentSupabaseUserId = session?.data.session?.user?.id;
  if (!currentSupabaseUserId) {
    // 비회원 행동은 로그인 뒤 소급 전송하지 않습니다.
    writeQueue(localStorage, []);
    return;
  }

  const remaining: QueuedAssessmentQualitySubmission[] = [];

  for (const submission of pending.filter(
    (item) => item.ownerSupabaseUserId === currentSupabaseUserId,
  )) {
    try {
      const payload = toObservationInput(submission);
      const response = await fetch("/api/assessment-quality-observations", {
        body: JSON.stringify(payload),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-nuang-auth-user-id": submission.ownerSupabaseUserId,
        },
        method: "POST",
      });

      if (
        !response.ok &&
        response.status !== 401 &&
        response.status !== 403 &&
        response.status !== 409
      ) {
        remaining.push(submission);
      }
    } catch {
      remaining.push(submission);
    }
  }

  writeQueue(localStorage, remaining);
}

function toObservationInput({
  assessmentSlug,
  clientSessionId,
  instrumentVersion,
  localResultId,
  observations,
  productReleaseId,
  submissionId,
}: QueuedAssessmentQualitySubmission): AssessmentQualityObservationInput {
  return {
    assessmentSlug,
    clientSessionId,
    instrumentVersion,
    ...(localResultId ? { localResultId } : {}),
    ...(productReleaseId ? { productReleaseId } : {}),
    observations,
    submissionId,
  };
}

export function bucketAssessmentDwell(milliseconds: number) {
  if (milliseconds < 3_000) return "under_3s" as const;
  if (milliseconds < 10_000) return "3_to_10s" as const;
  if (milliseconds < 30_000) return "10_to_30s" as const;
  return "over_30s" as const;
}

export function bucketAssessmentRevisions(count: number) {
  if (count <= 0) return "none" as const;
  if (count === 1) return "once" as const;
  return "multiple" as const;
}

function readOrCreateSessionId(sessionStorage: Storage) {
  const existing = sessionStorage.getItem(sessionStorageKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(sessionStorageKey, created);
  return created;
}

function readQueue(localStorage: Storage) {
  const raw = localStorage.getItem(queueStorageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            typeof item.submissionId === "string" &&
            typeof item.ownerSupabaseUserId === "string",
        ) as QueuedAssessmentQualitySubmission[])
      : [];
  } catch {
    return [];
  }
}

function writeQueue(
  localStorage: Storage,
  submissions: QueuedAssessmentQualitySubmission[],
) {
  if (submissions.length === 0) {
    localStorage.removeItem(queueStorageKey);
    return;
  }

  localStorage.setItem(
    queueStorageKey,
    JSON.stringify(submissions.slice(0, maxQueuedSubmissions)),
  );
}

function getUsableStorage(kind: "localStorage" | "sessionStorage") {
  try {
    const storage = window[kind];
    return storage &&
      typeof storage.getItem === "function" &&
      typeof storage.setItem === "function" &&
      typeof storage.removeItem === "function"
      ? storage
      : null;
  } catch {
    return null;
  }
}
