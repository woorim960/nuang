import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_BALANCE_PACKS } from "./content";
import { BalanceGameLanding } from "./BalanceGameLanding";
import type { BalancePackCatalogItem } from "./types";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/features/feed/CommunityScreenShell", () => ({
  CommunityScreenShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const catalog: BalancePackCatalogItem[] = PUBLIC_BALANCE_PACKS.map((pack) => ({
  defaultQuestionCount: pack.defaultQuestionCount,
  description: pack.description,
  id: pack.id,
  sampleOptions: [pack.questions[0].options[0].text, pack.questions[0].options[1].text],
  scoringTemplate: pack.scoringTemplate,
  slug: pack.slug,
  title: pack.title,
  totalQuestionCount: pack.questions.length,
}));

describe("BalanceGameLanding", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("normalizes a six-character participation code and opens the room", () => {
    render(<BalanceGameLanding packs={catalog} />);

    const input = screen.getByLabelText("참여 코드가 있나요?");
    fireEvent.change(input, { target: { value: "abC234" } });
    fireEvent.click(screen.getByRole("button", { name: /입장/ }));

    expect(input).toHaveValue("ABC234");
    expect(push).toHaveBeenCalledWith(
      "/assessments/together/balance-game/rooms/ABC234",
    );
  });

  it("uses the requested five category labels", () => {
    render(<BalanceGameLanding packs={catalog} />);

    const categories = screen.getByRole("navigation", { name: "주제팩 분류" });
    expect(
      within(categories)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["전체", "지금 많이 하는", "취향", "관계", "재미"]);
  });

  it("opens room setup as a separate route instead of a dialog", () => {
    render(<BalanceGameLanding packs={catalog} />);

    expect(
      screen.getByRole("link", { name: /우리 뭐 먹을까\?/ }),
    ).toHaveAttribute(
      "href",
      "/assessments/together/balance-game/setup?pack=what-to-eat",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
