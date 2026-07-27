import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TraitMapPreviewTemplate } from "@/features/map/TraitMapPreviewTemplate";
import { candidateProfileDefinitions } from "@/features/nuang-code/candidate-profile-names";

describe("TraitMapPreviewTemplate", () => {
  it("shows the available profile meaning without internal release copy", () => {
    render(
      <TraitMapPreviewTemplate profile={candidateProfileDefinitions.INAKQ} />,
    );

    expect(
      screen.getByRole("heading", { name: "마음과 가능성을 살피는 안내자" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("뉴앙 코드 INAKQ")).toBeInTheDocument();
    expect(screen.queryByText(/업데이트|준비 중/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "다섯 글자가 보여주는 핵심 모습",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "성향지도로 돌아가기" }),
    ).toHaveAttribute("href", "/map");
    expect(screen.getByText("I · 내향형")).toBeInTheDocument();
    expect(screen.getByText("N · 가능성형")).toBeInTheDocument();
    expect(screen.getByText("Q · 빠른반응형")).toBeInTheDocument();
  });
});
