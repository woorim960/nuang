import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountEventHistory } from "@/features/account/AccountEventHistory";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AccountEventHistory", () => {
  it("shows a masked contact and cancels only the selected event entry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          contact: {
            hasMobilePhone: true,
            marketingOptIn: false,
            mobilePhoneMasked: "010-****-5678",
            mobilePhoneStatus: "unverified",
            updatedAt: "2026-07-27T00:00:00.000Z",
          },
          events: [
            {
              announcementLabel: "2026년 10월 1일",
              canWithdraw: true,
              enteredAt: "2026-07-27T00:00:00.000Z",
              id: "11111111-1111-4111-8111-111111111111",
              prize: "스타벅스 모바일 금액권 5,000원",
              status: "entered",
              title: "뉴앙 질문 검토 이벤트",
              updatedAt: "2026-07-27T00:00:00.000Z",
            },
          ],
          ok: true,
        }),
      )
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AccountEventHistory />);

    expect(await screen.findByText("010-****-5678")).toBeInTheDocument();
    expect(screen.getByText("응모 완료")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "응모 취소" }));
    expect(
      screen.getByText(/프로필에 등록한 휴대전화번호는 그대로 유지됩니다/),
    ).toBeInTheDocument();
    const cancelButtons = screen.getAllByRole("button", {
      name: /^응모 취소$/,
    });
    fireEvent.click(cancelButtons.at(-1)!);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/me/events/11111111-1111-4111-8111-111111111111",
        { method: "DELETE" },
      ),
    );
    expect(await screen.findByText("응모 취소")).toBeInTheDocument();
  });

  it("focuses the safe confirmation action and returns focus after Escape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          contact: {
            hasMobilePhone: true,
            marketingOptIn: false,
            mobilePhoneMasked: "010-****-5678",
            mobilePhoneStatus: "unverified",
            updatedAt: "2026-07-27T00:00:00.000Z",
          },
          events: [
            {
              announcementLabel: "2026년 10월 1일",
              canWithdraw: true,
              enteredAt: "2026-07-27T00:00:00.000Z",
              id: "11111111-1111-4111-8111-111111111111",
              prize: "스타벅스 모바일 금액권 5,000원",
              status: "entered",
              title: "뉴앙 질문 검토 이벤트",
              updatedAt: "2026-07-27T00:00:00.000Z",
            },
          ],
          ok: true,
        }),
      ),
    );

    render(<AccountEventHistory />);

    const trigger = await screen.findByRole("button", { name: "응모 취소" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "이벤트 응모를 취소할까요?",
    });
    const safeButton = screen.getByRole("button", { name: "계속 참여" });
    await waitFor(() => expect(safeButton).toHaveFocus());

    fireEvent.keyDown(document, { key: "Escape" });

    expect(dialog).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
