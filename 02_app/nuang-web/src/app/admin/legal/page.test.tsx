import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminLegalPage from "@/app/admin/legal/page";
import { legalReviewDefinitions } from "@/features/admin/legal-review-contract";
import type { AdminLegalDashboard } from "@/features/admin/server-admin-legal";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  readAdminLegalDashboard: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/features/admin/server-admin-access", () => ({
  resolveAdminContext: async () => ({ client: {}, ok: true }),
}));

vi.mock("@/features/admin/server-admin-legal", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/features/admin/server-admin-legal")
    >();
  return {
    ...original,
    readAdminLegalDashboard: mocks.readAdminLegalDashboard,
  };
});

function createDashboard(): AdminLegalDashboard {
  return {
    available: true,
    documents: [
      {
        effectiveDate: "2026-08-05",
        href: "/policies/terms",
        id: "terms",
        sections: [{ items: ["서비스 범위"], title: "서비스" }],
        title: "이용약관",
        version: "policy.v1.0",
      },
      {
        effectiveDate: "2026-08-05",
        href: "/policies/privacy",
        id: "privacy",
        sections: [{ items: ["수집 목적"], title: "개인정보 처리" }],
        title: "개인정보 처리방침",
        version: "policy.v1.0",
      },
    ],
    environment: [
      {
        detail: "약관의 실제 운영 주체와 대조하세요. 현재 설정값이 있습니다.",
        key: "operator",
        label: "운영자 정보",
        ready: true,
      },
    ],
    generatedAt: "2026-08-05T00:00:00.000Z",
    items: legalReviewDefinitions.map((definition) => ({
      ...definition,
      evidenceRef: "",
      note: "",
      ownerLabel: "",
      reviewedAt: null,
      status: "pending",
    })),
    references: [
      {
        href: "https://www.law.go.kr/법령/개인정보보호법",
        label: "국가법령정보센터 · 개인정보 보호법",
      },
    ],
    release: {
      approvalEvidenceRef: "",
      approvedAt: null,
      approvedByLabel: "",
      changeSummary: "",
      id: "00000000-0000-4000-8000-000000000001",
      ownerLabel: "",
      policyVersion: "policy.v1.0",
      privacyVersion: "policy.v1.0",
      releaseKey: "NUANG-MVP-LEGAL-2026-08",
      reviewerLabel: "",
      sourceCommitSha: "",
      status: "draft",
      termsVersion: "policy.v1.0",
      updatedAt: null,
    },
    unavailableReason: null,
  };
}

describe("AdminLegalPage", () => {
  beforeEach(() => {
    mocks.fetch.mockReset();
    mocks.readAdminLegalDashboard.mockResolvedValue(createDashboard());
    mocks.refresh.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
  });

  it("explains the full legal review workflow and separates member consent history", async () => {
    render(await AdminLegalPage());

    expect(
      screen.getByRole("heading", { name: "법률·정책 검토" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "NUANG Beta는 외부 법률 검토를 유예했습니다 · 승인 아님",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/아래 6단계는 베타 배포 전 필수 작업이 아니며/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "법률 검토, 이 순서대로 진행하세요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("검토 기본 정보 입력")).toBeInTheDocument();
    expect(screen.getByText("담당자와 증빙 정리")).toBeInTheDocument();
    expect(screen.getByText("모든 항목 준비 완료")).toBeInTheDocument();
    expect(screen.getByText("검토 패키지 전달")).toBeInTheDocument();
    expect(screen.getByText("의견 반영과 항목 완료")).toBeInTheDocument();
    expect(screen.getByText("최종 승인 기록")).toBeInTheDocument();
    expect(screen.getByText("6단계")).toBeInTheDocument();
    expect(
      screen.getByText(/AI 사전검토와 변호사 승인은 서로 다른 단계입니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AI는 공식 자료와 코드를 대조해 쟁점을 찾을 뿐/),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /회원 동의 현황|동의 관리로 이동/ }),
    ).toHaveLength(2);
    expect(screen.getAllByLabelText("상태")).toHaveLength(
      legalReviewDefinitions.length,
    );
    expect(
      screen.getByText(/정책 화면의 준비 상태 해제.*운영 배포는/),
    ).toBeInTheDocument();
  });

  it("gives an exact setup path when the legal operations store is unavailable", async () => {
    const unavailable = createDashboard();
    unavailable.available = false;
    unavailable.unavailableReason = "최신 DB 마이그레이션을 적용해 주세요.";
    mocks.readAdminLegalDashboard.mockResolvedValue(unavailable);

    render(await AdminLegalPage());

    expect(screen.getByText("처음 한 번만 연결하는 방법")).toBeInTheDocument();
    expect(screen.getByText(/SQL Editor를 엽니다/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "시스템 상태에서 연결 확인" }),
    ).toHaveAttribute("href", "/admin/system");
    expect(
      screen.getAllByRole("button", { name: "항목 저장" })[0],
    ).toBeDisabled();
  });

  it("saves an item only after its completion evidence is present", async () => {
    mocks.fetch.mockResolvedValue({
      json: async () => ({ ok: true }),
      ok: true,
    });
    render(await AdminLegalPage());

    const item = screen.getByText("운영 주체와 문의처").closest("article");
    expect(item).not.toBeNull();
    const itemView = within(item as HTMLElement);
    const save = itemView.getByRole("button", { name: "항목 저장" });

    fireEvent.change(itemView.getByLabelText("상태"), {
      target: { value: "approved" },
    });
    expect(save).toBeDisabled();
    fireEvent.change(itemView.getByLabelText("증빙 위치"), {
      target: { value: "secure-docs/legal/operator-review" },
    });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/admin/legal",
      expect.objectContaining({ method: "POST" }),
    );
    const request = JSON.parse(
      (mocks.fetch.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(request).toMatchObject({
      action: "update_item",
      itemKey: "operator_identity",
      payload: {
        evidenceRef: "secure-docs/legal/operator-review",
        status: "approved",
      },
    });
  });
});
