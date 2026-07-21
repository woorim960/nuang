import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PublicComparisonReportPage, {
  metadata,
} from "@/app/reports/comparison/[comparisonReportId]/page";

describe("PublicComparisonReportPage", () => {
  it("keeps the pending comparison report page noindex and scope-limited", async () => {
    render(
      await PublicComparisonReportPage({
        params: Promise.resolve({
          comparisonReportId: "33333333-3333-4333-8333-333333333333",
        }),
      }),
    );

    expect(metadata.robots).toEqual({
      follow: false,
      index: false,
    });
    expect(screen.getByText("다음 화면을 준비하고 있어요")).toBeInTheDocument();
    expect(screen.getByText("화면 연결 중")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "공통점" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "차이점" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/원점수/)).not.toBeInTheDocument();
  });

  it("does not expose invalid report ids as report content", async () => {
    render(
      await PublicComparisonReportPage({
        params: Promise.resolve({ comparisonReportId: "not-a-report" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "비교 링크를 다시 확인해 주세요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/이 링크로는 비교 리포트를 찾기 어려워요/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "내 리포트 보기" }),
    ).toHaveAttribute("href", "/my/reports");
    expect(screen.queryByText("not-a-report")).not.toBeInTheDocument();
  });
});
