import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NuangNextActionFlow } from "@/features/navigation/NuangNextActionFlow";
import { listNuangNextActionFlowItems } from "@/features/navigation/nuang-next-action-flow";

describe("NuangNextActionFlow", () => {
  it("keeps the canonical app journey in order", () => {
    expect(
      listNuangNextActionFlowItems().map((item) => ({
        href: item.href,
        id: item.id,
        stepLabel: item.stepLabel,
        title: item.title,
      })),
    ).toEqual([
      {
        href: "/assessments",
        id: "assessment",
        stepLabel: "1",
        title: "검사",
      },
      {
        href: "/feed",
        id: "feed",
        stepLabel: "2",
        title: "피드",
      },
      {
        href: "/map",
        id: "map",
        stepLabel: "3",
        title: "성향지도",
      },
      {
        href: "/my/reports",
        id: "reports",
        stepLabel: "4",
        title: "내 리포트",
      },
    ]);
  });

  it("renders stable links for home and assessment entry points", () => {
    render(<NuangNextActionFlow eyebrow="검사 후 흐름" title="결과가 쓰이는 순서" />);

    expect(
      screen.getByRole("region", { name: "뉴앙 다음 행동 흐름" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "결과가 쓰이는 순서" })).toBeInTheDocument();
    expect(screen.getByText("검사 후 흐름")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1단계 검사 열기" })).toHaveAttribute(
      "href",
      "/assessments",
    );
    expect(screen.getByRole("link", { name: "2단계 피드 열기" })).toHaveAttribute(
      "href",
      "/feed",
    );
    expect(screen.getByRole("link", { name: "3단계 성향지도 열기" })).toHaveAttribute(
      "href",
      "/map",
    );
    expect(screen.getByRole("link", { name: "4단계 내 리포트 열기" })).toHaveAttribute(
      "href",
      "/my/reports",
    );
  });
});
