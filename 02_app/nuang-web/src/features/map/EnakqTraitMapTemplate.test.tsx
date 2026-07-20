import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EnakqTraitMapTemplate } from "@/features/map/EnakqTraitMapTemplate";
import guide from "@/features/nuang-code/fixtures/enakq-longform-guide.generated.json";

describe("EnakqTraitMapTemplate", () => {
  it("shows a detailed 15-chapter guide without turning the role name into an ability", () => {
    render(<EnakqTraitMapTemplate />);

    expect(
      screen.getByRole("heading", { name: "관계를 여는 지휘자" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("뉴앙 코드 ENAKQ")).toBeInTheDocument();
    expect(
      screen.getByText(/사람을 지시하거나 통솔하는 직책을 뜻하지 않아요/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "무엇을 믿어도 되고, 아직 무엇을 모를까요?",
      }),
    ).toBeInTheDocument();
    expect(guide.chapters).toHaveLength(15);
    expect(guide.totalCharacters).toBeGreaterThan(40_000);
  });

  it("opens the table of contents and moves to a selected chapter", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    render(<EnakqTraitMapTemplate />);

    await user.click(screen.getByRole("button", { name: /처음 보기/ }));

    expect(
      screen.getByText("궁금한 내용을 바로 골라 보세요"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /마음 가는 사람/ }));

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("궁금한 내용을 바로 골라 보세요")).toBeNull();
  });

  it("keeps agreed easy-Korean terms out of the customer guide", () => {
    const customerCopy = JSON.stringify(guide.chapters);

    expect(customerCopy).toContain("처음 드는 생각");
    expect(customerCopy).toContain("실제 나타나는 반응");
    expect(customerCopy).not.toContain("마음 먼저");
    expect(customerCopy).not.toContain("조합 가설");
    expect(customerCopy).not.toContain("개인 과정 자료");
    expect(customerCopy).not.toContain("인지 인터뷰");
  });
});
