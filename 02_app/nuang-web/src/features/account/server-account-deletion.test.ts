import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureAccountForUser: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccountForUser,
}));

import { deleteOwnAccount } from "@/features/account/server-account-deletion";

describe("deleteOwnAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureAccountForUser.mockResolvedValue({
      accountId: "account-1",
      ok: true,
    });
  });

  it("removes owned media before atomically deleting the account", async () => {
    const events: string[] = [];
    const { client, remove } = createClient({
      deletion: { data: null, error: { code: "PGRST202" } },
      events,
    });

    await expect(
      deleteOwnAccount({
        client: client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ code: "account_delete_failed", ok: false });

    expect(events).toEqual(["remove-media", "delete-account"]);
    expect(remove).toHaveBeenCalledWith(["account-1/avatar.png"]);
  });

  it("deletes the account only after all owned media is removed", async () => {
    const events: string[] = [];
    const { client } = createClient({
      deletion: { data: true, error: null },
      events,
    });

    await expect(
      deleteOwnAccount({
        client: client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ ok: true });

    expect(events).toEqual(["remove-media", "delete-account"]);
  });

  it("keeps the account when owned media cleanup fails", async () => {
    const events: string[] = [];
    const { client, rpc } = createClient({
      deletion: { data: true, error: null },
      events,
      removalError: { message: "storage unavailable" },
    });

    await expect(
      deleteOwnAccount({
        client: client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ code: "media_cleanup_failed", ok: false });

    expect(events).toEqual(["remove-media"]);
    expect(rpc).not.toHaveBeenCalled();
  });
});

function createClient({
  deletion,
  events = [],
  removalError = null,
}: {
  deletion: { data: boolean | null; error: unknown };
  events?: string[];
  removalError?: unknown;
}) {
  const remove = vi.fn(async () => {
    events.push("remove-media");
    return { error: removalError };
  });
  const rpc = vi.fn(async () => {
    events.push("delete-account");
    return deletion;
  });
  const client = {
    rpc,
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
                range: vi.fn(async () => ({ data: [], error: null })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${schema}.${table}`);
      }),
    })),
    storage: {
      from: vi.fn(() => ({ remove })),
    },
  };

  return { client, remove, rpc };
}
