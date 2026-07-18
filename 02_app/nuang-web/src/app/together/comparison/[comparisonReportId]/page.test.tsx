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
    expect(screen.getByText("조회 준비 중")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "아직 비교 리포트를 열 수 없어요" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/임의 결과를 보여주지 않아요/)).toBeInTheDocument();
    expect(screen.getByText("내가 만든 리포트만 조회")).toBeInTheDocument();
    expect(screen.getByText("공개 범위 다시 확인")).toBeInTheDocument();
    expect(screen.getByText("비공개 추정 없음")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "공통점" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "차이점" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 리포트로" })).toHaveAttribute(
      "href",
      "/my/reports",
    );
  });

  it("does not expose invalid report ids as report content", async () => {
    render(
      await PublicComparisonReportPage({
        params: Promise.resolve({ comparisonReportId: "not-a-report" }),
      }),
    );

    expect(screen.getByText("형식 확인 필요")).toBeInTheDocument();
    expect(screen.getByText("유효하지 않은 비교 링크")).toBeInTheDocument();
    expect(screen.getByText(/비교 리포트 링크 형식을 확인해 주세요/)).toBeInTheDocument();
    expect(screen.queryByText("not-a-report")).not.toBeInTheDocument();
  });
});
