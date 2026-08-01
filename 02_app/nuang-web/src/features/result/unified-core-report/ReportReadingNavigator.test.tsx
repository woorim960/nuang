import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("moves to the selected section immediately without starting a route navigation", () => {
    const scrollIntoView = vi.fn();
    window.history.replaceState(
      { route: "current" },
      "",
      "/results/account/report-id?backTo=%2Fhome#overview",
    );

    render(
      <>
        <ReportReadingNavigator items={items} />
        <section
          id="contexts"
          ref={(node) => {
            if (node) node.scrollIntoView = scrollIntoView;
          }}
        />
      </>,
    );

    const link = screen.getByRole("link", { name: "생활 모습" });
    expect(link).toHaveAttribute("data-route-loading", "off");
    expect(fireEvent.click(link)).toBe(false);

    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
    expect(window.location.pathname).toBe("/results/account/report-id");
    expect(window.location.search).toBe("?backTo=%2Fhome");
    expect(window.location.hash).toBe("#contexts");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });
});
