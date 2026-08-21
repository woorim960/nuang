import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  candidateResultView: vi.fn(() => null),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/features/result/CandidateCoreResultView", () => ({
  CandidateCoreResultView: mocks.candidateResultView,
}));

import EnakqResultPreviewPage from "./page";

describe("EnakqResultPreviewPage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("fails closed with notFound outside development", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => EnakqResultPreviewPage()).toThrowError("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("renders the internal ENAKQ preview in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    const result = EnakqResultPreviewPage();

    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(result.type).toBe(mocks.candidateResultView);
    expect(result.props.attempt).toMatchObject({
      assessmentId: "nu-core-full",
      id: "local_enakq_result_preview",
      state: "completed",
    });
  });
});
