import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminTraitMapGuideReviewPage from "@/app/admin/content/trait-map/page";

vi.mock("@/features/admin/server-admin-access", () => ({
  resolveAdminContext: async () => ({
    client: {},
    email: "operator@example.com",
    ok: true,
  }),
}));

vi.mock("@/features/admin/server-admin-trait-map-guide", () => ({
  readAdminTraitMapGuideEditingState: async () => ({
    available: true,
    edits: [],
  }),
  readAdminTraitMapGuideHumanReview: async () => ({
    available: true,
    decisions: [],
    deployments: [],
    profiles: [],
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("AdminTraitMapGuideReviewPage", () => {
  it("renders the profile, chapter and sentence-level seven-role queue", async () => {
    render(
      await AdminTraitMapGuideReviewPage({
        searchParams: Promise.resolve({
          chapter: "chapter-01",
          code: "ENAKQ",
          page: "1",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "성향지도 문장 검수" }),
    ).toBeInTheDocument();
    expect(screen.getByText("AI 승인 프로필")).toBeInTheDocument();
    expect(screen.getByText("32 / 32")).toBeInTheDocument();
    expect(screen.getAllByText("성격심리").length).toBeGreaterThan(0);
    expect(screen.getAllByText("성향검사 범위").length).toBeGreaterThan(0);
    expect(screen.getAllByText("쉬운 한국어").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "프로필 최종 승인" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "보이는 화면에서 바로 고쳐요" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /편집:/ }).length,
    ).toBeGreaterThan(20);
  });
});
