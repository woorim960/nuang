import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage from "@/app/policies/privacy/page";
import TermsPolicyPage from "@/app/policies/terms/page";

describe("policy skeleton pages", () => {
  it("renders the terms skeleton as a non-final NO-GO document", () => {
    render(<TermsPolicyPage />);

    expect(
      screen.getByRole("heading", { name: "이용약관 준비 중" }),
    ).toBeInTheDocument();
    expect(screen.getByText("NO-GO")).toBeInTheDocument();
    expect(screen.getByText("준비 문서 v0.1")).toBeInTheDocument();
    expect(screen.getByText(/최종 법률 문서가 아닙니다/)).toBeInTheDocument();
    expect(screen.getByText(/공개 출시 전 검토와 승인/)).toBeInTheDocument();
    expect(screen.getByText("서버 기능 전 필요한 항목")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("policy-skeleton");
    expect(document.body).not.toHaveTextContent("payload");
    expect(document.body).not.toHaveTextContent("MVP");
  });

  it("renders the privacy skeleton without claiming final legal approval", () => {
    render(<PrivacyPolicyPage />);

    expect(
      screen.getByRole("heading", { name: "개인정보 처리방침 준비 중" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/직접 응답, 원점수, 민감 주제, 도움 허브 이용 맥락/),
    ).toBeInTheDocument();
    expect(screen.getByText(/공개·공유·비교 데이터/)).toBeInTheDocument();
    expect(screen.getByText("출시 차단 조건")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("payload");
  });
});
