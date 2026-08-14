import { describe, expect, it } from "vitest";
import { mapClaimResultRpcError } from "@/features/account/server-writes";

describe("claim result RPC failure mapping", () => {
  it("maps only the deletion tombstone rejection to a terminal deleted result", () => {
    expect(
      mapClaimResultRpcError({
        code: "P0001",
        message: "persisted_result_deleted",
      }),
    ).toBe("result_deleted");

    expect(
      mapClaimResultRpcError({
        code: "P0001",
        message: "incomplete_existing_result_claim",
      }),
    ).toBe("result_report_write_failed");
    expect(
      mapClaimResultRpcError({
        code: "23505",
        message: "persisted_result_deleted",
      }),
    ).toBe("result_report_write_failed");
    expect(mapClaimResultRpcError(null)).toBe("result_report_write_failed");
  });
});
