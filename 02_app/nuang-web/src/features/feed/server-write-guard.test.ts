import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { checkCommunityWriteGuard } from "@/features/feed/server-write-guard";

const accountId = "11111111-1111-4111-8111-111111111111";

describe("community write guard", () => {
  it("blocks writes when required policy consent is missing", async () => {
    const client = createClient({
      consent: null,
      guard: null,
    });

    await expect(
      checkCommunityWriteGuard({
        accountId,
        action: "react",
        client,
        target: {
          id: "22222222-2222-4222-8222-222222222222",
          key: null,
          type: "feed_post",
        },
      }),
    ).resolves.toBe("required_consent_missing");
  });

  it("allows the database guard to decide after required consent is confirmed", async () => {
    const client = createClient({
      consent: {
        required_privacy_version: "privacy.v0.1",
        required_terms_version: "terms.v0.1",
      },
      guard: null,
    });

    await expect(
      checkCommunityWriteGuard({
        accountId,
        action: "react",
        client,
        target: {
          id: "22222222-2222-4222-8222-222222222222",
          key: null,
          type: "feed_post",
        },
      }),
    ).resolves.toBeNull();
  });

  it("does not use the legacy age declaration as a general community gate", async () => {
    const client = createClient({
      consent: {
        is_14_or_older: false,
        required_privacy_version: "privacy.v0.1",
        required_terms_version: "terms.v0.1",
      },
      guard: null,
    });

    await expect(
      checkCommunityWriteGuard({
        accountId,
        action: "vote_poll",
        client,
        target: {
          id: "22222222-2222-4222-8222-222222222222",
          key: null,
          type: "feed_poll",
        },
      }),
    ).resolves.toBeNull();
  });

  it("fails closed when the database client does not expose the guard RPC", async () => {
    const client = createClient({
      consent: {
        required_privacy_version: "privacy.v0.1",
        required_terms_version: "terms.v0.1",
      },
      guard: undefined,
    });

    await expect(
      checkCommunityWriteGuard({
        accountId,
        action: "react",
        client,
        target: {
          id: "22222222-2222-4222-8222-222222222222",
          key: null,
          type: "feed_post",
        },
      }),
    ).resolves.toBe("guard_unavailable");
  });

  it("fails closed when the guard returns an unknown result", async () => {
    const client = createClient({
      consent: {
        required_privacy_version: "privacy.v0.1",
        required_terms_version: "terms.v0.1",
      },
      guard: "unexpected_guard_state",
    });

    await expect(
      checkCommunityWriteGuard({
        accountId,
        action: "bookmark",
        client,
        target: {
          id: null,
          key: "daily_mood_001",
          type: "feed_seed_card",
        },
      }),
    ).resolves.toBe("guard_unavailable");
  });

  it("uses the compatible safety guard while the target-aware migration is pending", async () => {
    const calls: string[] = [];
    const client = {
      schema(schema: string) {
        if (schema === "consent") {
          return {
            from() {
              return {
                select() {
                  return {
                    eq() {
                      return {
                        maybeSingle() {
                          return Promise.resolve({
                            data: {
                              required_privacy_version: "privacy.v0.1",
                              required_terms_version: "terms.v0.1",
                            },
                            error: null,
                          });
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        }

        return {
          rpc(name: string) {
            calls.push(name);
            if (name === "check_community_mutation_guard") {
              return Promise.resolve({
                data: null,
                error: { code: "PGRST202" },
              });
            }
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
    } as unknown as SupabaseClient;

    await expect(
      checkCommunityWriteGuard({
        accountId,
        action: "vote_poll",
        client,
        target: {
          id: "22222222-2222-4222-8222-222222222222",
          key: null,
          type: "feed_poll",
        },
      }),
    ).resolves.toBeNull();
    expect(calls).toEqual([
      "check_community_mutation_guard",
      "check_community_write_guard",
    ]);
  });
});

function createClient({
  consent,
  guard,
}: {
  consent: {
    is_14_or_older?: boolean;
    required_privacy_version: string;
    required_terms_version: string;
  } | null;
  guard: string | null | undefined;
}) {
  return {
    schema(schema: string) {
      if (schema === "consent") {
        return {
          from() {
            return {
              select() {
                return {
                  eq() {
                    return {
                      maybeSingle() {
                        return Promise.resolve({ data: consent, error: null });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (guard === undefined) return {};
      return {
        rpc() {
          return Promise.resolve({
            data: guard,
            error: null,
          });
        },
      };
    },
  } as unknown as SupabaseClient;
}
