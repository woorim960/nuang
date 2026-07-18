import type { SupabaseClient, User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { deleteResultForAccount } from "@/features/account/server-writes";

describe("delete result server write", () => {
  it("delegates owned result cleanup to the transactional database routine", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          deleted: true,
          deleted_local_result_id: "local_test_123",
          deleted_result_report_id: "22222222-2222-4222-8222-222222222222",
        },
      ],
      error: null,
    });
    const client = createClient(rpc);

    const result = await deleteResultForAccount({
      client,
      payload: {
        localResultId: "local_test_123",
        resultReportId: "22222222-2222-4222-8222-222222222222",
      },
      user: { id: "user-1" } as User,
    });

    expect(rpc).toHaveBeenCalledWith("delete_result_for_account", {
      p_account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      p_local_result_id: "local_test_123",
      p_result_report_id: "22222222-2222-4222-8222-222222222222",
    });
    expect(result).toEqual({
      data: {
        deleted: true,
        localResultId: "local_test_123",
        resultReportId: "22222222-2222-4222-8222-222222222222",
      },
      ok: true,
    });
  });
});

function createClient(rpc: ReturnType<typeof vi.fn>) {
  const identityResponse = {
    data: { account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    error: null,
  };
  const identityBuilder = {
    eq: () => identityBuilder,
    is: () => identityBuilder,
    limit: () => identityBuilder,
    maybeSingle: async () => identityResponse,
    order: () => identityBuilder,
    select: () => identityBuilder,
  };

  return {
    schema(schemaName: string) {
      if (schemaName === "report") {
        return { rpc };
      }

      return {
        from: () => identityBuilder,
      };
    },
  } as unknown as SupabaseClient;
}
