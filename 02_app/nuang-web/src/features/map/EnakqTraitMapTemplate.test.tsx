import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TraitMapDetailTemplate } from "@/features/map/EnakqTraitMapTemplate";
import { enakqCustomerGuideV2 as guide } from "@/features/nuang-code/enakq-customer-guide-v2";

describe("TraitMapDetailTemplate", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows a detailed 15-chapter guide centered on typical ENAKQ patterns", () => {
    render(<TraitMapDetailTemplate guide={guide} />);

    expect(
      screen.getByLabelText("ENAKQ 뉴앙 코드의 성향 이름"),
    ).toHaveTextContent("E외향형N가능성형A마음형K꾸준형Q빠른반응형");

    expect(
      screen.getByRole("heading", { name: "관계를 여는 선도자" }),
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

  it("shows the legacy beta label only when the direct customer route requests it", () => {
    const { rerender } = render(<TraitMapDetailTemplate guide={guide} />);
    expect(
      screen.queryByRole("complementary", {
        name: "이전 베타 성향지도 안내",
      }),
    ).not.toBeInTheDocument();

    rerender(<TraitMapDetailTemplate guide={guide} showLegacyBetaNotice />);
    expect(
      screen.getByRole("complementary", {
        name: "이전 베타 성향지도 안내",
      }),
    ).toHaveTextContent("검색 결과에는 노출하지 않아요");
  });

  it("opens the table of contents and moves to a selected chapter", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    render(<TraitMapDetailTemplate guide={guide} />);

    await user.click(screen.getByRole("button", { name: /핵심 모습/ }));

    expect(
      screen.getByRole("button", { name: /마음 가는 사람/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /마음 가는 사람/ }));

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("button", { name: /마음 가는 사람/ }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("updates the sticky chapter header from the actual scroll position", async () => {
    let visibleChapter = 1;
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const chapterNumber = Number(this.getAttribute("data-chapter-number"));
        if (chapterNumber) {
          return createDomRect(124 + (chapterNumber - visibleChapter) * 900);
        }
        if (this.getAttribute("aria-expanded") !== null) {
          return createDomRect(56, 114);
        }
        return createDomRect(0);
      });

    try {
      render(<TraitMapDetailTemplate guide={guide} />);

      visibleChapter = 2;
      window.dispatchEvent(new Event("scroll"));

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /02.*이름 뜻/ }),
        ).toBeInTheDocument(),
      );
    } finally {
      rectSpy.mockRestore();
    }
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

  it("edits the real customer component and applies an approved beta revision", async () => {
    const user = userEvent.setup();
    const nextText =
      "최근 답변에서는 사람들과 대화할 때 생각이 또렷해지고, 새로운 가능성과 상대의 마음을 함께 살피는 흐름이 자주 나타났어요.";
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            message: "저장했고 뉴앙 베타 성향지도에 바로 반영했습니다.",
            ok: true,
            text: nextText,
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TraitMapDetailTemplate
        editor={{ activeRevisionCount: 0, releaseId: "beta-release" }}
        embedded
        guide={guide}
      />,
    );

    await user.click(screen.getByRole("button", { name: /상단 소개 편집:/ }));
    const textarea = screen.getByRole("textbox", {
      name: "상단 소개 수정 내용",
    });
    await user.clear(textarea);
    await user.type(textarea, nextText);
    await user.click(
      screen.getByRole("button", { name: "저장하고 베타 반영" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(nextText)).toBeInTheDocument());
  });
});

function createDomRect(top: number, bottom = top + 100) {
  return {
    bottom,
    height: bottom - top,
    left: 0,
    right: 390,
    top,
    width: 390,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}
