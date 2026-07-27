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

  it("does not remove media when the atomic account deletion fails", async () => {
    const { client, remove } = createClient({
      deletion: { data: null, error: { code: "PGRST202" } },
    });

    await expect(
      deleteOwnAccount({
        client: client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ code: "account_delete_failed", ok: false });

    expect(remove).not.toHaveBeenCalled();
  });

  it("deletes the account before removing owned media", async () => {
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

    expect(events).toEqual(["delete-account", "remove-media"]);
  });

  it("keeps account deletion successful when later media cleanup needs retry", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = createClient({
      deletion: { data: true, error: null },
      removalError: { message: "storage unavailable" },
    });

    await expect(
      deleteOwnAccount({
        client: client as never,
        user: { id: "auth-user-1" } as never,
      }),
    ).resolves.toEqual({ cleanupPending: true, ok: true });

    expect(errorSpy).toHaveBeenCalledWith(
      "Account deleted but owned media cleanup is pending.",
      { accountId: "account-1" },
    );
    errorSpy.mockRestore();
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
  const client = {
    rpc: vi.fn(async () => {
      events.push("delete-account");
      return deletion;
    }),
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

  return { client, remove };
}
