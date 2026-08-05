import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResearchPage from "@/app/research/page";

const pageMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: pageMocks.redirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: pageMocks.getUser },
  })),
}));

vi.mock("@/features/research/gate-c/gate-c-reward-campaign-server", () => ({
  readGateCReviewRewardCampaign: vi.fn(() => ({ status: "details_pending" })),
}));

vi.mock("@/features/research/gate-c/GateCPublicStudy", () => ({
  GateCPublicStudy: () => <div>검사 질문 리뷰 화면</div>,
}));

describe("ResearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageMocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects a signed-out visitor to login and preserves the source", async () => {
    pageMocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      ResearchPage({
        searchParams: Promise.resolve({ from: "assessments" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(pageMocks.redirect).toHaveBeenCalledWith(
      "/login?next=%2Fresearch%3Ffrom%3Dassessments&reason=research",
    );
  });

  it("preserves a reward resume intent through login", async () => {
    pageMocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      ResearchPage({
        searchParams: Promise.resolve({ reward: "resume" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(pageMocks.redirect).toHaveBeenCalledWith(
      "/login?next=%2Fresearch%3Freward%3Dresume&reason=research",
    );
  });

  it("renders the study for a signed-in member", async () => {
    pageMocks.getUser.mockResolvedValue({ data: { user: { id: "member" } } });

    render(await ResearchPage({}));

    expect(screen.getByText("검사 질문 리뷰 화면")).toBeInTheDocument();
    expect(pageMocks.redirect).not.toHaveBeenCalled();
  });
});
