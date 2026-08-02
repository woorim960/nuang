import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AccountSettingsPage from "@/app/my/settings/account/page";

vi.mock("@/features/account/AuthMethodsPanel", () => ({
  AuthMethodsPanel: () => <section>로그인 방법 패널</section>,
}));

vi.mock("@/features/account/PrivateContactEditor", () => ({
  PrivateContactEditor: () => <section>복구 연락처 패널</section>,
}));

describe("AccountSettingsPage", () => {
  it("keeps login methods and recovery contacts together without public-profile editing", () => {
    render(<AccountSettingsPage />);

    expect(
      screen.getByRole("heading", { name: "로그인 및 보안", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("로그인 방법 패널")).toBeInTheDocument();
    expect(screen.getByText("복구 연락처 패널")).toBeInTheDocument();
    expect(screen.queryByText("광고성 소식 받기")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /계정 삭제/ })).toHaveAttribute(
      "href",
      "/my/settings/account/delete",
    );
  });
});
