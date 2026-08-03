import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueAssessmentQualityObservations } from "./assessment-quality-client";

describe("assessment quality analytics queue", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("drops a queued observation when the server denies analytics consent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal("fetch", fetchMock);

    enqueueAssessmentQualityObservations({
      assessmentSlug: "comfort-style",
      instrumentVersion: "comfort-style-v4",
      localResultId: "topic-local-1",
      observations: [{ fit: "middle", kind: "result_fit" }],
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(
        localStorage.getItem("nuang:assessment-quality-queue:v1"),
      ).toBeNull(),
    );
  });

  it("keeps a queued observation after a transient server failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    enqueueAssessmentQualityObservations({
      assessmentSlug: "comfort-style",
      instrumentVersion: "comfort-style-v4",
      observations: [{ fit: "low", kind: "result_fit" }],
    });

    await waitFor(() =>
      expect(
        localStorage.getItem("nuang:assessment-quality-queue:v1"),
      ).not.toBeNull(),
    );
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}
