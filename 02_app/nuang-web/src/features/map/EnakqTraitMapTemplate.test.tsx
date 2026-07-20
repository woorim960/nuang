import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EnakqTraitMapTemplate } from "@/features/map/EnakqTraitMapTemplate";

describe("EnakqTraitMapTemplate", () => {
  it("shows the representative code without presenting the role name as an ability", () => {
    render(<EnakqTraitMapTemplate />);

    expect(
      screen.getByRole("heading", { name: "관계를 여는 지휘자" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("뉴앙 코드 ENAKQ")).toBeInTheDocument();
    expect(
      screen.getByText(/사람을 통솔하는 능력이나 직책을 뜻하지 않아요/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("group")).toHaveLength(5);
  });

  it("changes relationship context in place", async () => {
    const user = userEvent.setup();
    render(<EnakqTraitMapTemplate />);

    await user.click(screen.getByRole("tab", { name: "마음 가는 사람" }));

    expect(
      screen.getByRole("heading", {
        name: "가능성을 사실처럼 믿기 전에 직접 확인하기",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /호감과 속마음은 뉴앙 코드나 행동 한 장면만으로 알 수 없어요/,
      ),
    ).toBeInTheDocument();
  });
});
