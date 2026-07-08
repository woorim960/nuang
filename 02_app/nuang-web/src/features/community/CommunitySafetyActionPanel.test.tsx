import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommunitySafetyActionPanel } from "@/features/community/CommunitySafetyActionPanel";
import { communitySafetyTargetSelectEventName } from "@/features/community/safety-action-contract";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

describe("CommunitySafetyActionPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps safety action copy in readiness language", async () => {
    const payload = createApiClosedPayload(
      "community_safety_action_db_write_pending",
    );
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(payload),
      status: 501,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<CommunitySafetyActionPanel />);

    expect(
      screen.getByRole("heading", { name: "신고·숨김·차단 준비 확인" }),
    ).toBeInTheDocument();
    expect(screen.getByText("신고 준비")).toBeInTheDocument();
    expect(screen.getByText("숨김 준비")).toBeInTheDocument();
    expect(screen.getByText("차단 준비")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "신고 보호 액션 준비 확인" }));

    expect(await screen.findByText(payload.display.message)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(
      /신고됨|신고 완료|숨김됨|숨김 완료|차단됨|차단 완료|처리 완료|성공/,
    );
  });

  it("submits a valid report request and renders the closed state response", async () => {
    const payload = createApiClosedPayload("supabase_env_missing");
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(payload),
      status: 503,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CommunitySafetyActionPanel />);

    fireEvent.click(screen.getByRole("button", { name: "신고 보호 액션 준비 확인" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/community-safety-actions",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toEqual({
      action: "report",
      reason: "privacy",
      target: {
        id: "community_read_feed_card",
        type: "community_preview_card",
      },
    });
    expect(await screen.findByText(payload.display.message)).toBeInTheDocument();
    expect(screen.getByText(payload.code)).toBeInTheDocument();
  });

  it("submits hide without a report reason", async () => {
    const payload = createApiClosedPayload(
      "community_safety_action_db_write_pending",
    );
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(payload),
      status: 501,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CommunitySafetyActionPanel />);

    fireEvent.click(screen.getByRole("button", { name: "숨김 보호 액션 준비 확인" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toEqual({
      action: "hide",
      target: {
        id: "community_read_feed_card",
        type: "community_preview_card",
      },
    });
  });

  it("submits the selected target when the user changes the safety action target", async () => {
    const payload = createApiClosedPayload(
      "community_safety_action_db_write_pending",
    );
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(payload),
      status: 501,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CommunitySafetyActionPanel />);

    fireEvent.click(screen.getByText("공개 프로필 카드"));
    fireEvent.click(screen.getByRole("button", { name: "차단 보호 액션 준비 확인" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toEqual({
      action: "block",
      target: {
        id: "local-public-profile-card-preview",
        type: "public_profile_card",
      },
    });
  });

  it("submits a feed card target selected from an external feed entry point", async () => {
    const payload = createApiClosedPayload(
      "community_safety_action_db_write_pending",
    );
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(payload),
      status: 501,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CommunitySafetyActionPanel />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(communitySafetyTargetSelectEventName, {
          detail: {
            description: "오늘의 질문 공식 카드",
            id: "daily_prompt_001",
            label: "오늘의 질문",
            type: "community_preview_card",
          },
        }),
      );
    });
    expect(screen.getByText("피드 카드에서 선택됨")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "신고 보호 액션 준비 확인" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toEqual({
      action: "report",
      reason: "privacy",
      target: {
        id: "daily_prompt_001",
        type: "community_preview_card",
      },
    });
  });
});
