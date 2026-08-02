import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";

const storage = vi.hoisted(() => ({
  attempts: new Map<string, LocalAssessmentAttempt>(),
  scope: null as string | null,
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  cacheLocalAssessmentAttempt: vi.fn(
    async (attempt: LocalAssessmentAttempt) => {
      storage.attempts.set(attempt.id, structuredClone(attempt));
      return attempt;
    },
  ),
  getStoredLocalAttempt: vi.fn(async (id: string) => storage.attempts.get(id)),
  listLocalAttempts: vi.fn(async () =>
    Array.from(storage.attempts.values()).filter((attempt) => {
      const owner = attempt.accountSync?.accountId;
      return !owner || owner === storage.scope;
    }),
  ),
  listStoredLocalAttempts: vi.fn(async () =>
    Array.from(storage.attempts.values()),
  ),
  removeStoredLocalAttempt: vi.fn(async (id: string) => {
    storage.attempts.delete(id);
  }),
  setLocalAssessmentAccountScope: vi.fn((accountId: string | null) => {
    storage.scope = accountId;
  }),
}));

import {
  clearAccountOwnedLocalAttempts,
  queueAccountAssessmentAttemptSync,
  resetAssessmentAccountSyncSession,
  synchronizeAccountAssessmentAttempts,
} from "@/features/assessment/assessment-account-sync";

