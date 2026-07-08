import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SharePage, { metadata } from "@/app/share/[token]/page";

describe("SharePage", () => {
  it("keeps the pending share page summary-only and noindex", async () => {
    render(await SharePage({ params: Promise.resolve({ token: "test-token" }) }));

    expect(metadata.robots).toEqual({
      follow: false,
      index: false,
    });
    expect(screen.getByText("공유 링크 준비 중")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "아직 공유 결과를 열 수 없어요" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/임의의 결과를 보여주지 않습니다/)).toBeInTheDocument();
    expect(screen.getByText(/대표 성향과 최대 5개/)).toBeInTheDocument();
    expect(screen.getByText("직접 응답과 10개 세부 성향 제외")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "나도 해보기" })).toHaveAttribute(
      "href",
      "/assessments/nu-core-quick",
    );
  });
});
