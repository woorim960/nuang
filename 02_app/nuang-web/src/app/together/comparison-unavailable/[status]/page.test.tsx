import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PublicComparisonUnavailablePage, {
  generateStaticParams,
  metadata,
} from "@/app/together/comparison-unavailable/[status]/page";

describe("PublicComparisonUnavailablePage", () => {
  it("keeps blocked comparison pages noindex and privacy-safe", async () => {
    render(
      await PublicComparisonUnavailablePage({
        params: Promise.resolve({ status: "disabled" }),
      }),
    );

    expect(metadata.robots).toEqual({
      follow: false,
      index: false,
    });
    expect(
      screen.getByRole("heading", { name: "현재 열 수 없는 비교 리포트예요" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/비공개 항목은 추정하지 않습니다/)).toBeInTheDocument();
    expect(screen.getByText("직접 응답·원점수 미공개")).toBeInTheDocument();
    expect(screen.getByText("민감 항목 추정 없음")).toBeInTheDocument();
    expect(screen.getByText("궁합 점수 없음")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "공통점" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "차이점" })).not.toBeInTheDocument();
  });

  it("prebuilds only supported blocked statuses", () => {
    expect(generateStaticParams()).toEqual([
      { status: "stale" },
      { status: "disabled" },
      { status: "deleted" },
    ]);
  });
});