describe("assessment account synchronization", () => {
  beforeEach(() => {
    storage.attempts.clear();
    storage.scope = null;
    vi.unstubAllGlobals();
    resetAssessmentAccountSyncSession();
  });

  it("stops probing after the first unauthenticated response", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, 401));
    vi.stubGlobal("fetch", fetchMock);

    expect((await synchronizeAccountAssessmentAttempts()).status).toBe(
      "unauthenticated",
    );
    expect((await synchronizeAccountAssessmentAttempts()).status).toBe(
      "unauthenticated",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uploads a guest attempt without client metadata and refreshes remote cache retention", async () => {
    const guest = createAttempt("local-guest", {
      accountSync: { status: "local_only" },
    });
    storage.attempts.set(guest.id, guest);
    const expiredRemote = createAttempt(guest.id, {
      expiresAt: "2025-01-01T00:00:00.000Z",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ accountId: "account-a", attempts: [], ok: true }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          accountId: "account-a",
          attempt: expiredRemote,
          ok: true,
          restored: false,
          revision: 1,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          accountId: "account-a",
          attempts: [{ attempt: expiredRemote, revision: 1 }],
          ok: true,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await synchronizeAccountAssessmentAttempts();
    const stored = storage.attempts.get(guest.id)!;
    const putBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      attempt: LocalAssessmentAttempt;
      expectedRevision?: number;
    };

    expect(result).toMatchObject({
      accountId: "account-a",
      status: "synced",
      uploadedCount: 1,
    });
    expect(putBody.expectedRevision).toBeUndefined();
    expect(putBody.attempt).not.toHaveProperty("accountSync");
    expect(stored.accountSync).toMatchObject({
      accountId: "account-a",
      revision: 1,
      status: "synced",
    });
    expect(new Date(stored.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("keeps the higher remote revision for the same in-progress attempt", async () => {
    const local = createAttempt("local-shared", {
      accountSync: {
        accountId: "account-a",
        revision: 1,
        status: "queued",
      },
      currentIndex: 2,
    });
    const remote = createAttempt(local.id, {
      currentIndex: 8,
      updatedAt: "2026-08-02T01:00:00.000Z",
    });
    storage.attempts.set(local.id, local);
    const collection = {
      accountId: "account-a",
      attempts: [{ attempt: remote, revision: 2 }],
      ok: true,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(collection))
      .mockResolvedValueOnce(jsonResponse(collection));
    vi.stubGlobal("fetch", fetchMock);

    await synchronizeAccountAssessmentAttempts();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(storage.attempts.get(local.id)).toMatchObject({
      accountSync: { revision: 2, status: "synced" },
      currentIndex: 8,
    });
  });

  it("counts a cross-device hydration once and not again for the same synced revision", async () => {
    const remote = createAttempt("remote-only", {
      currentIndex: 6,
      updatedAt: "2026-08-02T01:00:00.000Z",
    });
    const collection = {
      accountId: "account-a",
      attempts: [{ attempt: remote, revision: 3 }],
      ok: true,
    };
    const fetchMock = vi.fn(async () => jsonResponse(collection));
    vi.stubGlobal("fetch", fetchMock);

    const first = await synchronizeAccountAssessmentAttempts();
    const second = await synchronizeAccountAssessmentAttempts();

    expect(first).toMatchObject({ restoredCount: 1, status: "synced" });
    expect(second).toMatchObject({ restoredCount: 0, status: "synced" });
    expect(storage.attempts.get(remote.id)).toMatchObject({
      accountSync: {
        accountId: "account-a",
        revision: 3,
        status: "synced",
      },
      currentIndex: 6,
    });
  });

  it("counts hydration when a newer remote revision replaces the local cache", async () => {
    const local = createAttempt("remote-newer", {
      accountSync: {
        accountId: "account-a",
        revision: 1,
        status: "synced",
      },
      currentIndex: 2,
    });
    const remote = createAttempt(local.id, {
      currentIndex: 9,
      updatedAt: "2026-08-02T03:00:00.000Z",
    });
    storage.attempts.set(local.id, local);
    const collection = {
      accountId: "account-a",
      attempts: [{ attempt: remote, revision: 2 }],
      ok: true,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(collection)),
    );

    const result = await synchronizeAccountAssessmentAttempts();

    expect(result).toMatchObject({ restoredCount: 1, status: "synced" });
    expect(storage.attempts.get(local.id)).toMatchObject({
      accountSync: { revision: 2, status: "synced" },
      currentIndex: 9,
    });
  });

  it("preserves a more complete queued local draft and uploads it against the remote revision", async () => {
    const local = createAttempt("local-more-complete", {
      accountSync: {
        accountId: "account-a",
        revision: 1,
        status: "queued",
      },
      currentIndex: 1,
      responses: {
        "item-1": {
          answeredAt: "2026-08-02T02:00:00.000Z",
          itemId: "item-1",
          value: 4,
        },
      },
      updatedAt: "2026-08-02T02:00:00.000Z",
    });
    const remote = createAttempt(local.id, {
      updatedAt: "2026-08-02T01:00:00.000Z",
    });
    storage.attempts.set(local.id, local);
    const initialCollection = {
      accountId: "account-a",
      attempts: [{ attempt: remote, revision: 4 }],
      ok: true,
    };
    const savedRemote = { ...local, accountSync: undefined };
    const savedCollection = {
      accountId: "account-a",
      attempts: [{ attempt: savedRemote, revision: 5 }],
      ok: true,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(initialCollection))
      .mockResolvedValueOnce(
        jsonResponse({
          accountId: "account-a",
          attempt: savedRemote,
          ok: true,
          restored: false,
          revision: 5,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(savedCollection));
    vi.stubGlobal("fetch", fetchMock);

    await synchronizeAccountAssessmentAttempts();

    const putBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      attempt: LocalAssessmentAttempt;
      expectedRevision?: number;
    };
    expect(putBody.expectedRevision).toBe(4);
    expect(Object.keys(putBody.attempt.responses)).toEqual(["item-1"]);
    expect(storage.attempts.get(local.id)).toMatchObject({
      accountSync: { revision: 5, status: "synced" },
      responses: { "item-1": { value: 4 } },
    });
  });

  it("uses the 409 current revision to retry a pending local draft without losing it", async () => {
    const local = createAttempt("local-conflict", {
      accountSync: {
        accountId: "account-a",
        revision: 1,
        status: "queued",
      },
      currentIndex: 1,
      responses: {
        "item-1": {
          answeredAt: "2026-08-02T02:00:00.000Z",
          itemId: "item-1",
          value: 5,
        },
      },
      updatedAt: "2026-08-02T02:00:00.000Z",
    });
    const remote = createAttempt(local.id, {
      updatedAt: "2026-08-02T01:00:00.000Z",
    });
    const remoteCollection = {
      accountId: "account-a",
      attempts: [{ attempt: remote, revision: 5 }],
      ok: true,
    };
    const savedRemote = { ...local, accountSync: undefined };
    const savedCollection = {
      accountId: "account-a",
      attempts: [{ attempt: savedRemote, revision: 6 }],
      ok: true,
    };
    storage.attempts.set(local.id, local);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(remoteCollection))
      .mockResolvedValueOnce(
        jsonResponse(
          { currentRevision: 5, error: "assessment_progress_conflict" },
          409,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(remoteCollection))
      .mockResolvedValueOnce(jsonResponse(remoteCollection))
      .mockResolvedValueOnce(
        jsonResponse({
          accountId: "account-a",
          attempt: savedRemote,
          ok: true,
          restored: false,
          revision: 6,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(savedCollection));
    vi.stubGlobal("fetch", fetchMock);

    await synchronizeAccountAssessmentAttempts();

    const firstPut = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      expectedRevision?: number;
    };
    const retryPut = JSON.parse(String(fetchMock.mock.calls[4]?.[1]?.body)) as {
      attempt: LocalAssessmentAttempt;
      expectedRevision?: number;
    };
    expect(firstPut.expectedRevision).toBe(5);
    expect(retryPut.expectedRevision).toBe(5);
    expect(retryPut.attempt.responses["item-1"]?.value).toBe(5);
    expect(storage.attempts.get(local.id)).toMatchObject({
      accountSync: { revision: 6, status: "synced" },
      responses: { "item-1": { value: 5 } },
    });
  });

  it("never lets a remote in-progress snapshot replace a completed local snapshot", async () => {
    const completed = createAttempt("local-completed", {
      accountSync: {
        accountId: "account-a",
        revision: 1,
        status: "queued",
      },
      completedAt: "2026-08-02T02:00:00.000Z",
      state: "completed",
    });
    const remoteDraft = createAttempt(completed.id, {
      currentIndex: 10,
      state: "in_progress",
    });
    storage.attempts.set(completed.id, completed);
    const collection = {
      accountId: "account-a",
      attempts: [{ attempt: remoteDraft, revision: 9 }],
      ok: true,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(collection))
      .mockResolvedValueOnce(
        jsonResponse({
          accountId: "account-a",
          attempt: completed,
          ok: true,
          restored: false,
          revision: 10,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          accountId: "account-a",
          attempts: [{ attempt: completed, revision: 10 }],
          ok: true,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await synchronizeAccountAssessmentAttempts();

    expect(storage.attempts.get(completed.id)?.state).toBe("completed");
  });

  it("queues locally even when the account endpoint is unavailable", async () => {
    const local = createAttempt("local-offline");
    const fetchMock = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", fetchMock);

    const queued = await queueAccountAssessmentAttemptSync(local);

    expect(queued.accountSync?.status).toBe("queued");
    expect(storage.attempts.get(local.id)?.accountSync?.status).toBe("queued");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("keeps guest work unclaimed when its first account upload fails", async () => {
    const guest = createAttempt("local-unsaved-guest", {
      accountSync: { status: "local_only" },
    });
    storage.attempts.set(guest.id, guest);
    const emptyCollection = {
      accountId: "account-a",
      attempts: [],
      ok: true,
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(emptyCollection))
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockResolvedValueOnce(jsonResponse(emptyCollection)),
    );

    await synchronizeAccountAssessmentAttempts();

    expect(storage.attempts.get(guest.id)?.accountSync).toMatchObject({
      status: "failed",
    });
    expect(
      storage.attempts.get(guest.id)?.accountSync?.accountId,
    ).toBeUndefined();

    await clearAccountOwnedLocalAttempts();
    expect(storage.attempts.has(guest.id)).toBe(true);
  });

  it("preserves a rejected guest attempt without retrying the same invalid payload", async () => {
    const guest = createAttempt("local-invalid-guest", {
      accountSync: { status: "local_only" },
    });
    storage.attempts.set(guest.id, guest);
    const emptyCollection = {
      accountId: "account-a",
      attempts: [],
      ok: true,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(emptyCollection))
      .mockResolvedValueOnce(jsonResponse({ error: "INVALID_ATTEMPT" }, 422))
      .mockResolvedValueOnce(jsonResponse(emptyCollection))
      .mockResolvedValueOnce(jsonResponse(emptyCollection))
      .mockResolvedValueOnce(jsonResponse(emptyCollection));
    vi.stubGlobal("fetch", fetchMock);

    await synchronizeAccountAssessmentAttempts();
    await synchronizeAccountAssessmentAttempts();

    expect(storage.attempts.get(guest.id)?.accountSync).toMatchObject({
      status: "rejected",
    });
    expect(
      storage.attempts.get(guest.id)?.accountSync?.accountId,
    ).toBeUndefined();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(1);

    await clearAccountOwnedLocalAttempts();
    expect(storage.attempts.has(guest.id)).toBe(true);
  });

  it("does not restore an account cache after logout cancels an in-flight read", async () => {
    const remote = createAttempt("remote-after-logout", {
      currentIndex: 5,
    });
    let resolveRead!: (response: Response) => void;
    const pendingRead = new Promise<Response>((resolve) => {
      resolveRead = resolve;
    });
    vi.stubGlobal("fetch", vi.fn(() => pendingRead));

    const synchronization = synchronizeAccountAssessmentAttempts();
    await clearAccountOwnedLocalAttempts();
    resolveRead(
      jsonResponse({
        accountId: "account-a",
        attempts: [{ attempt: remote, revision: 2 }],
        ok: true,
      }),
    );

    await synchronization;

    expect(storage.attempts.has(remote.id)).toBe(false);
    expect(storage.scope).toBeNull();
  });

  it("clears account caches without deleting unclaimed guest work", async () => {
    const guest = createAttempt("local-guest");
    const ownedA = createAttempt("local-owned-a", {
      accountSync: {
        accountId: "account-a",
        revision: 1,
        status: "synced",
      },
    });
    const ownedB = createAttempt("local-owned-b", {
      accountSync: {
        accountId: "account-b",
        revision: 1,
        status: "synced",
      },
    });
    [guest, ownedA, ownedB].forEach((attempt) =>
      storage.attempts.set(attempt.id, attempt),
    );

    await clearAccountOwnedLocalAttempts("account-a");

    expect([...storage.attempts.keys()].sort()).toEqual([guest.id, ownedB.id]);
    expect(storage.scope).toBeNull();
  });
});

function createAttempt(
  id: string,
  overrides: Partial<LocalAssessmentAttempt> = {},
): LocalAssessmentAttempt {
  return {
    assessmentId: "nu-core-quick",
    createdAt: "2026-08-02T00:00:00.000Z",
    currentIndex: 0,
    expiresAt: "2099-08-02T00:00:00.000Z",
    id,
    itemIds: ["item-1", "item-2"],
    mode: "quick",
    releaseId: "quick-release-1",
    responses: {},
    state: "in_progress",
    updatedAt: "2026-08-02T00:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    json: vi.fn(async () => body),
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Response;
}
