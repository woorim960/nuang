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
    window.sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          assignmentProof: "test-assignment-proof",
          formId: "FORM_A",
          items: gateCParticipantDefinitions.FORM_A.items.map((item) => ({
            ...item,
            domainId: "SE",
            facetId: "SE-RE",
            sourceKind: "quick_current",
          })),
          ok: true,
          participantCode: "GC-TEST0001",
          poolVersion: "TEST-POOL",
          sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          sessionToken: "session-token",
          withdrawalCode: "withdrawal-code",
        }),
      ),
    );
  });

  it("uses the shared assessment controls for responses and difficult situations", async () => {
    render(<GateCPublicStudy />);
    startStudy();

    const firstItem = gateCParticipantDefinitions.FORM_A.items[0];
    expect(
      await screen.findByRole("heading", { name: firstItem.promptText }),
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

  it("warns that leaving discards the current participation", async () => {
    render(<GateCPublicStudy />);
    startStudy();

    await screen.findByRole("button", { name: "참여 그만하기" });
    fireEvent.click(screen.getByRole("button", { name: "참여 그만하기" }));

    expect(
      screen.getByRole("heading", { name: "참여를 그만둘까요?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/이번 참여는 제출되지 않고 뉴앙 홈으로 이동/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "계속 참여하기" }));
    expect(
      screen.queryByRole("heading", { name: "참여를 그만둘까요?" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "참여 그만하기" }));
    fireEvent.click(screen.getByRole("button", { name: "홈으로 나가기" }));
    expect(push).toHaveBeenCalledWith("/home");
  });

  it("offers a separate mobile reward entry only after participation completes", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/complete")) {
        return Response.json({
          ok: true,
          participantCode: "GC-TEST0001",
          publicReceiptId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          qualityStatus: "included",
        });
      }
      if (url.endsWith("/reward-entries") && !init?.method) {
        return Response.json({
          contact: {
            hasMobilePhone: false,
            marketingOptIn: false,
            mobilePhoneMasked: null,
            mobilePhoneStatus: "missing",
            updatedAt: null,
          },
          entry: null,
          ok: true,
        });
      }
      if (url.endsWith("/api/me/contact")) {
        return Response.json({
          contact: {
            hasMobilePhone: true,
            marketingOptIn: false,
            mobilePhoneMasked: "010-****-5678",
            mobilePhoneStatus: "unverified",
            updatedAt: "2026-07-27T00:00:00.000Z",
          },
          ok: true,
        });
      }
      if (url.endsWith("/reward-entries") && init?.method === "POST") {
        return Response.json({
          announcementLabel: "2026년 10월 1일",
          contact: {
            hasMobilePhone: true,
            marketingOptIn: false,
            mobilePhoneMasked: "010-****-5678",
            mobilePhoneStatus: "unverified",
            updatedAt: "2026-07-27T00:00:00.000Z",
          },
          entryId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          ok: true,
        });
      }
      return Response.json({
        assignmentProof: "test-assignment-proof",
        formId: "FORM_A",
        items: gateCParticipantDefinitions.FORM_A.items.map((item) => ({
          ...item,
          domainId: "SE",
          facetId: "SE-RE",
          sourceKind: "quick_current",
        })),
        ok: true,
        participantCode: "GC-TEST0001",
        poolVersion: "TEST-POOL",
        sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        sessionToken: "session-token",
        withdrawalCode: "withdrawal-code",
      });
    },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <GateCPublicStudy
        rewardCampaign={{
          announcementLabel: "2026년 10월 1일",
          contactMethod: "mobile_phone",
          entryEnabled: true,
          periodLabel: "2026년 9월 30일까지",
          prize: "스타벅스 모바일 금액권 5,000원",
          status: "active",
          winnerCount: 10,
        }}
      />,
    );
    await startStudy();

    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(screen.getByRole("radio", { name: "반반이에요" }));
      fireEvent.click(screen.getByRole("button", { name: "다음" }));
      await screen.findByText(`${index + 2} / 12`);
    }
    fireEvent.click(screen.getByRole("radio", { name: "반반이에요" }));
    fireEvent.click(screen.getByRole("button", { name: "응답 제출하기" }));

    expect(await screen.findByText("리뷰 이벤트 응모")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "당첨 안내를 받을 휴대전화번호",
      }),
      { target: { value: "01012345678" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "번호 저장하고 응모하기" }),
    );

    expect(
      await screen.findByText("이벤트 응모가 완료됐어요"),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/research/gate-c/reward-entries",
      expect.objectContaining({ method: "POST" }),
    );
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
