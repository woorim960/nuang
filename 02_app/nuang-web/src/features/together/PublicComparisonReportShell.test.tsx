import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicComparisonReportShell } from "@/features/together/PublicComparisonReportShell";

describe("PublicComparisonReportShell", () => {
  it("shows the shared mascot loader for a valid report id", () => {
    render(
      <PublicComparisonReportShell comparisonReportId="33333333-3333-4333-8333-333333333333" />,
    );

    expect(screen.getByText("다음 화면을 준비하고 있어요")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("화면 연결 중");
    expect(document.body).not.toHaveTextContent(
      "33333333-3333-4333-8333-333333333333",
    );
  });

  it("shows format guidance for invalid report ids", () => {
    render(<PublicComparisonReportShell comparisonReportId={null} />);

    expect(
      screen.getByRole("heading", { name: "비교 링크를 다시 확인해 주세요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "내 리포트 보기" }),
    ).toHaveAttribute("href", "/my/reports");
  });
});
