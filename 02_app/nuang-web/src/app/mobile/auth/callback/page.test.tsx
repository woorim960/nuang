import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MobileAuthCallbackFallbackPage, {
  metadata,
} from "@/app/mobile/auth/callback/page";

describe("mobile OAuth callback fallback", () => {
  it("offers a safe web recovery without rendering credentials", () => {
    render(<MobileAuthCallbackFallbackPage />);

    expect(
      screen.getByRole("heading", {
        name: "뉴앙 앱에서 로그인을 마무리해 주세요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "웹에서 로그인하기" })).toHaveAttribute(
      "href",
      "/login?reason=mobile_auth_fallback",
    );
    expect(screen.getByText(/로그인 코드나 계정 정보/)).toBeInTheDocument();
  });

  it("keeps the callback out of search results", () => {
    expect(metadata.robots).toMatchObject({ follow: false, index: false });
    expect(metadata.referrer).toBe("no-referrer");
  });
});
