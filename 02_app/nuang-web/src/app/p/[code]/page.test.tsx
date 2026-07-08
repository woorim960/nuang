import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PublicProfilePage, { metadata } from "@/app/p/[code]/page";

describe("PublicProfilePage", () => {
  it("keeps the pending public profile page noindex and summary-only", async () => {
    render(
      await PublicProfilePage({
        params: Promise.resolve({ code: "nuang-a7k2m9" }),
      }),
    );

    expect(metadata.robots).toEqual({
      follow: false,
      index: false,
    });
    expect(screen.getByText("공개 프로필 준비 중")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "아직 공개 프로필을 열 수 없어요" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/NUANG-A7K2M9 공개 프로필 링크/)).toBeInTheDocument();
    expect(screen.getByText(/임의 프로필을 보여주지 않아요/)).toBeInTheDocument();
    expect(screen.getByText("대표 성향과 공개 성향지도 요약만 표시")).toBeInTheDocument();
    expect(screen.getByText("직접 응답·원점수·민감 항목 제외")).toBeInTheDocument();
    expect(screen.getByText("공개 범위 변경 시 접근 재평가")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "뉴앙 홈으로" })).toHaveAttribute(
      "href",
      "/home",
    );
  });

  it("does not normalize invalid profile codes into fake profiles", async () => {
    render(
      await PublicProfilePage({
        params: Promise.resolve({ code: "not-a-profile" }),
      }),
    );

    expect(screen.getByText(/공개 프로필 코드 형식을 확인해 주세요/)).toBeInTheDocument();
    expect(screen.queryByText(/not-a-profile 공개 프로필 링크/)).not.toBeInTheDocument();
  });
});
