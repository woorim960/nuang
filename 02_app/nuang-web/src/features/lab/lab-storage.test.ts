import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteLabResult,
  listLabResults,
  loadLabResult,
  loadLabResultById,
  saveLabResult,
  syncLabResult,
} from "@/features/lab/lab-storage";

const slug = "conversation-temperature";

describe("lab result history storage", () => {
  beforeEach(() => {
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

    expect(listLabResults([slug]).map((result) => result.localResultId)).toEqual(
      ["lab_attempt_second", "lab_attempt_first"],
    );
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
    expect(synced).toMatchObject({
      localResultId: "lab_attempt_sync",
      serverResultId: "22222222-2222-4222-8222-222222222222",
      sync: { status: "synced" },
    });
    expect(listLabResults([slug])).toHaveLength(1);
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
