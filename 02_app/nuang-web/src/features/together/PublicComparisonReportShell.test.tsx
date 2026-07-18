import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicComparisonReportShell } from "@/features/together/PublicComparisonReportShell";

describe("PublicComparisonReportShell", () => {
  it("shows lookup pending guidance for a valid report id without fake result content", () => {
    render(
      <PublicComparisonReportShell comparisonReportId="33333333-3333-4333-8333-333333333333" />,
    );

    expect(screen.getByText("조회 준비 중")).toBeInTheDocument();
    expect(screen.getByText("33333333-3333-4333-8333-333333333333")).toBeInTheDocument();
    expect(screen.getByText(/비교 리포트 조회는 아직 열기 전이에요/)).toBeInTheDocument();
    expect(screen.getByText("내가 만든 리포트만 조회")).toBeInTheDocument();
    expect(screen.getByText("공개 범위 다시 확인")).toBeInTheDocument();
    expect(screen.getByText("비공개 추정 없음")).toBeInTheDocument();
    expect(screen.queryByText("공통점")).not.toBeInTheDocument();
    expect(screen.queryByText("차이점")).not.toBeInTheDocument();
  });

  it("shows format guidance for invalid report ids", () => {
    render(<PublicComparisonReportShell comparisonReportId={null} />);

    expect(screen.getByText("형식 확인 필요")).toBeInTheDocument();
    expect(screen.getByText("유효하지 않은 비교 링크")).toBeInTheDocument();
    expect(screen.getByText(/비교 리포트 링크 형식을 확인해 주세요/)).toBeInTheDocument();
  });
});
