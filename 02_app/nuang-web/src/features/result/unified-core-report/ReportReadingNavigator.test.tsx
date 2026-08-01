import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportReadingNavigator } from "./ReportReadingNavigator";

describe("ReportReadingNavigator", () => {
  const items = [
    { id: "overview", label: "한눈 요약" },
    { id: "signals", label: "선명한 신호" },
    { id: "contexts", label: "생활 모습" },
  ];

  it("provides direct section anchors and an accessible progress value", () => {
    render(<ReportReadingNavigator items={items} />);

    expect(
      screen.getByRole("navigation", { name: "결과 리포트 목차" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "생활 모습" })).toHaveAttribute(
      "href",
      "#contexts",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "33",
    );

    fireEvent.click(screen.getByRole("link", { name: "생활 모습" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });
});
