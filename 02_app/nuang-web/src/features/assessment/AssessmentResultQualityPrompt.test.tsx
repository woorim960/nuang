import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "test-session",
            user: { id: "10000000-0000-4000-8000-000000000002" },
          },
        },
      }),
    },
  }),
}));

import { AssessmentResultQualityPrompt } from "./AssessmentResultQualityPrompt";

describe("AssessmentResultQualityPrompt", () => {
  beforeEach(() => {
    const local = createMemoryStorage();
    const session = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: local,
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: session,
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("collects one lightweight fit signal and replaces the prompt with thanks", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AssessmentResultQualityPrompt
        assessmentSlug="comfort-style"
        instrumentVersion="comfort-style-v4"
        localResultId="topic-local-1"
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "대체로 맞아요" }),
    );

    expect(await screen.findByText(/답해 주셔서 고마워요/)).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(
      JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)),
    ).toMatchObject({
      assessmentSlug: "comfort-style",
      instrumentVersion: "comfort-style-v4",
      localResultId: "topic-local-1",
      observations: [{ fit: "middle", kind: "result_fit" }],
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
