import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage from "@/app/policies/privacy/page";
import TermsPolicyPage from "@/app/policies/terms/page";

describe("customer-facing policy pages", () => {
  it("renders the terms without internal release language", () => {
    render(<TermsPolicyPage />);

    expect(
      screen.getByRole("heading", { name: "이용약관" }),
    ).toBeInTheDocument();
    expect(screen.getByText("서비스 이용")).toBeInTheDocument();
    expect(screen.getByText("커뮤니티 약속")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("NO-GO");
    expect(document.body).not.toHaveTextContent("준비 중");
    expect(document.body).not.toHaveTextContent("출시 차단");
    expect(document.body).not.toHaveTextContent("policy-skeleton");
    expect(document.body).not.toHaveTextContent("payload");
    expect(document.body).not.toHaveTextContent("MVP");
  });

  it("explains collection, purpose, and visibility in plain language", () => {
    render(<PrivacyPolicyPage />);

    expect(
      screen.getByRole("heading", { name: "개인정보 처리방침" }),
    ).toBeInTheDocument();
    expect(screen.getByText("이용하는 정보")).toBeInTheDocument();
    expect(screen.getByText("이용 목적")).toBeInTheDocument();
    expect(screen.getByText("공개와 보호")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("준비 중");
    expect(document.body).not.toHaveTextContent("출시 차단");
    expect(document.body).not.toHaveTextContent("payload");
  });
});
