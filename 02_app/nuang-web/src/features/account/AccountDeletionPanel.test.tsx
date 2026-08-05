import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountDeletionPanel } from "@/features/account/AccountDeletionPanel";

describe("AccountDeletionPanel", () => {
  it("explains permanent deletion, legal retention exceptions and re-registration", () => {
    render(<AccountDeletionPanel />);

    expect(screen.getByText(/계정에 연결된 데이터가 영구 삭제됩니다/)).toBeInTheDocument();
    expect(screen.getByText(/같은 Google·Kakao 계정으로 다시 가입할 수 있지만/)).toBeInTheDocument();
    expect(screen.getByText(/법령상 보존 의무가 있는 경우에만/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "계정과 연결된 데이터 영구 삭제" }),
    ).toBeDisabled();
  });
});
