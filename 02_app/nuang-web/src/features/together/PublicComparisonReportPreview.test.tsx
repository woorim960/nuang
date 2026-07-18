import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicComparisonReportPreview } from "@/features/together/PublicComparisonReportPreview";

describe("PublicComparisonReportPreview", () => {
  it("shows comparison sections without opening the server report", () => {
    render(<PublicComparisonReportPreview />);

    expect(screen.getByRole("heading", { name: "공개 범위 안에서만 비교해요" })).toBeInTheDocument();
    expect(screen.getByText("비교 생성 준비 상태")).toBeInTheDocument();
    expect(screen.getByText("상대 공개 범위 재평가")).toBeInTheDocument();
    expect(screen.getByText("궁합 점수 없음")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "핵심 요약" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "뉴앙 코드 비교" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "대화 가이드" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "조율 가이드" })).toBeInTheDocument();
  });
});
