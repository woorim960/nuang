import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage from "@/app/policies/privacy/page";
import TermsPolicyPage from "@/app/policies/terms/page";

describe("customer-facing policy pages", () => {
  it("renders the terms without internal release language", () => {
    render(<TermsPolicyPage />);

    expect(screen.getByText("이용약관")).toBeInTheDocument();
    expect(screen.getByText("시행일 2026년 8월 5일")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "서비스 이용" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "검사와 리포트는 자신과 서로를 이해하는 참고 자료이며, 의료적 진단을 대신하지 않습니다.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "다른 사람의 권리와 개인정보를 존중하고, 동의 없이 민감한 내용을 올리지 않습니다.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("상호: 딱좋은라이프")).toBeInTheDocument();
    expect(screen.getByText("대표자: 박우림")).toBeInTheDocument();
    expect(
      screen.getByText("사업자등록번호: 768-75-00424"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "만 14세 미만 이용자의 회원가입은 현재 제공하지 않습니다. 로그인 없이 브라우저에만 저장하는 일반 검사 콘텐츠는 이용할 수 있습니다.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "설정으로 돌아가기" }),
    ).toHaveAttribute("href", "/my/settings");
    expect(document.body).not.toHaveTextContent("NO-GO");
    expect(document.body).not.toHaveTextContent("준비 중");
    expect(document.body).not.toHaveTextContent("출시 차단");
    expect(document.body).not.toHaveTextContent("policy-skeleton");
    expect(document.body).not.toHaveTextContent("payload");
    expect(document.body).not.toHaveTextContent("MVP");
  });

  it("explains collection, purpose, and visibility in plain language", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByText("개인정보 처리방침")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "이용하는 정보" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "이용 목적" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "공개와 보호" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "보관과 삭제" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "회원의 권리" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "담당자와 문의" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "검사의 개별 답변과 원점수, 로그인 정보는 다른 사람에게 공개하지 않습니다.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "프로필과 게시물, 비교 정보는 사용자가 선택한 공개 범위에 따라 보여줍니다.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("개인정보 보호 담당자: 박우림 (딱좋은라이프)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("답변 안내: 접수 후 1~3일 이내"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "현재 회원가입과 계정 저장 기능은 만 14세 이상인 이용자에게만 제공합니다.",
      ),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("준비 중");
    expect(document.body).not.toHaveTextContent("출시 차단");
    expect(document.body).not.toHaveTextContent("payload");
  });
});
