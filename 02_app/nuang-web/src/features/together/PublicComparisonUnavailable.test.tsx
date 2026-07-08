import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  isPublicComparisonBlockedStatus,
  PublicComparisonUnavailable,
} from "@/features/together/PublicComparisonUnavailable";

describe("PublicComparisonUnavailable", () => {
  it("renders stale comparison guidance without exposing report payloads", () => {
    render(<PublicComparisonUnavailable status="stale" />);

    expect(
      screen.getByRole("heading", { name: "비교 리포트를 다시 확인해야 해요" }),
    ).toBeInTheDocument();
    expect(screen.getByText("재확인 필요")).toBeInTheDocument();
    expect(screen.getByText("민감 항목 추정 없음")).toBeInTheDocument();
    expect(screen.getByText("궁합 점수 없음")).toBeInTheDocument();
  });

  it("renders disabled and deleted states with distinct copy", () => {
    const { rerender } = render(<PublicComparisonUnavailable status="disabled" />);

    expect(
      screen.getByRole("heading", { name: "현재 열 수 없는 비교 리포트예요" }),
    ).toBeInTheDocument();

    rerender(<PublicComparisonUnavailable status="deleted" />);

    expect(
      screen.getByRole("heading", { name: "삭제된 비교 리포트예요" }),
    ).toBeInTheDocument();
  });

  it("recognizes only blocked comparison access statuses", () => {
    expect(isPublicComparisonBlockedStatus("stale")).toBe(true);
    expect(isPublicComparisonBlockedStatus("disabled")).toBe(true);
    expect(isPublicComparisonBlockedStatus("deleted")).toBe(true);
    expect(isPublicComparisonBlockedStatus("active")).toBe(false);
    expect(isPublicComparisonBlockedStatus("unknown")).toBe(false);
  });
});
