import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { readGateCAnalysisDashboard } from "@/features/research/gate-c/gate-c-analysis-dashboard";

describe("Gate C analysis dashboard read model", () => {
  it("returns only aggregate session counts and sorted item signals", async () => {
    const client = createClient({
      queue: [
        {
          metrics: { unsureRate: 0 },
          observation_count: 8,
          reason_codes: [],
          recommendation_status: "monitor",
          study_item_id: "ITEM-B",
          updated_at: "2026-07-21T00:00:00.000Z",
        },
        {
          metrics: { wordingUnclearRate: 0.25 },
          observation_count: 8,
          reason_codes: ["WORDING_REVIEW"],
          recommendation_status: "review_required",
          study_item_id: "ITEM-A",
          updated_at: "2026-07-21T00:00:00.000Z",
        },
      ],
      sessions: [
        { form_id: "FORM_A", quality_status: "included", status: "completed" },
        { form_id: "FORM_A", quality_status: "excluded", status: "completed" },
        { form_id: "FORM_B", quality_status: "pending", status: "started" },
      ],
      snapshot: { generated_at: "2026-07-21T00:00:00.000Z" },
    });

    const data = await readGateCAnalysisDashboard(client);

    expect(data.sessionCounts).toEqual({
      completed: 2,
      excluded: 1,
      included: 1,
      started: 3,
    });
    expect(data.formCompletionCounts.FORM_A).toBe(2);
    expect(data.formCompletionCounts.FORM_B).toBe(0);
    expect(data.queue.map((row) => row.studyItemId)).toEqual([
      "ITEM-A",
      "ITEM-B",
    ]);
    expect(data.queueCounts).toEqual({
      insufficientData: 0,
      monitor: 1,
      reviewRequired: 1,
    });
    expect(JSON.stringify(data)).not.toMatch(
      /participant|age_band|life_context/,
    );
  });
});

function createClient({
  queue,
  sessions,
  snapshot,
}: {
  queue: unknown[];
  sessions: unknown[];
  snapshot: unknown;
}) {
  return {
    from(tableName: string) {
      if (tableName === "research_gate_c_analysis_snapshot") {
        const builder = {
          limit: () => builder,
          maybeSingle: async () => ({ data: snapshot, error: null }),
          order: () => builder,
          select: () => builder,
        };
        return builder;
      }

      if (tableName === "research_gate_c_item_review_queue") {
        return {
          select: () => ({
            limit: async () => ({ data: queue, error: null }),
          }),
        };
      }

      const builder = {
        limit: async () => ({ data: sessions, error: null }),
        order: () => builder,
        select: () => builder,
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}
