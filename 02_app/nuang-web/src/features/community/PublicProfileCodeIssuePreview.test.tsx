import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  publicProfileCodeExample,
  PublicProfileCodeIssuePreview,
} from "@/features/community/PublicProfileCodeIssuePreview";

describe("PublicProfileCodeIssuePreview", () => {
  it("shows the example code and keeps issue controls disabled", () => {
    render(<PublicProfileCodeIssuePreview />);

    expect(screen.getByText(publicProfileCodeExample)).toBeInTheDocument();
    expect(screen.getByText("사용자별 unique 코드")).toBeInTheDocument();
    expect(screen.getByText("대표 성향 코드와 별도")).toBeInTheDocument();
    expect(
      screen.getByText(/공개 프로필 코드 발급은 아직 열기 전이에요/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "공개 프로필 코드 발급 준비 중" }),
    ).toBeDisabled();
  });
});
