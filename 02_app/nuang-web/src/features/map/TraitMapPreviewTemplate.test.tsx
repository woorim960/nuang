import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TraitMapPreviewTemplate } from "@/features/map/TraitMapPreviewTemplate";
import { candidateProfileDefinitions } from "@/features/nuang-code/candidate-profile-names";

describe("TraitMapPreviewTemplate", () => {
  it("shows an honest preview and links to the completed ENAKQ guide", () => {
    render(
      <TraitMapPreviewTemplate profile={candidateProfileDefinitions.INAKQ} />,
    );

    expect(
      screen.getByRole("heading", { name: "고요한 마음 지휘자" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("뉴앙 코드 INAKQ")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "정확한 상세 정보는 곧 업데이트돼요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "다섯 글자가 보여주는 핵심 모습",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ENAKQ 상세 지도 참고하기/ }),
    ).toHaveAttribute("href", "/map/ENAKQ");
  });
});
