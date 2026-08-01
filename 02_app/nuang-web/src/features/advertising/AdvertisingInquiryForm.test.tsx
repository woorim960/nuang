import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdvertisingInquiryForm } from "./AdvertisingInquiryForm";

const push = vi.fn();

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("AdvertisingInquiryForm", () => {
  beforeEach(() => {
    push.mockReset();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createStorage(),
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createStorage(),
    });
    vi.stubGlobal("scrollTo", vi.fn());
  });

  it("keeps each step focused and explains the first missing field", async () => {
    const user = userEvent.setup();
    render(<AdvertisingInquiryForm />);

    await screen.findByLabelText(/회사·브랜드명/);
    await user.click(screen.getByRole("button", { name: /다음/ }));

    expect(
      screen.getByText("회사·브랜드명을 2자 이상 입력해 주세요."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText(/회사·브랜드명/)).toHaveFocus(),
    );
    expect(screen.getByRole("heading", { name: "기본 정보" })).toBeInTheDocument();
  });

  it("submits the complete three-step inquiry using the backend enum contract", async () => {
    const user = userEvent.setup();
    let submittedRequest: RequestInit | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      submittedRequest = init;
      return new Response(
          JSON.stringify({
            createdAt: "2026-08-01T12:00:00+09:00",
            inquiryId: "bd933e55-4ca7-47a0-bf69-6a128053f9b6",
            ok: true,
            publicReference: "AD-20260801-A7K3M2",
          }),
          { headers: { "content-type": "application/json" }, status: 201 },
        );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdvertisingInquiryForm />);

    await screen.findByLabelText(/회사·브랜드명/);
    fireEvent.change(screen.getByLabelText(/회사·브랜드명/), {
      target: { value: "뉴앙 파트너" },
    });
    fireEvent.change(screen.getByLabelText(/담당자명/), {
      target: { value: "김담당" },
    });
    fireEvent.change(screen.getByLabelText(/업무 이메일/), {
      target: { value: "brand@example.com" },
    });
    await user.click(screen.getByRole("button", { name: /다음/ }));

    fireEvent.change(screen.getByLabelText(/홍보할 제품·서비스/), {
      target: { value: "새로운 취미를 위한 안전한 체험 서비스입니다." },
    });
    await user.click(screen.getByLabelText(/인라인 배너/));
    await user.click(screen.getByLabelText("브랜드 인지도"));
    await user.click(screen.getByLabelText("홈"));
    await user.click(screen.getByLabelText("100~300만원"));
    fireEvent.change(screen.getByLabelText(/주요 대상/), {
      target: { value: "새로운 취미를 찾는 20~30대 사용자" },
    });
    await user.click(screen.getByLabelText("준비 완료"));
    await user.click(screen.getByRole("button", { name: /다음/ }));

    fireEvent.change(screen.getByLabelText(/문의 내용/), {
      target: {
        value:
          "가을 캠페인 일정과 홈 인라인 배너 운영 방식을 상담하고 싶습니다.",
      },
    });
    await user.click(
      screen.getByRole("checkbox", {
        name: /광고 문의 개인정보 수집·이용에 동의/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "문의 접수하기" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const payload = JSON.parse(String(submittedRequest?.body)) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      budgetBand: "1m_3m",
      campaignObjective: "awareness",
      consentDocumentVersion: "2026-08-01.v1",
      creativeReadiness: "ready",
      inquiryType: "banner",
      preferredPlacement: "home",
      privacyConsent: true,
      scheduleMode: "flexible",
    });
    expect(payload.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(push).toHaveBeenCalledWith(
      "/advertise/inquiry/complete?reference=AD-20260801-A7K3M2",
    );
    expect(window.localStorage.getItem("nuang:advertising-inquiry:safe-draft.v1"))
      .toBeNull();
  });

  it("keeps contact details in tab-scoped storage instead of persistent storage", async () => {
    render(<AdvertisingInquiryForm />);
    await screen.findByLabelText(/회사·브랜드명/);
    fireEvent.change(screen.getByLabelText(/회사·브랜드명/), {
      target: { value: "테스트 브랜드" },
    });
    fireEvent.change(screen.getByLabelText(/담당자명/), {
      target: { value: "김담당" },
    });
    fireEvent.change(screen.getByLabelText(/업무 이메일/), {
      target: { value: "brand@example.com" },
    });

    await waitFor(() => {
      const persistentDraft = window.localStorage.getItem(
        "nuang:advertising-inquiry:safe-draft.v1",
      );
      const tabDraft = window.sessionStorage.getItem(
        "nuang:advertising-inquiry:contact-draft.v1",
      );
      expect(persistentDraft).toContain("테스트 브랜드");
      expect(persistentDraft).not.toContain("brand@example.com");
      expect(tabDraft).toContain("brand@example.com");
    });
  });
});
