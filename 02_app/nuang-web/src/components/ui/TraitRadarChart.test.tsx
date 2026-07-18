import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TraitRadarChart } from "@/components/ui/TraitRadarChart";

describe("TraitRadarChart", () => {
  it("renders a labeled radar chart for assistive technology", () => {
    render(
      <TraitRadarChart
        ariaLabel="코드 지도"
        axes={[
          { id: "SE", label: "사람 사이 에너지", shortLabel: "사람", value: 72 },
          { id: "ER", label: "마음의 반응", shortLabel: "마음", value: 64 },
          { id: "SM", label: "일상 리듬", shortLabel: "일상", value: 68 },
          { id: "RO", label: "관계 방식", shortLabel: "관계", value: 58 },
          { id: "OE", label: "감각과 생각", shortLabel: "감각", value: 66 },
        ]}
        centerLabel="코드 지도"
      />,
    );

    expect(screen.getByRole("img", { name: "코드 지도" })).toBeInTheDocument();
    expect(screen.getByText("사람")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("코드 지도")).toBeInTheDocument();
  });
});
