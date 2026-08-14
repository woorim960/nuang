import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";

const mocks = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn(),
  readAccountAssessmentProgress: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  saveAccountAssessmentProgress: vi.fn(),
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock("@/features/assessment/server-account-assessment-progress", () => ({
  readAccountAssessmentProgress: mocks.readAccountAssessmentProgress,
  saveAccountAssessmentProgress: mocks.saveAccountAssessmentProgress,
}));

import { GET, PUT } from "@/app/api/assessment-progress/route";
import { accountAssessmentProgressPutSchema } from "@/features/assessment/account-assessment-progress-contract";

const accountId = "11111111-1111-4111-8111-111111111111";
const authenticatedUser = { id: "auth-user-1" };

describe("account assessment progress migration", () => {
  const migration = readFileSync(
    "supabase/migrations/202608020002_core_assessment_progress_sync.sql",
    "utf8",
  ).toLowerCase();
  const completionGuard = readFileSync(
    "supabase/migrations/202608140004_core_assessment_progress_completion_guard.sql",
    "utf8",
  ).toLowerCase();

  it("keeps progress separate from canonical claimed results", () => {
    expect(migration).toContain(
      "create table if not exists assessment.account_assessment_progress",
    );
    expect(migration).toContain("unique (account_id, client_attempt_id)");
    expect(migration).toContain("revision bigint not null default 1");
  });

  it("keeps raw progress service-role-only behind RLS", () => {
    expect(migration).toContain(
      "alter table assessment.account_assessment_progress enable row level security",
    );
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain(
      "grant select on assessment.account_assessment_progress to authenticated",
    );
  });

  it("serializes writes and checks optimistic revisions", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("core_assessment_progress_revision_conflict");
    expect(migration).toContain("v_existing.attempt_payload = p_attempt");
  });

  it("prevents a completed snapshot from being rewritten or regressed", () => {
    expect(completionGuard).toContain("old.state = 'completed'");
    expect(completionGuard).toContain(
      "new.attempt_payload is distinct from old.attempt_payload",
    );
    expect(completionGuard).toContain("new.state is distinct from old.state");
    expect(completionGuard).toContain(
      "core_assessment_progress_revision_conflict",
    );
  });
});

