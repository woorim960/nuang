import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopicTraitImpactCard } from "@/features/assessment/TopicTraitImpactCard";
import type { TopicTraitImpactSnapshot } from "@/features/assessment/topic-trait-impact";

describe("TopicTraitImpactCard", () => {
  it("shows a true zero change explicitly", () => {
    render(
      <TopicTraitImpactCard
        snapshot={snapshot()}
        sync={{ status: "synced" }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "이번에는 달라진 부분이 없어요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("변화 없음")).toBeInTheDocument();
  });

  it("keeps login-required results separate from zero change", () => {
    render(
      <TopicTraitImpactCard
        sync={{ lastError: "login_required", status: "failed" }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "로그인하면 내 코드에 이어서 반영해요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("변화 없음")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "로그인하고 이어서 반영하기" }),
    ).toHaveAttribute("href", "/login");
  });

  it("offers a real retry action after a connection failure", () => {
    const onRetry = vi.fn();
    render(
      <TopicTraitImpactCard
        onRetry={onRetry}
        sync={{ lastError: "network_unavailable", status: "failed" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "다시 반영하기" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders five equal code positions with a complete screen-reader label", () => {
    const changed = snapshot();
    changed.before = { ...changed.before!, code: "ENGKQ" };
    changed.after = { ...changed.after!, code: "ENAKQ" };
    changed.codeChanged = true;
    changed.degree = "code_changed";
    changed.affectedDomains = [
      {
        afterBoundary: false,
        afterRawSymbol: "A",
        afterScore: 58,
        afterSymbol: "A",
        beforeBoundary: true,
        beforeRawSymbol: "G",
        beforeScore: 47,
        beforeSymbol: "G",
        delta: 11,
        domainId: "RO",
        label: "관계에서 관심이 가는 곳",
        presentation: "code_changed",
      },
    ];

    render(
      <TopicTraitImpactCard snapshot={changed} sync={{ status: "synced" }} />,
    );

    const comparison = screen.getByRole("img", {
      name: /이전 코드 E, N, G, K, Q, 현재 코드 E, N, A, K, Q.*G에서 A로 변경/,
    });
    expect(comparison).toBeInTheDocument();
    expect(comparison.querySelectorAll("span")).toHaveLength(10);
  });
});

function snapshot(): TopicTraitImpactSnapshot {
  const profile = {
    code: "ENAKQ",
    domains: [],
    profileName: "관계를 여는 선도자",
  };
  return {
    affectedDomains: [],
    after: structuredClone(profile),
    before: structuredClone(profile),
    calculatedAt: "2026-08-03T12:00:00.000Z",
    codeChanged: false,
    degree: "none",
    isRetest: false,
    state: "ready",
    version: "topic-trait-impact.v1",
  };
}
