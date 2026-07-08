import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TogetherPage from "@/app/(tabs)/together/page";

vi.mock("@/features/together/TogetherReadiness", () => ({
  TogetherReadiness: () => (
    <section aria-label="public-comparison-readiness">public comparison</section>
  ),
}));

vi.mock("@/features/community/CommunityReadFeed", () => ({
  CommunityReadFeed: () => (
    <section aria-label="community-read-feed">read feed</section>
  ),
}));

vi.mock("@/features/community/CommunityPreviewFeed", () => ({
  CommunityPreviewFeed: () => (
    <section aria-label="community-preview-feed">community preview</section>
  ),
}));

vi.mock("@/features/community/CommunityComposerPreview", () => ({
  CommunityComposerPreview: () => (
    <section aria-label="community-composer-preview">composer preview</section>
  ),
}));

describe("TogetherPage", () => {
  it("prioritizes public comparison and read-only feed before composer preview", () => {
    render(<TogetherPage />);

    const comparison = screen.getByLabelText("public-comparison-readiness");
    const readFeed = screen.getByLabelText("community-read-feed");
    const previewFeed = screen.getByLabelText("community-preview-feed");
    const composer = screen.getByLabelText("community-composer-preview");

    expect(comparison.compareDocumentPosition(readFeed)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(readFeed.compareDocumentPosition(previewFeed)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(previewFeed.compareDocumentPosition(composer)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("shows the together route cards in MVP order", () => {
    render(<TogetherPage />);

    const routeLabels = screen
      .getAllByRole("link")
      .slice(0, 3)
      .map((link) => link.textContent);

    expect(routeLabels[0]).toContain("공개 비교");
    expect(routeLabels[1]).toContain("읽기 피드");
    expect(routeLabels[2]).toContain("글쓰기 준비");
    expect(
      screen.getByRole("link", {
        name: "먼저 공개 비교: 공개 범위 안에서 바로 비교 준비",
      }),
    ).toHaveAttribute("href", "#public-comparison");
    expect(
      screen.getByRole("link", {
        name: "닫힘 글쓰기 준비: 게시 전 안전 조건만 확인",
      }),
    ).toHaveAttribute("href", "#write-preview");
  });
});
