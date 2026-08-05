import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminAdvertisingData } from "./admin-advertising-contract";
import { AdminAdvertisingConsole } from "./AdminAdvertisingConsole";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("AdminAdvertisingConsole", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.unstubAllGlobals();
  });

  it("shows unavailable modules honestly and switches tabs without navigation", () => {
    render(<AdminAdvertisingConsole data={createData(false)} />);

    expect(
      screen.getByText("광고 운영 기능을 준비해야 합니다"),
    ).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("tab", { name: "문의" }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("tab", { name: "캠페인" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getAllByText("연결 확인", { selector: "strong" }).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "설정" }));
    expect(screen.getByText("환경 설정 준비 상태")).toBeInTheDocument();
    expect(screen.getByText("광고 전체 송출")).toBeInTheDocument();
    expect(screen.queryByText("ADVERTISING_ENABLED")).not.toBeInTheDocument();
  });

  it("orders an urgent inquiry and submits status work through the admin API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);
    const data = createData(true);
    data.inquiries.items = [createInquiry()];

    render(<AdminAdvertisingConsole data={data} />);
    expect(screen.getByText("뉴앙 파트너")).toBeInTheDocument();
    fireEvent.click(screen.getByText("상태·담당 업무 변경"));
    fireEvent.change(screen.getByLabelText("상태"), {
      target: { value: "reviewing" },
    });
    fireEvent.change(screen.getByLabelText("다음 조치일"), {
      target: { value: "2026-08-04T10:00" },
    });
    fireEvent.change(screen.getByLabelText("변경 사유"), {
      target: { value: "제안 가능 범위를 먼저 확인합니다." },
    });
    fireEvent.click(screen.getByRole("button", { name: "내 담당으로 저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/advertising/inquiries");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      inquiryId: "22222222-2222-4222-8222-222222222222",
      priority: "urgent",
      status: "reviewing",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("retries only a provider-unaccepted inquiry mail with an audited reason", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);
    const data = createData(true);
    data.inquiries.items = [
      createInquiry({ mailRetryableCount: 1, mailStatus: "failed" }),
    ];

    render(<AdminAdvertisingConsole data={data} />);
    fireEvent.change(screen.getByLabelText("문의 메일 재시도 사유"), {
      target: { value: "발신 설정 복구를 확인했습니다." },
    });
    fireEvent.click(screen.getByRole("button", { name: "안전 재시도" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/admin/advertising/mail-operations",
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      inquiryId: "22222222-2222-4222-8222-222222222222",
      reason: "발신 설정 복구를 확인했습니다.",
    });
  });

  it("registers a new campaign through the audited admin write API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAdvertisingConsole data={createData(true)} />);
    fireEvent.click(screen.getByRole("tab", { name: "캠페인" }));
    fireEvent.click(screen.getByText("새 캠페인 등록"));
    fireEvent.change(screen.getByLabelText("캠페인명"), {
      target: { value: "가을 홈 캠페인" },
    });
    fireEvent.change(screen.getByLabelText("등록 사유"), {
      target: { value: "승인된 운영 계획에 따라 초안을 등록합니다." },
    });
    fireEvent.click(screen.getByRole("button", { name: "초안으로 등록" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/advertising/campaigns");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      campaignId: null,
      name: "가을 홈 캠페인",
      placementKeys: ["HOME_INLINE_01"],
      provider: "direct",
    });
  });
});

function createData(available: boolean): AdminAdvertisingData {
  const moduleState = {
    available,
    items: [],
    message: available ? null : "최신 마이그레이션을 적용해 주세요.",
  };
  return {
    campaigns: { ...moduleState, items: [] },
    creatives: { ...moduleState, items: [] },
    environmentReadiness: [
      {
        items: [
          {
            configured: false,
            description: "전체 공급자의 최상위 송출 스위치",
            key: "ADVERTISING_ENABLED",
            label: "광고 전체 송출",
          },
        ],
        key: "global",
        title: "전체 송출",
      },
    ],
    generatedAt: "2026-08-01T03:00:00.000Z",
    inquiries: { ...moduleState, items: [] },
    inventory: { ...moduleState, items: [] },
    killSwitches: { ...moduleState, items: [] },
    mailOperations: {
      available,
      message: available ? null : "004 운영 제어 마이그레이션이 필요합니다.",
      queue: { dead: 0, pending: 0, retry: 0, sending: 0, stale: 0 },
      worker: {
        claimed: 0,
        completionFailed: 0,
        errorCode: null,
        failed: 0,
        finishedAt: null,
        sent: 0,
        source: null,
        status: null,
      },
    },
    metrics: { ...moduleState, items: [] },
  };
}

function createInquiry(
  overrides: Partial<AdminAdvertisingData["inquiries"]["items"][number]> = {},
): AdminAdvertisingData["inquiries"]["items"][number] {
  return {
    assignedToCurrentAdmin: false,
    budgetBand: "500만~1,000만원",
    campaignObjective: "신규 브랜드 인지도",
    companyName: "뉴앙 파트너",
    contactEmailMasked: "he***@example.com",
    createdAt: "2026-08-01T01:00:00.000Z",
    creativeReadiness: "준비됨",
    desiredEnd: null,
    desiredStart: "2026-09-01",
    firstResponseDueAt: "2026-08-01T09:00:00.000Z",
    id: "22222222-2222-4222-8222-222222222222",
    inquiryType: "브랜드 캠페인",
    mailRetryableCount: 0,
    mailStatus: "sent",
    nextActionAt: null,
    preferredPlacement: "홈",
    priority: "urgent",
    privacyConsentedAt: "2026-08-01T01:00:00.000Z",
    publicReference: "AD-20260801-0001",
    riskFlags: [],
    scheduleMode: "희망 일정",
    status: "received",
    targetAudience: "20대 일반 사용자",
    websiteHost: "example.com",
    ...overrides,
  };
}
