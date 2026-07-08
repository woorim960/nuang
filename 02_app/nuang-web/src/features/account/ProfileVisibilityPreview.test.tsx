import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileVisibilityPreview } from "@/features/account/ProfileVisibilityPreview";

describe("ProfileVisibilityPreview", () => {
  it("shows the public/private defaults without enabling server save controls", () => {
    render(<ProfileVisibilityPreview />);

    expect(
      screen.getByRole("heading", { name: "비교에 쓰이는 정보만 열어요" }),
    ).toBeInTheDocument();
    expect(screen.getByText("4개")).toBeInTheDocument();
    expect(screen.getByText("8개")).toBeInTheDocument();
    expect(screen.getByText(/공개 범위 저장은 아직 열기 전이에요/)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "공개 범위 저장 준비 중" }),
    ).toBeDisabled();
  });

  it("keeps raw and sensitive profile surfaces private in the preview", () => {
    render(<ProfileVisibilityPreview />);

    expect(screen.getByText("직접 문항 응답")).toBeInTheDocument();
    expect(screen.getByText("원점수와 전체 점수 벡터")).toBeInTheDocument();
    expect(
      screen.getByText("위기·치료·성적 지향·약물 등 민감 검사"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("차단").length).toBeGreaterThanOrEqual(3);
  });
});
