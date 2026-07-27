import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminContentPage from "@/app/admin/content/page";
import type {
  AdminContentRelease,
  AdminContentReview,
} from "@/features/admin/server-admin-content";

const mocks = vi.hoisted(() => ({
  readAdminContent: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/features/admin/server-admin-access", () => ({
  resolveAdminContext: async () => ({ client: {}, ok: true }),
}));

vi.mock("@/features/admin/server-admin-content", () => ({
  readAdminContent: mocks.readAdminContent,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const release: AdminContentRelease = {
  atomCounts: { approved: 0, published: 0, research_only: 10 },
  codeSchemeVersion: "NUANG-CODE-5AXIS-CANDIDATE-1.0",
  contractVersion: "nuang-trait-map-content.v1",
  createdAt: "2026-07-28T00:00:00.000Z",
  inventory: {
    atoms: 10,
    axes: 5,
    facets: 10,
    profiles: 32,
  },
  profileNameReleaseId: "NUANG-PROFILE-NAME-CANDIDATE-2.1",
  releaseId: "NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT",
  reviewCounts: { in_review: 3, passed: 1 },
  status: "in_review",
  updatedAt: "2026-07-28T00:00:00.000Z",
};

const copy =
  "상대 반응이 분명하지 않을 때 마음이 더 신경 쓰이고 여러 가능성을 떠올릴 수 있어요.";

const reviews: AdminContentReview[] = [
  "psychology",
  "measurement",
  "plain_language",
  "product_safety",
].map((reviewRole, index) => ({
  atomId: "tmc.v1.enakq.partner",
  atomState: "research_only",
  atomVersion: 1,
  copyShort: copy,
  entityRef: "ENAKQ",
  releaseId: release.releaseId,
  reviewRole,
  reviewStatus: index === 0 ? "passed" : "in_review",
  slot: "partner",
  updatedAt: "2026-07-28T00:00:00.000Z",
}));

describe("AdminContentPage", () => {
  beforeEach(() => {
    mocks.readAdminContent.mockResolvedValue({
      releases: [release],
      reviews,
    });
  });

  it("groups repeated specialist checks under one human-readable content item", async () => {
    render(
      await AdminContentPage({
        searchParams: Promise.resolve({ view: "reviews" }),
      }),
    );

    expect(screen.getByText("이 화면은 이렇게 사용해요")).toBeInTheDocument();
    expect(screen.getByText(/관계를 여는 지휘자/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "연인과 함께할 때" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(copy)).toHaveLength(1);
    expect(screen.getByText("심리학 기준")).toBeInTheDocument();
    expect(screen.getByText("성향검사 기준")).toBeInTheDocument();
    expect(screen.getByText("누구나 이해하는 문장")).toBeInTheDocument();
    expect(screen.getByText("서비스 안전")).toBeInTheDocument();
  });

  it("describes a release as a customer-facing publish version", async () => {
    render(
      await AdminContentPage({
        searchParams: Promise.resolve({ view: "releases" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "성향지도 콘텐츠 v1" }),
    ).toBeInTheDocument();
    expect(screen.getByText("문구 검토를 진행하고 있어요")).toBeInTheDocument();
    expect(screen.getByText("뉴앙 코드 축")).toBeInTheDocument();
    expect(screen.getByText("성향 유형")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "게시 준비 완료" }),
    ).toBeInTheDocument();
  });
});
