import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteFeedMediaObjects: vi.fn(),
  ensureAccountForUser: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccountForUser,
}));

vi.mock("@/features/feed/feed-media-storage", () => ({
  deleteFeedMediaObjects: mocks.deleteFeedMediaObjects,
}));

import { deleteOwnAccount } from "@/features/account/server-account-deletion";

const supabaseObject = {
  provider: "supabase" as const,
  storagePath: "feed/v1/post-1/01-supabase.webp",
};
const r2Object = {
  provider: "cloudflare_r2" as const,
  storagePath: "feed/v1/post-1/02-r2.webp",
};

describe("deleteOwnAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteFeedMediaObjects.mockReset();
    mocks.ensureAccountForUser.mockResolvedValue({
      accountId: "account-1",
      ok: true,
    });
  });

  it("lets the DB delete trigger own durability, then deletes active provider objects", async () => {
    const events: string[] = [];
    const harness = createClient({
      deletion: { data: true, error: null },
      events,
    });
    mocks.deleteFeedMediaObjects.mockImplementation(
      async ({ objects }: { objects: typeof harness.feedObjects }) => {
        events.push("delete-provider-objects");
        expect(objects).toEqual(harness.feedObjects);
        return { failedObjects: [], ok: true as const };
      },
    );

    await expect(
      deleteOwnAccount({
        client: harness.client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ ok: true });

    expect(events).toEqual([
      "remove-profile-avatar",
      "delete-account",
      "delete-provider-objects",
      `resolve:${supabaseObject.provider}:${supabaseObject.storagePath}`,
      `resolve:${r2Object.provider}:${r2Object.storagePath}`,
    ]);
    expect(harness.feedRpc).not.toHaveBeenCalledWith(
      "enqueue_account_media_storage_cleanup",
      expect.anything(),
    );
  });

  it("keeps failed provider objects queued while account deletion still succeeds", async () => {
    const events: string[] = [];
    const harness = createClient({
      deletion: { data: true, error: null },
      events,
    });
    mocks.deleteFeedMediaObjects.mockImplementation(async () => {
      events.push("delete-provider-objects");
      return { failedObjects: [r2Object], ok: false as const };
    });

    const result = await deleteOwnAccount({
      client: harness.client as never,
      user: { id: "auth-user-1" } as never,
    });

    expect(result).toEqual({ ok: true });
    expect(events).toContain(
      `resolve:${supabaseObject.provider}:${supabaseObject.storagePath}`,
    );
    expect(events).not.toContain(
      `resolve:${r2Object.provider}:${r2Object.storagePath}`,
    );
    expect(JSON.stringify(result)).not.toContain(r2Object.storagePath);
  });

  it("leaves provider objects intact when the transactional account delete fails", async () => {
    const events: string[] = [];
    const harness = createClient({
      deletion: { data: null, error: { code: "PGRST202" } },
      events,
    });

    await expect(
      deleteOwnAccount({
        client: harness.client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ code: "account_delete_failed", ok: false });

    expect(mocks.deleteFeedMediaObjects).not.toHaveBeenCalled();
    expect(events).toEqual(["remove-profile-avatar", "delete-account"]);
  });

  it("treats legacy media rows as Supabase objects during a provider-column rolling deploy", async () => {
    const events: string[] = [];
    const harness = createClient({
      deletion: { data: true, error: null },
      events,
      providerColumnMissing: true,
    });
    mocks.deleteFeedMediaObjects.mockResolvedValue({
      failedObjects: [],
      ok: true,
    });

    await expect(
      deleteOwnAccount({
        client: harness.client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ ok: true });

    expect(harness.mediaSelects).toEqual([
      "bucket_id,storage_path,storage_provider,storage_ready,deleted_at,storage_accounted",
      "bucket_id,storage_path,deleted_at",
    ]);
    expect(mocks.deleteFeedMediaObjects).toHaveBeenCalledWith({
      client: harness.client,
      objects: [supabaseObject],
    });
  });

  it("keeps the account and feed objects intact when profile storage removal fails", async () => {
    const events: string[] = [];
    const harness = createClient({
      deletion: { data: true, error: null },
      events,
      profileRemovalError: { message: "storage unavailable" },
    });

    await expect(
      deleteOwnAccount({
        client: harness.client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ code: "media_cleanup_failed", ok: false });

    expect(harness.deleteAccountRpc).not.toHaveBeenCalled();
    expect(mocks.deleteFeedMediaObjects).not.toHaveBeenCalled();
    expect(events).toEqual(["remove-profile-avatar"]);
  });

  it("defers hidden pending media to the trigger grace queue after account deletion", async () => {
    const events: string[] = [];
    const harness = createClient({
      deletion: { data: true, error: null },
      events,
      pendingPaths: [r2Object.storagePath],
    });
    mocks.deleteFeedMediaObjects.mockImplementation(
      async ({ objects }: { objects: typeof harness.feedObjects }) => {
        events.push("delete-provider-objects");
        expect(objects).toEqual([supabaseObject]);
        return { failedObjects: [], ok: true as const };
      },
    );

    await expect(
      deleteOwnAccount({
        client: harness.client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ ok: true });

    expect(harness.deleteAccountRpc).toHaveBeenCalledOnce();
    expect(harness.removeProfileAvatar).toHaveBeenCalledOnce();
    expect(events).toEqual([
      "remove-profile-avatar",
      "delete-account",
      "delete-provider-objects",
      `resolve:${supabaseObject.provider}:${supabaseObject.storagePath}`,
    ]);
    expect(harness.feedRpc).not.toHaveBeenCalledWith(
      "resolve_media_storage_cleanup",
      expect.objectContaining({ p_storage_path: r2Object.storagePath }),
    );
  });

  it("immediately deletes a soft-deleted object that had already activated", async () => {
    const events: string[] = [];
    const harness = createClient({
      deletion: { data: true, error: null },
      events,
      softDeletedPaths: [r2Object.storagePath],
    });
    mocks.deleteFeedMediaObjects.mockResolvedValue({
      failedObjects: [],
      ok: true,
    });

    await expect(
      deleteOwnAccount({
        client: harness.client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ ok: true });

    expect(mocks.deleteFeedMediaObjects).toHaveBeenCalledWith({
      client: harness.client,
      objects: [supabaseObject, r2Object],
    });
    expect(events).toContain(
      `resolve:${r2Object.provider}:${r2Object.storagePath}`,
    );
  });

  it("removes attachment-only legacy media before deleting the account", async () => {
    const events: string[] = [];
    const legacyPath = "legacy/post-1/old.webp";
    const harness = createClient({
      attachmentPayload: [{ storagePath: legacyPath }],
      deletion: { data: true, error: null },
      events,
    });
    mocks.deleteFeedMediaObjects.mockResolvedValue({
      failedObjects: [],
      ok: true,
    });

    await expect(
      deleteOwnAccount({
        client: harness.client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ ok: true });

    expect(harness.removeLegacyFeedMedia).toHaveBeenCalledWith([legacyPath]);
    expect(events.indexOf("remove-legacy-feed-media")).toBeLessThan(
      events.indexOf("delete-account"),
    );
  });

  it("preserves the account when attachment-only legacy cleanup fails", async () => {
    const events: string[] = [];
    const harness = createClient({
      attachmentPayload: [{ storagePath: "legacy/post-1/old.webp" }],
      deletion: { data: true, error: null },
      events,
      legacyRemovalError: { message: "storage unavailable" },
    });

    await expect(
      deleteOwnAccount({
        client: harness.client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ code: "media_cleanup_failed", ok: false });

    expect(harness.deleteAccountRpc).not.toHaveBeenCalled();
    expect(mocks.deleteFeedMediaObjects).not.toHaveBeenCalled();
    expect(events).toEqual([
      "remove-profile-avatar",
      "remove-legacy-feed-media",
    ]);
  });
});

function createClient({
  attachmentPayload = [],
  deletion,
  events,
  legacyRemovalError = null,
  pendingPaths = [],
  profileRemovalError = null,
  providerColumnMissing = false,
  softDeletedPaths = [],
}: {
  attachmentPayload?: unknown[];
  deletion: { data: boolean | null; error: unknown };
  events: string[];
  legacyRemovalError?: unknown;
  pendingPaths?: string[];
  profileRemovalError?: unknown;
  providerColumnMissing?: boolean;
  softDeletedPaths?: string[];
}) {
  const mediaSelects: string[] = [];
  const feedObjects = providerColumnMissing
    ? [supabaseObject]
    : [supabaseObject, r2Object];
  const deleteAccountRpc = vi.fn(async () => {
    events.push("delete-account");
    return deletion;
  });
  const feedRpc = vi.fn(
    async (functionName: string, args: Record<string, unknown>) => {
      const provider = String(args.p_storage_provider);
      const storagePath = String(args.p_storage_path);
      if (functionName === "resolve_media_storage_cleanup") {
        events.push(`resolve:${provider}:${storagePath}`);
        return { data: true, error: null };
      }
      throw new Error(`Unexpected feed RPC: ${functionName}`);
    },
  );
  const removeProfileAvatar = vi.fn(async () => {
    events.push("remove-profile-avatar");
    return { error: profileRemovalError };
  });
  const removeLegacyFeedMedia = vi.fn(async () => {
    events.push("remove-legacy-feed-media");
    return { error: legacyRemovalError };
  });
  const client = {
    rpc: deleteAccountRpc,
    schema: vi.fn((schema: string) => ({
      from: vi.fn((table: string) => {
        if (schema === "profile" && table === "community_profile") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    avatar_bucket: "profile-avatars",
                    avatar_object_path: "account-1/avatar.png",
                  },
                  error: null,
                })),
              })),
            })),
          };
        }

        if (schema === "feed" && table === "feed_post") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                range: vi.fn(async () => ({
                  data: [
                    { attachment_payload: attachmentPayload, id: "post-1" },
                  ],
                  error: null,
                })),
              })),
            })),
          };
        }

        if (schema === "feed" && table === "feed_post_media") {
          return {
            select: vi.fn((columns: string) => {
              mediaSelects.push(columns);
              return {
                in: vi.fn(async () => {
                  if (
                    providerColumnMissing &&
                    columns.includes("storage_provider")
                  ) {
                    return {
                      data: null,
                      error: {
                        code: "42703",
                        message: "column storage_provider does not exist",
                      },
                    };
                  }
                  return {
                    data: feedObjects.map((object) => ({
                      bucket_id: "feed-media",
                      deleted_at:
                        pendingPaths.includes(object.storagePath) ||
                        softDeletedPaths.includes(object.storagePath)
                          ? "2026-08-15T00:00:00.000Z"
                          : null,
                      storage_accounted: true,
                      storage_ready: !pendingPaths.includes(object.storagePath),
                      storage_path: object.storagePath,
                      ...(providerColumnMissing
                        ? {}
                        : { storage_provider: object.provider }),
                    })),
                    error: null,
                  };
                }),
              };
            }),
          };
        }

        throw new Error(`Unexpected table: ${schema}.${table}`);
      }),
      rpc: feedRpc,
    })),
    storage: {
      from: vi.fn((bucket: string) => ({
        remove:
          bucket === "feed-media" ? removeLegacyFeedMedia : removeProfileAvatar,
      })),
    },
  };

  return {
    client,
    deleteAccountRpc,
    feedObjects,
    feedRpc,
    mediaSelects,
    removeLegacyFeedMedia,
    removeProfileAvatar,
  };
}
