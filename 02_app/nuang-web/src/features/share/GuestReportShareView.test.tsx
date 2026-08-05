import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GuestReportShareView } from "@/features/share/GuestReportShareView";
import type { ReportShareContent } from "@/features/share/report-share-contract";

vi.mock("@/features/share/ReportShareSheet", () => ({
  ReportShareSheet: () => null,
}));

describe("GuestReportShareView", () => {
  it("renders every approved detail section without exposing raw answers", () => {
    const content: ReportShareContent = {
      contentVersion: "report-share-v2",
      highlights: ["책임을 먼저 말하는 편이에요."],
      reportType: "topic",
      resultName: "책임과 다음 행동을 또렷하게 말해요",
      sections: [
        {
          description: "사과할 때 자주 보인 순서를 정리했어요.",
          id: "detail-1",
          items: [
            {
              label: "드러나는 강점",
              text: "상대가 먼저 궁금해하는 책임을 분명히 알려줘요.",
              value: "75점",
            },
          ],
          title: "사과를 시작하는 방식",
        },
        {
          description: "다음 대화에서 바로 써볼 수 있는 문장이에요.",
          id: "detail-2",
          title: "가까운 사람에게 보여줄 한 문장",
        },
      ],
      summary: "잘못한 부분을 짚고 다음 행동까지 말하는 편이에요.",
      title: "사과 방식 결과",
    };

    render(
      <GuestReportShareView
        canonicalUrl="https://nuang.app/share/example"
        content={content}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "결과를 더 자세히 보기" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2개 항목")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "사과를 시작하는 방식" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "가까운 사람에게 보여줄 한 문장",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/답변 원문:/)).not.toBeInTheDocument();
  });
});
