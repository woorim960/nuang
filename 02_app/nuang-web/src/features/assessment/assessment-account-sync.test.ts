import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";

const storage = vi.hoisted(() => ({
  attempts: new Map<string, LocalAssessmentAttempt>(),
  deleted: new Set<string>(),
  scope: null as string | null,
}));
const storageHooks = vi.hoisted(() => ({
  beforeGetStoredAttempt: null as ((id: string) => Promise<void> | void) | null,
}));
const authState = vi.hoisted(() => ({
  userId: "auth-user-a" as string | null,
}));

vi.mock("@/features/result-persistence/client-result-scope", () => ({
  readCurrentSupabaseUserId: vi.fn(async () => authState.userId),
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  cacheLocalAssessmentAttempt: vi.fn(
    async (attempt: LocalAssessmentAttempt) => {
      storage.attempts.set(attempt.id, structuredClone(attempt));
      return attempt;
    },
  ),
  compareAndSwapStoredLocalAttempt: vi.fn(
    async ({
      attempt,
      expected,
    }: {
      attempt: LocalAssessmentAttempt;
      expected: { syncRequestId?: string | null; updatedAt: string };
    }) => {
      const current = storage.attempts.get(attempt.id);
      if (
        storage.deleted.has(attempt.id) ||
        !current ||
        current.updatedAt !== expected.updatedAt ||
        (current.accountSync?.syncRequestId ?? null) !==
          (expected.syncRequestId ?? null)
      ) {
        return false;
      }
      storage.attempts.set(attempt.id, structuredClone(attempt));
      return true;
    },
  ),
  deleteLocalAttempt: vi.fn(async (id: string) => {
    storage.deleted.add(id);
    storage.attempts.delete(id);
  }),
  getStoredLocalAttempt: vi.fn(async (id: string) => {
    await storageHooks.beforeGetStoredAttempt?.(id);
    return storage.attempts.get(id);
  }),
  isLocalAssessmentAttemptDeleted: vi.fn((id: string) =>
    storage.deleted.has(id),
  ),
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
    storage.deleted.clear();
    storage.scope = null;
    storageHooks.beforeGetStoredAttempt = null;
    authState.userId = "auth-user-a";
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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(storage.attempts.get(local.id)).toMatchObject({
      accountSync: { revision: 2, status: "synced" },
      currentIndex: 8,
    });
  });

  it("removes a local account cache listed in the server deletion boundary", async () => {
    const deleted = createAttempt("core-deleted-on-another-device", {
      accountSync: {
        accountId: "account-a",
        revision: 2,
        status: "synced",
      },
    });
    storage.attempts.set(deleted.id, deleted);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          accountId: "account-a",
          attempts: [],
          deletedLocalResultIds: [deleted.id],
          ok: true,
        }),
      ),
    );

    const result = await synchronizeAccountAssessmentAttempts();

    expect(result.status).toBe("synced");
    expect(storage.deleted.has(deleted.id)).toBe(true);
    expect(storage.attempts.has(deleted.id)).toBe(false);
  });

  it("discards an account response when the authenticated user changes in flight", async () => {
    const remote = createAttempt("remote-from-account-a");
    let resolveRead!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveRead = resolve;
          }),
      ),
    );

    const synchronization = synchronizeAccountAssessmentAttempts();
    await vi.waitFor(() => expect(resolveRead).toEqual(expect.any(Function)));
    authState.userId = "auth-user-b";
    resolveRead(
      jsonResponse({
        accountId: "account-a",
        attempts: [{ attempt: remote, revision: 1 }],
        ok: true,
      }),
    );

    await expect(synchronization).resolves.toMatchObject({ status: "error" });
    expect(storage.scope).toBeNull();
    expect(storage.attempts.has(remote.id)).toBe(false);
  });

  it("does not hydrate account A cache when authentication switches to B during hydration", async () => {
    const remote = createAttempt("remote-a-during-hydration");
    storageHooks.beforeGetStoredAttempt = (id) => {
      if (id === remote.id) authState.userId = "auth-user-b";
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          accountId: "account-a",
          attempts: [{ attempt: remote, revision: 1 }],
          ok: true,
        }),
      ),
    );

    const result = await synchronizeAccountAssessmentAttempts();

    expect(result.status).toBe("error");
    expect(storage.scope).toBeNull();
    expect(storage.attempts.has(remote.id)).toBe(false);
    expect(storage.deleted.has(remote.id)).toBe(false);
  });

  it("does not adopt account A write response when authentication switches to B before caching", async () => {
    const guest = createAttempt("guest-write-before-auth-switch", {
      accountSync: { status: "local_only" },
    });
    storage.attempts.set(guest.id, guest);
    const writeResponse = jsonResponse({
      accountId: "account-a",
      attempt: guest,
      ok: true,
      restored: false,
      revision: 1,
    });
    vi.mocked(writeResponse.json).mockImplementation(async () => {
      authState.userId = "auth-user-b";
      return {
        accountId: "account-a",
        attempt: guest,
        authUserId: "auth-user-a",
        ok: true,
        restored: false,
        revision: 1,
      };
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ accountId: "account-a", attempts: [], ok: true }),
        )
        .mockResolvedValueOnce(writeResponse),
    );

    const result = await synchronizeAccountAssessmentAttempts();
    const stored = storage.attempts.get(guest.id);

    expect(result.status).toBe("error");
    expect(storage.scope).toBeNull();
    expect(stored?.accountSync?.status).not.toBe("synced");
    expect(stored?.accountSync?.revision).toBeUndefined();
    expect(storage.deleted.has(guest.id)).toBe(false);
  });

  it("does not upload an offline attempt created by account A after account B signs in", async () => {
    const accountAOfflineAttempt = createAttempt("offline-owned-by-a", {
      accountSync: {
        ownerSupabaseUserId: "auth-user-a",
        status: "local_only",
      },
    });
    storage.attempts.set(accountAOfflineAttempt.id, accountAOfflineAttempt);
    authState.userId = "auth-user-b";
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        { accountId: "account-b", attempts: [], ok: true },
        200,
        "auth-user-b",
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await synchronizeAccountAssessmentAttempts();

    expect(result).toMatchObject({ accountId: "account-b", status: "synced" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(storage.attempts.has(accountAOfflineAttempt.id)).toBe(false);
  });

  it("tombstones a local attempt when the server rejects a late retry as deleted", async () => {
    const guest = createAttempt("core-retried-after-server-delete", {
      accountSync: { status: "local_only" },
    });
    storage.attempts.set(guest.id, guest);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ accountId: "account-a", attempts: [], ok: true }),
        )
        .mockResolvedValueOnce(
          jsonResponse(
            { error: "assessment_progress_deleted", ok: false },
            410,
          ),
        ),
    );

    const result = await synchronizeAccountAssessmentAttempts();

    expect(result.status).toBe("synced");
    expect(storage.deleted.has(guest.id)).toBe(true);
    expect(storage.attempts.has(guest.id)).toBe(false);
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

  it("does not re-create a tombstoned attempt when a delayed queue arrives", async () => {
    const deleted = createAttempt("local-deleted-before-queue");
    const fetchMock = vi.fn();
    storage.deleted.add(deleted.id);
    vi.stubGlobal("fetch", fetchMock);

    const result = await queueAccountAssessmentAttemptSync(deleted);

    expect(result).toBe(deleted);
    expect(storage.attempts.has(deleted.id)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("quarantines an ambiguous first upload to the account that attempted it", async () => {
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
      accountId: "account-a",
      status: "failed",
    });

    await clearAccountOwnedLocalAttempts();
    expect(storage.attempts.has(guest.id)).toBe(false);
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
    vi.stubGlobal(
      "fetch",
      vi.fn(() => pendingRead),
    );

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

  it("does not restore or re-upload a provisional attempt after logout during its write", async () => {
    const guest = createAttempt("guest-write-before-logout", {
      accountSync: { status: "local_only" },
    });
    storage.attempts.set(guest.id, guest);
    let resolveWrite!: (response: Response) => void;
    const pendingWrite = new Promise<Response>((resolve) => {
      resolveWrite = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ accountId: "account-a", attempts: [], ok: true }),
      )
      .mockImplementationOnce(() => pendingWrite)
      .mockResolvedValueOnce(
        jsonResponse({ accountId: "account-b", attempts: [], ok: true }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const synchronization = synchronizeAccountAssessmentAttempts();
    await vi.waitFor(() => {
      expect(storage.attempts.get(guest.id)?.accountSync).toMatchObject({
        accountId: "account-a",
        status: "syncing",
      });
    });
    await clearAccountOwnedLocalAttempts();
    resolveWrite(
      jsonResponse({
        accountId: "account-a",
        attempt: guest,
        ok: true,
        restored: false,
        revision: 1,
      }),
    );
    await synchronization;

    expect(storage.attempts.has(guest.id)).toBe(false);
    await synchronizeAccountAssessmentAttempts();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(1);
    expect(storage.attempts.has(guest.id)).toBe(false);
  });

  it("keeps a deleted attempt tombstoned across a late write and later hydration", async () => {
    const guest = createAttempt("guest-deleted-during-write", {
      accountSync: { status: "local_only" },
    });
    storage.attempts.set(guest.id, guest);
    let resolveWrite!: (response: Response) => void;
    const pendingWrite = new Promise<Response>((resolve) => {
      resolveWrite = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ accountId: "account-a", attempts: [], ok: true }),
      )
      .mockImplementationOnce(() => pendingWrite)
      .mockResolvedValueOnce(
        jsonResponse({
          accountId: "account-a",
          attempts: [{ attempt: guest, revision: 1 }],
          ok: true,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const synchronization = synchronizeAccountAssessmentAttempts();
    await vi.waitFor(() => {
      expect(storage.attempts.get(guest.id)?.accountSync?.status).toBe(
        "syncing",
      );
    });
    storage.deleted.add(guest.id);
    storage.attempts.delete(guest.id);
    resolveWrite(
      jsonResponse({
        accountId: "account-a",
        attempt: guest,
        ok: true,
        restored: false,
        revision: 1,
      }),
    );
    await synchronization;

    expect(storage.attempts.has(guest.id)).toBe(false);
    resetAssessmentAccountSyncSession();
    await synchronizeAccountAssessmentAttempts();
    expect(storage.attempts.has(guest.id)).toBe(false);
  });

  it("does not let a stale failure downgrade a newer sync request", async () => {
    const guest = createAttempt("guest-newer-sync-wins", {
      accountSync: { status: "local_only" },
    });
    storage.attempts.set(guest.id, guest);
    let resolveWrite!: (response: Response) => void;
    const pendingWrite = new Promise<Response>((resolve) => {
      resolveWrite = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ accountId: "account-a", attempts: [], ok: true }),
        )
        .mockImplementationOnce(() => pendingWrite)
        .mockResolvedValueOnce(
          jsonResponse({ accountId: "account-a", attempts: [], ok: true }),
        ),
    );

    const synchronization = synchronizeAccountAssessmentAttempts();
    await vi.waitFor(() => {
      expect(
        storage.attempts.get(guest.id)?.accountSync?.syncRequestId,
      ).toEqual(expect.any(String));
    });
    storage.attempts.set(guest.id, {
      ...guest,
      accountSync: {
        accountId: "account-a",
        revision: 2,
        status: "synced",
        syncRequestId: "newer-request",
      },
    });
    resolveWrite(jsonResponse({}, 500));
    await synchronization;

    expect(storage.attempts.get(guest.id)?.accountSync).toMatchObject({
      revision: 2,
      status: "synced",
      syncRequestId: "newer-request",
    });
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

  it("clears provisional authenticated-origin work while preserving a true guest", async () => {
    const guest = createAttempt("local-true-guest");
    const provisionalOwned = createAttempt("local-provisional-owned", {
      accountSync: {
        ownerSupabaseUserId: "auth-user-a",
        status: "local_only",
      },
    });
    storage.attempts.set(guest.id, guest);
    storage.attempts.set(provisionalOwned.id, provisionalOwned);

    await clearAccountOwnedLocalAttempts();

    expect([...storage.attempts.keys()]).toEqual([guest.id]);
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

function jsonResponse(body: unknown, status = 200, authUserId = "auth-user-a") {
  const payload =
    body && typeof body === "object"
      ? {
          ...body,
          ...(status !== 401 && status !== 422 ? { authUserId } : {}),
          ...(Array.isArray((body as { attempts?: unknown }).attempts)
            ? {
                deletedLocalResultIds:
                  (body as { deletedLocalResultIds?: string[] })
                    .deletedLocalResultIds ?? [],
              }
            : {}),
        }
      : body;
  return {
    json: vi.fn(async () => payload),
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Response;
}
