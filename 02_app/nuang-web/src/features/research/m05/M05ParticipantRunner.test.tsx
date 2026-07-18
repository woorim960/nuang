import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { M05ParticipantRunner } from "@/features/research/m05/M05ParticipantRunner";
import type { M05ParticipantSession } from "@/features/research/m05/m05-participant-contract";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

describe("M05ParticipantRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the production question pattern without internal targets", () => {
    render(<M05ParticipantRunner />);

    expect(
      screen.getByRole("heading", {
        name: "정한 때에 맞춰 내 부분을 끝낸다.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("다른 사람과 함께할 일에서 내가 맡은 부분이 있을 때"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "질문 확인 진행률" }),
    ).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(document.body.textContent).not.toMatch(
      /SM-RL|SM-EP|ER-WD|RO-RN|SM-OS|OE-IE|HIGH|LOW|probe|revision/i,
    );
  });

  it("records an unsure reason as the single current choice", () => {
    render(<M05ParticipantRunner />);

    fireEvent.click(
      screen.getByRole("button", { name: "이 상황은 답하기 어려워요" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "비슷한 경험이 거의 없어요" }),
    );

    expect(
      screen.getByRole("button", { name: "비슷한 경험이 거의 없어요" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole<HTMLInputElement>("radio")
        .every((radio) => !radio.checked),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("keeps the first choice, records a change, and finishes without a result", () => {
    const onComplete = vi.fn<(session: M05ParticipantSession) => void>();
    render(<M05ParticipantRunner onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("radio", { name: "드문 편이에요" }));
    fireEvent.click(screen.getByRole("radio", { name: "자주 그래요" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    for (let index = 1; index < 5; index += 1) {
      fireEvent.click(screen.getByRole("radio", { name: "반반이에요" }));
      fireEvent.click(
        screen.getByRole("button", {
          name: index === 4 ? "응답 마치기" : "다음",
        }),
      );
    }

    expect(
      screen.getByRole("heading", {
        name: "5개의 질문을 모두 확인했어요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/뉴앙 코드|성향 결과|점수/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "처음부터 다시 보기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "정밀 검사로 돌아가기" }),
    ).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);

    const firstRecord = onComplete.mock.calls[0][0].responses["CIT-001"];
    expect(firstRecord).toMatchObject({
      firstChoice: { kind: "scale", value: 2 },
      currentChoice: { kind: "scale", value: 4 },
      responseChanged: true,
    });
    expect(firstRecord.firstAnsweredElapsedMs).toBeGreaterThanOrEqual(0);
  });
});
