import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { readAccountAccessStatus } from "@/features/auth/server-account-access";

describe("readAccountAccessStatus", () => {
  it.each(["active", "new", "suspended", "deleted", "merged", "conflict"])(
    "returns the fail-closed database status %s",
    async (status) => {
      const rpc = vi.fn(async () => ({ data: status, error: null }));
      const client = {
        schema: vi.fn(() => ({ rpc })),
      } as unknown as SupabaseClient;

      await expect(
        readAccountAccessStatus({ client, supabaseUserId: "auth-user-1" }),
      ).resolves.toEqual({ ok: true, status });
      expect(rpc).toHaveBeenCalledWith("read_auth_user_access_status", {
        p_supabase_user_id: "auth-user-1",
      });
    },
  );

  it("does not accept an unknown database status", async () => {
    const client = {
      schema: vi.fn(() => ({
        rpc: vi.fn(async () => ({ data: "unexpected", error: null })),
      })),
    } as unknown as SupabaseClient;

    await expect(
      readAccountAccessStatus({ client, supabaseUserId: "auth-user-1" }),
    ).resolves.toEqual({ ok: false });
  });
});
