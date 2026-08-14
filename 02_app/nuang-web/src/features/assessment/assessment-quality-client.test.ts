import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { getSession: authMocks.getSession },
  }),
}));

import { enqueueAssessmentQualityObservations } from "./assessment-quality-client";

describe("assessment quality analytics queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-session",
          user: { id: "10000000-0000-4000-8000-000000000002" },
        },
      },
    });
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

  it("does not send or retain a signed-out viewer's observations", async () => {
    authMocks.getSession.mockResolvedValueOnce({ data: { session: null } });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    enqueueAssessmentQualityObservations({
      assessmentSlug: "comfort-style",
      instrumentVersion: "comfort-style-v4",
      observations: [{ fit: "middle", kind: "result_fit" }],
    });

    await waitFor(() => expect(authMocks.getSession).toHaveBeenCalledOnce());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      localStorage.getItem("nuang:assessment-quality-queue:v1"),
    ).toBeNull();
  });

  it("discards legacy or another account's queue instead of sending it as the current account", async () => {
    localStorage.setItem(
      "nuang:assessment-quality-queue:v1",
      JSON.stringify([
        {
          assessmentSlug: "comfort-style",
          clientSessionId: "10000000-0000-4000-8000-000000000001",
          instrumentVersion: "comfort-style-v4",
          observations: [{ fit: "middle", kind: "result_fit" }],
          ownerSupabaseUserId: "10000000-0000-4000-8000-000000000099",
          queuedAt: new Date().toISOString(),
          submissionId: "20000000-0000-4000-8000-000000000001",
        },
        {
          assessmentSlug: "comfort-style",
          clientSessionId: "10000000-0000-4000-8000-000000000001",
          instrumentVersion: "comfort-style-v4",
          observations: [{ fit: "middle", kind: "result_fit" }],
          queuedAt: new Date().toISOString(),
          submissionId: "20000000-0000-4000-8000-000000000002",
        },
      ]),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { flushAssessmentQualityObservationQueue } =
      await import("./assessment-quality-client");
    await flushAssessmentQualityObservationQueue();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      localStorage.getItem("nuang:assessment-quality-queue:v1"),
    ).toBeNull();
  });

  it("binds a queued request to the authenticated Supabase user", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal("fetch", fetchMock);

    enqueueAssessmentQualityObservations({
      assessmentSlug: "comfort-style",
      instrumentVersion: "comfort-style-v4",
      observations: [{ fit: "high", kind: "result_fit" }],
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        "x-nuang-auth-user-id": "10000000-0000-4000-8000-000000000002",
      }),
    });
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