describe("/api/assessment-progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: authenticatedUser,
    });
    mocks.createSupabaseServiceClient.mockReturnValue({ service: true });
  });

  it("returns a private, uncached account snapshot", async () => {
    const attempt = buildAttempt();
    mocks.readAccountAssessmentProgress.mockResolvedValue({
      accountId,
      attempts: [{ attempt, revision: 3 }],
      deletedLocalResultIds: [],
      ok: true,
    });

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    await expect(response.json()).resolves.toEqual({
      accountId,
      attempts: [{ attempt, revision: 3 }],
      authUserId: authenticatedUser.id,
      deletedLocalResultIds: [],
      ok: true,
    });
  });

  it("preserves the authentication boundary", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "unauthorized", ok: false },
        { status: 401 },
      ),
    });

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    expect(mocks.readAccountAssessmentProgress).not.toHaveBeenCalled();
  });

  it("stores a validated attempt with an optional optimistic revision", async () => {
    const attempt = buildAttempt();
    mocks.saveAccountAssessmentProgress.mockResolvedValue({
      accountId,
      attempt,
      ok: true,
      restored: false,
      revision: 4,
    });

    const response = await PUT(jsonRequest({ attempt, expectedRevision: 3 }));

    expect(response.status).toBe(200);
    expect(mocks.saveAccountAssessmentProgress).toHaveBeenCalledWith({
      attempt,
      client: { service: true },
      expectedRevision: 3,
      user: authenticatedUser,
    });
    await expect(response.json()).resolves.toEqual({
      accountId,
      attempt,
      authUserId: authenticatedUser.id,
      ok: true,
      restored: false,
      revision: 4,
    });
  });

  it("rejects a request captured for another auth user before service access", async () => {
    const response = await PUT(
      jsonRequest({ attempt: buildAttempt() }, "another-authenticated-user"),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      authUserId: authenticatedUser.id,
      error: "auth_scope_changed",
      ok: false,
    });
    expect(mocks.createSupabaseServiceClient).not.toHaveBeenCalled();
    expect(mocks.saveAccountAssessmentProgress).not.toHaveBeenCalled();
  });

  it("strips client-only sync metadata before server persistence", async () => {
    const attempt = {
      ...buildAttempt(),
      accountSync: {
        accountId,
        revision: 8,
        status: "synced",
      },
    };
    const parsed = accountAssessmentProgressPutSchema.parse({ attempt });

    expect(parsed.attempt).not.toHaveProperty("accountSync");
  });

  it("returns a stable 422 without echoing raw answers", async () => {
    const privateAnswerMarker = "do-not-echo-private-answer";
    const response = await PUT(
      jsonRequest({
        attempt: {
          ...buildAttempt(),
          responses: {
            [privateAnswerMarker]: {
              answeredAt: "not-a-date",
              itemId: privateAnswerMarker,
              value: 5,
            },
          },
        },
      }),
    );
    const bodyText = await response.text();

    expect(response.status).toBe(422);
    expect(bodyText).toContain("assessment_progress_validation_failed");
    expect(bodyText).not.toContain(privateAnswerMarker);
    expect(mocks.saveAccountAssessmentProgress).not.toHaveBeenCalled();
  });

  it("returns 409 with only the current revision on a concurrent update", async () => {
    const attempt = buildAttempt();
    mocks.saveAccountAssessmentProgress.mockResolvedValue({
      code: "assessment_progress_conflict",
      currentRevision: 7,
      ok: false,
    });

    const response = await PUT(jsonRequest({ attempt, expectedRevision: 2 }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      authUserId: authenticatedUser.id,
      currentRevision: 7,
      error: "assessment_progress_conflict",
      message:
        "다른 기기에서 검사 기록이 변경됐어요. 최신 기록을 불러온 뒤 다시 시도해 주세요.",
      ok: false,
    });
    expect(body).not.toHaveProperty("attempt");
    expect(body).not.toHaveProperty("responses");
  });

  it("returns 410 when a deleted logical result id is retried", async () => {
    const attempt = buildAttempt();
    mocks.saveAccountAssessmentProgress.mockResolvedValue({
      code: "assessment_progress_deleted",
      ok: false,
    });

    const response = await PUT(jsonRequest({ attempt, expectedRevision: 2 }));

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      authUserId: authenticatedUser.id,
      error: "assessment_progress_deleted",
      message: "이미 삭제한 검사 기록은 다시 저장할 수 없어요.",
      ok: false,
    });
  });

  it("maps a server-side official-release validation failure to 422", async () => {
    mocks.saveAccountAssessmentProgress.mockResolvedValue({
      code: "assessment_progress_invalid",
      ok: false,
    });

    const response = await PUT(jsonRequest({ attempt: buildAttempt() }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: "assessment_progress_validation_failed",
      ok: false,
    });
  });

  it("fails closed when a stored snapshot cannot be read safely", async () => {
    mocks.readAccountAssessmentProgress.mockResolvedValue({
      code: "assessment_progress_read_failed",
      ok: false,
    });

    const response = await GET(getRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "assessment_progress_read_failed",
      message:
        "검사 진행 기록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      ok: false,
    });
  });
});

function getRequest(authUserId = authenticatedUser.id) {
  return new Request("http://localhost/api/assessment-progress", {
    headers: { "x-nuang-auth-user-id": authUserId },
  });
}

function jsonRequest(body: unknown, authUserId = authenticatedUser.id) {
  return new Request("http://localhost/api/assessment-progress", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-nuang-auth-user-id": authUserId,
    },
    method: "PUT",
  });
}

function buildAttempt() {
  const now = "2026-08-02T00:00:00.000Z";

  return {
    assessmentId: candidateQuickCoreAssessment.assessmentId,
    createdAt: now,
    currentIndex: 0,
    expiresAt: "2026-08-09T00:00:00.000Z",
    id: "local_11111111-1111-4111-8111-111111111111",
    itemIds: candidateQuickCoreAssessment.items.map((item) => item.itemId),
    localPersistStatus: "saved" as const,
    mode: candidateQuickCoreAssessment.mode,
    releaseId: candidateQuickCoreAssessment.releaseId,
    responses: {},
    state: "in_progress" as const,
    updatedAt: now,
  };
}
