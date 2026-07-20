import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GateCPublicStudy } from "@/features/research/gate-c/GateCPublicStudy";
import { gateCParticipantDefinitions } from "@/features/research/gate-c/gate-c-study-fixture";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("GateCPublicStudy", () => {
  beforeEach(() => {
    push.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          formId: "FORM_A",
          ok: true,
          participantCode: "GC-TEST0001",
          sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          sessionToken: "session-token",
          withdrawalCode: "withdrawal-code",
        }),
      ),
    );
  });

  it("uses the shared assessment controls for help and difficult situations", async () => {
    render(<GateCPublicStudy />);
    startStudy();

    const firstItem = gateCParticipantDefinitions.FORM_A.items[0];
    expect(
      await screen.findByRole("heading", { name: firstItem.promptText }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "답하는 기준 · 최근 6개월의 평소 모습",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "응답 선택" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "이 상황은 답하기 어려워요" }),
    );
    expect(
      screen.getByRole("heading", { name: "왜 답하기 어려운가요?" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "상황에 따라 많이 달라져요" }),
    );

    expect(
      screen.getByRole("button", { name: "상황에 따라 많이 달라져요" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("warns before leaving for the unfinished app home", async () => {
    render(<GateCPublicStudy />);
    startStudy();

    await screen.findByRole("button", { name: "참여 그만하기" });
    fireEvent.click(screen.getByRole("button", { name: "참여 그만하기" }));

    expect(
      screen.getByRole("heading", { name: "참여를 그만둘까요?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/현재 뉴앙은 개발 중이라 홈에서 아직 완성되지 않은/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "계속 참여하기" }));
    expect(
      screen.queryByRole("heading", { name: "참여를 그만둘까요?" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "참여 그만하기" }));
    fireEvent.click(screen.getByRole("button", { name: "홈으로 나가기" }));
    expect(push).toHaveBeenCalledWith("/home");
  });
});

function startStudy() {
  fireEvent.change(screen.getByRole("combobox", { name: "연령대" }), {
    target: { value: "25_29" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "요즘의 생활 모습" }), {
    target: { value: "employed" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "성향검사 경험" }), {
    target: { value: "sometimes" },
  });
  fireEvent.click(
    screen.getByRole("checkbox", { name: "만 18세 이상이에요." }),
  );
  fireEvent.click(screen.getByRole("checkbox", { name: /참여는 자발적이며/ }));
  fireEvent.click(screen.getByRole("button", { name: "질문 확인 시작하기" }));
  return waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
}
