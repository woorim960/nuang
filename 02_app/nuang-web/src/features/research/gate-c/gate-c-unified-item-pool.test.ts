import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  createUnifiedGateCAssignment,
  gateCCandidateBankId,
} from "@/features/research/gate-c/gate-c-unified-item-pool";

describe("unified Gate C item assignment", () => {
  it("mixes current quick, current full-only and candidate items in a 4/4/4 session", async () => {
    const assignment = await createUnifiedGateCAssignment({
      client: createCandidateClient(),
      random: () => 0.42,
    });
    const sourceCounts = assignment.reduce<Record<string, number>>(
      (counts, item) => ({
        ...counts,
        [item.sourceKind]: (counts[item.sourceKind] ?? 0) + 1,
      }),
      {},
    );

    expect(assignment).toHaveLength(12);
    expect(new Set(assignment.map((item) => item.studyItemId))).toHaveLength(
      12,
    );
    expect(assignment.map((item) => item.orderIndex)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(sourceCounts).toEqual({
      candidate: 4,
      full_current: 4,
      quick_current: 4,
    });
  });

  it("prioritizes less exposed items within each source", async () => {
    const baseline = await createUnifiedGateCAssignment({
      client: createCandidateClient(),
      random: () => 0.42,
    });
    const exposureCounts = new Map(
      baseline.map((item) => [item.studyItemId, 100]),
    );
    const next = await createUnifiedGateCAssignment({
      client: createCandidateClient(),
      exposureCounts,
      random: () => 0.42,
    });

    expect(next.some((item) => exposureCounts.has(item.studyItemId))).toBe(
      false,
    );
  });
});

function createCandidateClient() {
  const revisions = Array.from({ length: 16 }, (_, index) => ({
    context_label: `후보 상황 ${index + 1}`,
    domain_id: ["SE", "OE", "RO", "SM", "ER"][index % 5],
    facet_id: ["SE-RE", "OE-CI", "RO-EC", "SM-EP", "ER-IR"][index % 5],
    item_revision_id: `NX-TEST-${String(index + 1).padStart(3, "0")}`,
    metadata: { selectedForBeta: false },
    prompt_text: `후보 질문 ${index + 1}`,
  }));
  const members = revisions.map((row) => ({
    item_revision_id: row.item_revision_id,
  }));

  return {
    schema: (schema: string) => {
      expect(schema).toBe("assessment");
      return {
        from: (table: string) => {
          const rows = table === "item_release_member" ? members : revisions;
          const builder = {
            eq: (column: string, value: string) => {
              expect(column).toBe("item_bank_release_id");
              expect(value).toBe(gateCCandidateBankId);
              return builder;
            },
            in: () => builder,
            limit: async () => ({ data: rows, error: null }),
            select: () => builder,
          };
          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;
}
