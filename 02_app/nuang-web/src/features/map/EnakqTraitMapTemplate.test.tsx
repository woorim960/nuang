import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TraitMapDetailTemplate } from "@/features/map/EnakqTraitMapTemplate";
import { enakqCustomerGuideV2 as guide } from "@/features/nuang-code/enakq-customer-guide-v2";

describe("TraitMapDetailTemplate", () => {
  it("shows a detailed 15-chapter guide centered on typical ENAKQ patterns", () => {
    render(<TraitMapDetailTemplate guide={guide} />);

    expect(
      screen.getByRole("heading", { name: "관계를 여는 지휘자" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("뉴앙 코드 ENAKQ")).toBeInTheDocument();
    expect(
      screen.getByText(
        /ENAKQ가 중요하게 여기는 가치는 연결, 가능성, 배려, 이어감/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "뉴앙이 성향을 해석하는 근거를 알아봐요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "참고한 전문 자료" }),
    ).toBeInTheDocument();
    expect(guide.chapters).toHaveLength(15);
    expect(guide.totalCharacters).toBeGreaterThan(10_000);
  });

  it("opens the table of contents and moves to a selected chapter", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    render(<TraitMapDetailTemplate guide={guide} />);

    await user.click(screen.getByRole("button", { name: /핵심 모습/ }));

    expect(
      screen.getByText("궁금한 내용을 바로 골라 보세요"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /마음 가는 사람/ }));

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("궁금한 내용을 바로 골라 보세요")).toBeNull();
  });

  it("keeps agreed easy-Korean terms out of the customer guide", () => {
    const customerCopy = JSON.stringify(guide.chapters);
    const repeatedHedgeCount = [
      "단정할 수",
      "알 수 없",
      "보장하지",
      "다를 수",
      "상황에 따라",
    ].reduce(
      (count, phrase) => count + customerCopy.split(phrase).length - 1,
      0,
    );

    expect(customerCopy).toContain("처음 드는 생각");
    expect(customerCopy).toContain("실제 나타나는 반응");
    expect(customerCopy).toContain("성향의 중심 경향");
    expect(repeatedHedgeCount).toBeLessThanOrEqual(2);
    expect(customerCopy).not.toContain("마음 먼저");
    expect(customerCopy).not.toContain("조합 가설");
    expect(customerCopy).not.toContain("개인 과정 자료");
    expect(customerCopy).not.toContain("인지 인터뷰");
  });
});
