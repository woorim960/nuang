import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MySettingsPage from "@/app/my/settings/page";

describe("MySettingsPage", () => {
  it("shows only working destinations and keeps account details on a separate page", () => {
    render(<MySettingsPage />);

    expect(
      screen.queryByRole("link", { name: /프로필 편집/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /공개 정보/ })).toHaveAttribute(
      "href",
      "/my/settings/visibility",
    );
    expect(
      screen.getByRole("link", { name: /로그인 및 보안/ }),
    ).toHaveAttribute("href", "/my/settings/account");
    expect(
      screen.getByRole("link", { name: /데이터 및 알림/ }),
    ).toHaveAttribute("href", "/my/settings/notifications");
    expect(screen.getByRole("link", { name: /차단한 프로필/ })).toHaveAttribute(
      "href",
      "/my/settings/blocked",
    );
    expect(
      screen.getByRole("link", { name: /광고·제휴 문의/ }),
    ).toHaveAttribute("href", "/advertise");
    expect(screen.queryByText("로그아웃")).not.toBeInTheDocument();
  });
});
