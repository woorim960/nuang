import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAccountOwnedLabResults,
  deleteLabResult,
  deleteLabResultEverywhere,
  listLabResults,
  listLabResultsLocalFirst,
  loadLabResult,
  loadLabResultById,
  loadLabResultLocalFirst,
  saveLabResult,
  syncLabResult,
} from "@/features/lab/lab-storage";

const authScopeMocks = vi.hoisted(() => ({
  userId: "auth-user-a" as string | null,
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: authScopeMocks.userId
            ? {
                access_token: "test-session",
                user: { id: authScopeMocks.userId },
              }
            : null,
        },
      })),
    },
  }),
}));

const slug = "conversation-temperature";

describe("lab result history storage", () => {
  beforeEach(() => {
    authScopeMocks.userId = "auth-user-a";
    vi.stubGlobal("localStorage", createMemoryStorage());
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("preserves multiple completions of the same lab and points the legacy URL to the latest", () => {
    const first = saveLabResult(
      createResult({
        completedAt: "2026-07-27T10:00:00.000Z",
        localResultId: "lab_attempt_first",
      }),
    );
    const second = saveLabResult(
      createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_attempt_second",
      }),
    );

    expect(
      listLabResults([slug]).map((result) => result.localResultId),
    ).toEqual(["lab_attempt_second", "lab_attempt_first"]);
    expect(loadLabResult(slug)?.localResultId).toBe(second.localResultId);
    expect(loadLabResultById(first.localResultId)?.completedAt).toBe(
      first.completedAt,
    );
  });

  it("updates only the matching completion when an idempotent sync is saved again", () => {
    saveLabResult(
      createResult({
        completedAt: "2026-07-27T10:00:00.000Z",
        localResultId: "lab_attempt_first",
      }),
    );
    saveLabResult(
      createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_attempt_second",
      }),
    );
    saveLabResult({
      ...createResult({
        completedAt: "2026-07-27T10:00:00.000Z",
        localResultId: "lab_attempt_first",
      }),
      serverResultId: "11111111-1111-4111-8111-111111111111",
      sync: { status: "synced" },
    });

    const results = listLabResults([slug]);
    expect(results).toHaveLength(2);
    expect(results[1]).toMatchObject({
      localResultId: "lab_attempt_first",
      serverResultId: "11111111-1111-4111-8111-111111111111",
      sync: { status: "synced" },
    });
    expect(loadLabResult(slug)?.localResultId).toBe("lab_attempt_second");
  });

  it("migrates the old slug key without losing the existing result", () => {
    localStorage.setItem(
      `nuang-lab-result:${slug}`,
      JSON.stringify(
        createResult({
          completedAt: "2026-07-27T10:00:00.000Z",
          localResultId: undefined,
        }),
      ),
    );

    const migrated = loadLabResult(slug);

    expect(migrated?.localResultId).toMatch(/^lab_/);
    expect(listLabResults([slug])).toHaveLength(1);
    expect(localStorage.getItem(`nuang-lab-result:${slug}`)).toBeNull();
  });

  it("deletes one completion and keeps the previous result available at the legacy URL", () => {
    saveLabResult(
      createResult({
        completedAt: "2026-07-27T10:00:00.000Z",
        localResultId: "lab_attempt_first",
      }),
    );
    saveLabResult(
      createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_attempt_second",
      }),
    );

    deleteLabResult("lab_attempt_second");

    expect(loadLabResultById("lab_attempt_second")).toBeNull();
    expect(loadLabResult(slug)?.localResultId).toBe("lab_attempt_first");
    expect(listLabResults([slug])).toHaveLength(1);
  });

  it("sends the same local result id to the server and stores the returned server id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          ok: true,
          result: {
            serverResultId: "22222222-2222-4222-8222-222222222222",
            syncedAt: "2026-07-28T10:01:00.000Z",
          },
        }),
        { status: 200 },
      ),
    );
    const stored = saveLabResult(
      createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_attempt_sync",
      }),
    );

    const synced = await syncLabResult(stored);
    const request = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(request?.[1]?.body));

    expect(body.localResultId).toBe("lab_attempt_sync");
    expect(request?.[1]?.headers).toEqual(
      expect.objectContaining({
        "x-nuang-auth-user-id": "auth-user-a",
      }),
    );
    expect(synced).toMatchObject({
      localResultId: "lab_attempt_sync",
      serverResultId: "22222222-2222-4222-8222-222222222222",
      sync: { status: "synced" },
    });
    expect(listLabResults([slug])).toHaveLength(1);
  });

  it("hydrates an exact missing result from the signed-in account", async () => {
    const remote = {
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_remote_exact",
      }),
      serverResultId: "22222222-2222-4222-8222-222222222222",
      sync: { status: "synced" as const },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          deletedLocalResultIds: [],
          ok: true,
          results: [remote],
        }),
        { status: 200 },
      ),
    );

    const loaded = await loadLabResultLocalFirst("lab_remote_exact");

    expect(fetch).toHaveBeenCalledWith(
      "/api/lab-results?localResultId=lab_remote_exact",
      expect.objectContaining({
        headers: { "x-nuang-auth-user-id": "auth-user-a" },
        method: "GET",
      }),
    );
    expect(loaded).toMatchObject({
      localResultId: "lab_remote_exact",
      serverResultId: "22222222-2222-4222-8222-222222222222",
      sync: { status: "synced" },
    });
    expect(loadLabResultById("lab_remote_exact")).not.toBeNull();
  });

  it("merges account history with unsynced local completions without duplicates", async () => {
    const local = saveLabResult(
      createResult({
        completedAt: "2026-07-29T10:00:00.000Z",
        localResultId: "lab_local_pending",
      }),
    );
    const remote = {
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_remote_exact",
      }),
      serverResultId: "22222222-2222-4222-8222-222222222222",
      sync: { status: "synced" as const },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          deletedLocalResultIds: [],
          ok: true,
          results: [remote],
        }),
        { status: 200 },
      ),
    );

    const results = await listLabResultsLocalFirst([slug]);

    expect(results.map((result) => result.localResultId)).toEqual([
      local.localResultId,
      remote.localResultId,
    ]);
  });

  it("keeps a guest result available when the signed-in reconciliation request is offline", async () => {
    const local = saveLabResult(
      createResult({
        completedAt: "2026-07-29T10:00:00.000Z",
        localResultId: "lab_guest_offline",
      }),
    );
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    await expect(
      loadLabResultLocalFirst(local.localResultId),
    ).resolves.toMatchObject({ localResultId: local.localResultId });
  });

  it("keeps the local copy when account deletion fails", async () => {
    saveLabResult({
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_delete_retry",
      }),
      ownerSupabaseUserId: "auth-user-a",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "write_failed" }), { status: 503 }),
    );

    await expect(deleteLabResultEverywhere("lab_delete_retry")).resolves.toBe(
      "error",
    );
    expect(loadLabResultById("lab_delete_retry")).not.toBeNull();
  });

  it("deletes locally after the account deletion succeeds", async () => {
    saveLabResult({
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_delete_everywhere",
      }),
      ownerSupabaseUserId: "auth-user-a",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          deleted: true,
          ok: true,
        }),
        { status: 200 },
      ),
    );

    await expect(
      deleteLabResultEverywhere("lab_delete_everywhere"),
    ).resolves.toBe("deleted");
    expect(fetch).toHaveBeenCalledWith(
      "/api/lab-results",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-nuang-auth-user-id": "auth-user-a",
        }),
        method: "DELETE",
      }),
    );
    expect(loadLabResultById("lab_delete_everywhere")).toBeNull();
  });

  it("keeps the local result when account A changes to B during deletion", async () => {
    let resolveRequest!: (response: Response) => void;
    saveLabResult({
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_account_switch_delete",
      }),
      ownerSupabaseUserId: "auth-user-a",
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const deleting = deleteLabResultEverywhere("lab_account_switch_delete");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    authScopeMocks.userId = "auth-user-b";
    resolveRequest(
      new Response(JSON.stringify({ authUserId: "auth-user-a", ok: true }), {
        status: 200,
      }),
    );

    await expect(deleting).resolves.toBe("error");
    expect(loadLabResultById("lab_account_switch_delete")).not.toBeNull();
  });

  it("does not hide a synced account result when the delete session expired", async () => {
    saveLabResult({
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_synced_delete",
      }),
      serverResultId: "22222222-2222-4222-8222-222222222222",
      sync: { status: "synced" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
      }),
    );

    await expect(deleteLabResultEverywhere("lab_synced_delete")).resolves.toBe(
      "error",
    );
    expect(loadLabResultById("lab_synced_delete")).not.toBeNull();
  });

  it("allows a guest-only result to be deleted without an account", async () => {
    saveLabResult(
      createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_guest_delete",
      }),
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
      }),
    );

    await expect(deleteLabResultEverywhere("lab_guest_delete")).resolves.toBe(
      "local_only",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(loadLabResultById("lab_guest_delete")).toBeNull();
  });

  it("marks a guest sync as login required", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
      }),
    );
    const stored = saveLabResult(
      createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_guest_pending",
      }),
    );

    const synced = await syncLabResult(stored);

    expect(synced.sync).toEqual({
      lastError: "login_required",
      status: "failed",
    });
  });

  it("never uploads an account A offline result after account B signs in", async () => {
    const stored = saveLabResult({
      ...createResult({
        completedAt: "2026-08-15T00:00:00.000Z",
        localResultId: "lab_owned_by_account_a",
      }),
      ownerSupabaseUserId: "auth-user-a",
    });
    authScopeMocks.userId = "auth-user-b";
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(syncLabResult(stored)).resolves.toMatchObject({
      ownerSupabaseUserId: "auth-user-a",
      sync: { status: "queued" },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not expose a cached result owned by another signed-in account", async () => {
    const accountOwned = saveLabResult({
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_account_a",
      }),
      ownerAccountId: "account-a",
      sync: { status: "synced" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          accountId: "account-b",
          authUserId: "auth-user-a",
          deletedLocalResultIds: [],
          ok: true,
          results: [],
        }),
        { status: 200 },
      ),
    );

    await expect(listLabResultsLocalFirst([slug])).resolves.toEqual([]);
    await expect(
      loadLabResultLocalFirst(accountOwned.localResultId),
    ).resolves.toBeNull();
  });

  it("quarantines an ownerless legacy synced result until the server proves ownership", async () => {
    const legacy = saveLabResult({
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_legacy_synced",
      }),
      serverResultId: "22222222-2222-4222-8222-222222222222",
      sync: { status: "synced" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          accountId: "account-b",
          authUserId: "auth-user-a",
          deletedLocalResultIds: [],
          ok: true,
          results: [],
        }),
        { status: 200 },
      ),
    );

    await expect(
      loadLabResultLocalFirst(legacy.localResultId),
    ).resolves.toBeNull();
  });

  it("backfills both account scopes after proving a legacy result belongs to the current account", async () => {
    const legacy = saveLabResult({
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_legacy_owned",
      }),
      serverResultId: "22222222-2222-4222-8222-222222222222",
      sync: { status: "synced" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          accountId: "account-a",
          authUserId: "auth-user-a",
          deletedLocalResultIds: [],
          ok: true,
          results: [legacy],
        }),
        { status: 200 },
      ),
    );

    await loadLabResultLocalFirst(legacy.localResultId);

    expect(loadLabResultById(legacy.localResultId)).toMatchObject({
      ownerAccountId: "account-a",
      ownerSupabaseUserId: "auth-user-a",
    });
  });

  it("discards a late account A read response after the browser switches to account B", async () => {
    let resolveRequest!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const remote = {
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_account_a_remote",
      }),
      serverResultId: "22222222-2222-4222-8222-222222222222",
      sync: { status: "synced" as const },
    };

    const reading = listLabResultsLocalFirst([slug]);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    authScopeMocks.userId = "auth-user-b";
    resolveRequest(
      new Response(
        JSON.stringify({
          accountId: "account-a",
          authUserId: "auth-user-a",
          deletedLocalResultIds: [],
          ok: true,
          results: [remote],
        }),
        { status: 200 },
      ),
    );

    await expect(reading).resolves.toEqual([]);
    expect(loadLabResultById("lab_account_a_remote")).toBeNull();
  });

  it("does not map a late account A sync response onto account B", async () => {
    let resolveRequest!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const local = saveLabResult(
      createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_account_switch_sync",
      }),
    );

    const syncing = syncLabResult(local);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    authScopeMocks.userId = "auth-user-b";
    resolveRequest(
      new Response(
        JSON.stringify({
          accountId: "account-a",
          authUserId: "auth-user-a",
          ok: true,
          result: {
            serverResultId: "22222222-2222-4222-8222-222222222222",
          },
        }),
        { status: 200 },
      ),
    );

    await expect(syncing).resolves.toMatchObject({
      ownerSupabaseUserId: "auth-user-a",
      sync: { lastError: "auth_scope_changed", status: "failed" },
    });
    const cached = loadLabResultById(local.localResultId);
    expect(cached?.ownerSupabaseUserId).toBe("auth-user-a");
    expect(cached).not.toHaveProperty("ownerAccountId");
    expect(cached).not.toHaveProperty("serverResultId");
  });

  it("removes server-tombstoned entries from the list and prevents re-upload", async () => {
    const local = saveLabResult({
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_remote_deleted_list",
      }),
      ownerAccountId: "account-a",
      ownerSupabaseUserId: "auth-user-a",
      sync: { status: "synced" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          accountId: "account-a",
          authUserId: "auth-user-a",
          deletedLocalResultIds: [local.localResultId],
          ok: true,
          results: [],
        }),
        { status: 200 },
      ),
    );

    await expect(listLabResultsLocalFirst([slug])).resolves.toEqual([]);
    expect(loadLabResultById(local.localResultId)).toBeNull();
    await syncLabResult(local);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("removes a server-tombstoned entry from the exact-result loader", async () => {
    const local = saveLabResult({
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_remote_deleted_exact",
      }),
      ownerAccountId: "account-a",
      ownerSupabaseUserId: "auth-user-a",
      sync: { status: "synced" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          accountId: "account-a",
          authUserId: "auth-user-a",
          deletedLocalResultIds: [local.localResultId],
          ok: true,
          results: [],
        }),
        { status: 200 },
      ),
    );

    await expect(
      loadLabResultLocalFirst(local.localResultId),
    ).resolves.toBeNull();
    expect(loadLabResultById(local.localResultId)).toBeNull();
  });

  it("does not recreate a local result when a late sync succeeds after deletion", async () => {
    let resolveRequest!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const stored = saveLabResult(
      createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_deleted_during_sync",
      }),
    );
    const syncing = syncLabResult(stored);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());

    deleteLabResult(stored.localResultId);
    resolveRequest(
      new Response(
        JSON.stringify({
          accountId: "account-a",
          authUserId: "auth-user-a",
          ok: true,
          result: {
            serverResultId: "22222222-2222-4222-8222-222222222222",
          },
        }),
        { status: 200 },
      ),
    );
    await syncing;

    expect(loadLabResultById(stored.localResultId)).toBeNull();
  });

  it("clears account-owned cache while preserving a guest result", () => {
    const guest = saveLabResult(
      createResult({
        completedAt: "2026-07-28T11:00:00.000Z",
        localResultId: "lab_guest",
      }),
    );
    const accountOwned = saveLabResult({
      ...createResult({
        completedAt: "2026-07-28T10:00:00.000Z",
        localResultId: "lab_account",
      }),
      ownerAccountId: "account-a",
      sync: { status: "synced" },
    });

    clearAccountOwnedLabResults();

    expect(loadLabResultById(guest.localResultId)).not.toBeNull();
    expect(loadLabResultById(accountOwned.localResultId)).toBeNull();
  });
});

function createResult({
  completedAt,
  localResultId,
}: {
  completedAt: string;
  localResultId: string | undefined;
}) {
  return {
    answers: {},
    completedAt,
    contentVersion: "odd-trait-lab-result-copy.v0.1",
    ...(localResultId ? { localResultId } : {}),
    result: {
      profile: {
        id: "spark",
        relationTip: "대화 전 짧게 확인해요.",
        shortTitle: "바로 대화",
        smallExperiment: "오늘 한 번 물어보세요.",
        strengths: ["대화를 시작하기 쉬워요."],
        summary: "말하면서 정리하는 편이에요.",
        title: "바로 불을 켜는 대화 스타일",
        watch: "상대에게 빠르게 느껴질 수 있어요.",
      },
      scores: { spark: 6 },
      tiedProfileIds: [],
    },
    slug,
  };
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    get length() {
      return values.size;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}
