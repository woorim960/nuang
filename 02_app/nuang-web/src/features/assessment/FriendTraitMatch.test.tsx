import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FriendTraitMatch } from "@/features/assessment/FriendTraitMatch";

describe("FriendTraitMatch", () => {
  it("moves from my answer to the friend prediction and invite summary", () => {
    render(<FriendTraitMatch />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /바뀐 일정에 맞춰 새 계획부터/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(
      screen.getByText("친구라면 어떤 답을 고를까요?"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: /왜 바뀌었는지 친구의 상황부터/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(
      screen.getByText("이제 친구의 실제 선택을 확인해 보세요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "친구에게 초대 보내기" }),
    ).toBeInTheDocument();
  });
});
