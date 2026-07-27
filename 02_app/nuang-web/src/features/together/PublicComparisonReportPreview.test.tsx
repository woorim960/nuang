import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicComparisonReportPreview } from "@/features/together/PublicComparisonReportPreview";

describe("PublicComparisonReportPreview", () => {
  it("offers a safe recovery path without exposing a partial report", () => {
    render(<PublicComparisonReportPreview />);

    expect(
      screen.getByRole("heading", { name: "비교 리포트를 만들 수 없어요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("두 사람의 공개 범위를 확인한 후 다시 시도해 주세요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 리포트로" })).toHaveAttribute(
      "href",
      "/my/reports",
    );
    expect(document.body).not.toHaveTextContent("비교 생성 준비 상태");
    expect(document.body).not.toHaveTextContent("score_payload");
  });
});
