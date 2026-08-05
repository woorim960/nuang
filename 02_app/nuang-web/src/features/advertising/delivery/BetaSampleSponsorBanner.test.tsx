import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BetaSampleSponsorBanner } from "./BetaSampleSponsorBanner";

describe("BetaSampleSponsorBanner", () => {
  it("marks the beta creative as an example and links to the advertising guide", () => {
    render(<BetaSampleSponsorBanner />);

    expect(screen.getByRole("region", { name: "광고 예시" })).toBeVisible();
    expect(screen.getByText("광고 · 예시")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "뉴앙 광고 안내 보기" }),
    ).toHaveAttribute("href", "/advertise");
    expect(screen.getByText("베타 화면 미리보기")).toBeVisible();

    const artwork = screen.getByAltText(
      "따뜻한 빛 아래 자두색 차와 차분한 도자기가 놓인 광고 예시",
    );
    expect(artwork).toHaveAttribute("loading", "lazy");
    expect(artwork.getAttribute("src")).toContain(
      "nuang-beta-sample-plum-tea-v1.webp",
    );
  });

  it("keeps the compact preview variant free of the home-feed divider", () => {
    render(<BetaSampleSponsorBanner preview />);

    expect(screen.getByRole("region", { name: "광고 예시" })).toHaveAttribute(
      "data-preview",
      "true",
    );
  });
});
