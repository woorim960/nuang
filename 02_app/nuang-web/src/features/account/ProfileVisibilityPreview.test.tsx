import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileVisibilityPreview } from "@/features/account/ProfileVisibilityPreview";

describe("ProfileVisibilityPreview", () => {
  it("shows the public/private defaults as a read-only overview", () => {
    render(<ProfileVisibilityPreview />);

    expect(
      screen.getByRole("heading", { name: "공개 범위" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/공개 4개/)).toBeInTheDocument();
    expect(screen.getByText(/비공개 8개/)).toBeInTheDocument();
    expect(screen.getByText("공개되는 정보")).toBeInTheDocument();
    expect(screen.getByText(/공개 범위를 직접 바꾸는 기능은 준비 중이에요/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps raw and sensitive profile surfaces private in the preview", () => {
    render(<ProfileVisibilityPreview />);

    expect(screen.getByText("직접 문항 응답")).toBeInTheDocument();
    expect(screen.getByText("원점수와 전체 점수 벡터")).toBeInTheDocument();
    expect(
      screen.getByText("위기·치료·성적 지향·약물 등 민감 검사"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("항상 비공개").length).toBeGreaterThanOrEqual(3);
  });
});
