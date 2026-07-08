import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MyPage from "@/app/(tabs)/my/page";

vi.mock("@/features/account/LocalResultManager", () => ({
  LocalResultManager: () => (
    <section aria-label="local-result-manager">local results</section>
  ),
}));

vi.mock("@/features/account/ProfileVisibilityPreview", () => ({
  ProfileVisibilityPreview: () => (
    <section aria-label="profile-visibility-preview">visibility preview</section>
  ),
}));

vi.mock("@/features/consent/AccountConnectPanel", () => ({
  AccountConnectPanel: () => (
    <section aria-label="account-connect-panel">account connect</section>
  ),
}));

vi.mock("@/features/community/PublicProfileCodeIssuePreview", () => ({
  PublicProfileCodeIssuePreview: () => (
    <section aria-label="public-profile-code-preview">public profile code</section>
  ),
}));

describe("MyPage", () => {
  it("prioritizes local results and visibility before account connection", () => {
    render(<MyPage />);

    const localResults = screen.getByLabelText("local-result-manager");
    const visibility = screen.getByLabelText("profile-visibility-preview");
    const accountConnect = screen.getByLabelText("account-connect-panel");
    const publicCode = screen.getByLabelText("public-profile-code-preview");

    expect(localResults.compareDocumentPosition(visibility)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(visibility.compareDocumentPosition(accountConnect)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(accountConnect.compareDocumentPosition(publicCode)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("shows the route cards in the same order", () => {
    render(<MyPage />);

    const routeLabels = screen
      .getAllByRole("link")
      .slice(0, 3)
      .map((link) => link.textContent);

    expect(routeLabels[0]).toContain("내 결과");
    expect(routeLabels[1]).toContain("공개 범위");
    expect(routeLabels[2]).toContain("계정 연결");
    expect(document.body).not.toHaveTextContent("MVP");
  });
});
