import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScoreBar } from "@/components/ui/ScoreBar";

describe("ScoreBar", () => {
  it("exposes score values as an accessible meter", () => {
    render(<ScoreBar label="사람 사이 에너지" value={72} />);

    const meter = screen.getByRole("meter", {
      name: "사람 사이 에너지 점수",
    });

    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("aria-valuenow", "72");
    expect(meter).toHaveAttribute("aria-valuetext", "72점");
  });

  it("bounds values to the 0-100 meter range", () => {
    render(<ScoreBar label="경계 값" value={140} />);

    expect(screen.getByRole("meter", { name: "경계 값 점수" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });
});
