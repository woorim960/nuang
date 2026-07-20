import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GateCStudyRunner } from "@/features/research/gate-c/GateCStudyRunner";
import type { GateCStudySession } from "@/features/research/gate-c/gate-c-study-contract";
import { gateCParticipantDefinitions } from "@/features/research/gate-c/gate-c-study-fixture";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

function prepareSession() {
  fireEvent.change(screen.getByLabelText("가명 참여자 ID"), {
    target: { value: "GC-R1-A-01" },
  });
  fireEvent.change(screen.getByLabelText("세션 슬롯 ID"), {
    target: { value: "R1-FORM_A-01" },
  });
  fireEvent.change(screen.getByLabelText("동의 기록 ID"), {
    target: { value: "CONSENT-R1-A-01" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "첫 응답 시작하기" }));
}

describe("GateCStudyRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires pseudonymous setup and consent before showing questions", () => {
    render(
      <GateCStudyRunner definition={gateCParticipantDefinitions.FORM_A} />,
    );

    const start = screen.getByRole("button", { name: "첫 응답 시작하기" });
    expect(start).toBeDisabled();
    expect(screen.getByText(/응답은 자동 업로드되지 않고/)).toBeInTheDocument();

    prepareSession();

    expect(
      screen.getByRole("heading", { name: "기운이 점점 살아난다." }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(
      screen.getByRole("progressbar", { name: "첫 응답 진행률" }),
    ).toHaveAttribute("aria-valuemax", "12");
  });

  it("hands the session to the moderator after all 12 natural responses", () => {
    render(
      <GateCStudyRunner definition={gateCParticipantDefinitions.FORM_A} />,
    );
    prepareSession();

    for (let index = 0; index < 12; index += 1) {
      fireEvent.click(screen.getByRole("radio", { name: "반반이에요" }));
      fireEvent.click(
        screen.getByRole("button", {
          name: index === 11 ? "첫 응답 마치기" : "다음",
        }),
      );
    }

    expect(
      screen.getByRole("heading", {
        name: "이제 진행자와 문장을 확인해요",
      }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/뉴앙 코드|성향 결과|점수/);

    fireEvent.click(screen.getByRole("button", { name: "진행자 기록 시작" }));
    expect(
      screen.getByRole("progressbar", { name: "진행자 기록 진행률" }),
    ).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText("첫 응답 · 반반이에요")).toBeInTheDocument();
  });

  it("requires four response-process summaries and supports issue coding", () => {
    render(
      <GateCStudyRunner definition={gateCParticipantDefinitions.FORM_A} />,
    );
    prepareSession();

    for (let index = 0; index < 12; index += 1) {
      fireEvent.click(screen.getByRole("radio", { name: "반반이에요" }));
      fireEvent.click(
        screen.getByRole("button", {
          name: index === 11 ? "첫 응답 마치기" : "다음",
        }),
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "진행자 기록 시작" }));

    const next = screen.getByRole("button", { name: "다음 문항" });
    expect(next).toBeDisabled();

    for (const label of [
      "문장을 어떻게 이해했나요?",
      "어떤 경험을 떠올렸나요?",
      "무엇을 기준으로 판단했나요?",
      "응답을 고를 때 어려움이 있었나요?",
    ]) {
      fireEvent.change(screen.getByLabelText(label), {
        target: { value: `${label} 참여자 기록` },
      });
    }
    expect(next).toBeEnabled();

    fireEvent.click(screen.getByText("관찰된 문제 표시"));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "질문 뜻을 다르게 이해함" }),
    );
    expect(screen.getByText(/관찰된 문제 표시 · 1개/)).toBeInTheDocument();
  });

  it("completes with a local-only pseudonymous session and no personality result", () => {
    const onComplete = vi.fn<(session: GateCStudySession) => void>();
    render(
      <GateCStudyRunner
        definition={gateCParticipantDefinitions.FORM_A}
        onComplete={onComplete}
      />,
    );
    prepareSession();

    for (let index = 0; index < 12; index += 1) {
      fireEvent.click(screen.getByRole("radio", { name: "반반이에요" }));
      fireEvent.click(
        screen.getByRole("button", {
          name: index === 11 ? "첫 응답 마치기" : "다음",
        }),
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "진행자 기록 시작" }));

    for (let index = 0; index < 12; index += 1) {
      for (const label of [
        "문장을 어떻게 이해했나요?",
        "어떤 경험을 떠올렸나요?",
        "무엇을 기준으로 판단했나요?",
        "응답을 고를 때 어려움이 있었나요?",
      ]) {
        fireEvent.change(screen.getByLabelText(label), {
          target: { value: `${label} 참여자 기록` },
        });
      }
      fireEvent.click(
        screen.getByRole("button", {
          name: index === 11 ? "기록 마치기" : "다음 문항",
        }),
      );
    }

    expect(
      screen.getByRole("heading", {
        name: "가명 연구 파일을 내려받아 주세요",
      }),
    ).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      consentRecordId: "CONSENT-R1-A-01",
      formId: "FORM_A",
      participantIdPseudonymous: "GC-R1-A-01",
      sessionSlotId: "R1-FORM_A-01",
      storageStatus: "LOCAL_EXPORT_NOT_UPLOADED",
    });
    expect(
      Object.keys(onComplete.mock.calls[0][0].naturalResponses),
    ).toHaveLength(12);
    expect(Object.keys(onComplete.mock.calls[0][0].probeRecords)).toHaveLength(
      12,
    );
    expect(document.body.textContent).not.toMatch(/뉴앙 코드|성향 결과|점수/);
  });
});
