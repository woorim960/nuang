import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminPage, { metadata } from "@/app/admin/page";

describe("AdminPage", () => {
  it("shows the current MVP launch readiness status", () => {
    render(<AdminPage />);

    expect(screen.getByRole("heading", { name: "관리자" })).toBeInTheDocument();
    expect(screen.getAllByText("NO-GO").length).toBeGreaterThan(0);
    expect(screen.getByText("사전 QA")).toBeInTheDocument();
    expect(screen.getAllByText("화면 경로 QA").length).toBeGreaterThan(0);
    expect(screen.getByText("주요 경로 통과")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "MVP 출시 준비 상태" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "정책 문서 준비 상태" }),
    ).toBeInTheDocument();
    expect(metadata.robots).toEqual({
      follow: false,
      index: false,
    });
  });

  it("keeps credential blockers and opening order explicit", () => {
    render(<AdminPage />);

    expect(screen.getByText("Google·Kakao 로그인 연결")).toBeInTheDocument();
    expect(screen.getByText("Naver는 MVP 1차 보류 권장")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "작게 열고 검증합니다" }))
      .toBeInTheDocument();
    expect(screen.getByText("결과 계정 저장")).toBeInTheDocument();
    expect(screen.getByText("공개 프로필 코드와 공개 비교")).toBeInTheDocument();
  });

  it("keeps policy document gates visible before launch", () => {
    render(<AdminPage />);

    expect(
      screen.getByRole("heading", { name: "정책 문서가 아직 최종본이 아닙니다" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /이용약관/ })).toHaveAttribute(
      "href",
      "/policies/terms",
    );
    expect(
      screen.getByRole("link", { name: /개인정보 처리방침/ }),
    ).toHaveAttribute("href", "/policies/privacy");
    expect(screen.getAllByText("공개 전 승인 필요")).toHaveLength(2);
  });
});
