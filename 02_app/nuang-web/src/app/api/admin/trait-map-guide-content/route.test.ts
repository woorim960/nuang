import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  allowed: true,
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock("@/features/admin/server-admin-access", () => ({
  resolveAdminContext: vi.fn(async () => ({
    accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    client: { rpc: mocks.rpc },
    ok: true,
  })),
}));

vi.mock("@/features/research/gate-c/gate-c-server-security", () => ({
  isAllowedGateCRequest: vi.fn(() => mocks.allowed),
}));

vi.mock("@/features/nuang-code/server-trait-map-guide-content", () => ({
  readTraitMapGuideActiveEdits: vi.fn(async () => ({
    available: true,
    edits: [],
  })),
}));

import { POST } from "@/app/api/admin/trait-map-guide-content/route";
import {
  getCustomerApprovedTraitMapGuide,
  getTraitMapBetaAiReleaseSummary,
} from "@/features/nuang-code/trait-map-customer-guide-registry";
import { createTraitMapGuideReviewUnits } from "@/features/nuang-code/trait-map-guide-review";

describe("POST /api/admin/trait-map-guide-content", () => {
  const guide = getCustomerApprovedTraitMapGuide("ENAKQ");
  if (!guide) throw new Error("ENAKQ guide required");
  const release = getTraitMapBetaAiReleaseSummary();
  const hero = createTraitMapGuideReviewUnits(guide).find(
    (unit) => unit.kind === "hero_summary",
  );
  if (!hero) throw new Error("hero unit required");

  beforeEach(() => {
    mocks.allowed = true;
    mocks.revalidatePath.mockReset();
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it("rejects a cross-origin edit before reading or writing content", async () => {
    mocks.allowed = false;

    const response = await POST(request({}));

    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("runs the seven-role gate and publishes a safe edit atomically", async () => {
    const text = hero.text.replace(
      "생각과 행동을 이해하기 위한 안내예요.",
      "생각과 행동을 이해하기 위한 설명이에요.",
    );

    const response = await POST(
      request({
        expectedContentHash: hero.contentHash,
        profileCode: guide.code,
        releaseId: release.releaseId,
        text,
        unitKey: hero.unitKey,
      }),
    );
    const body = (await response.json()) as {
      appliedToBeta: boolean;
      invalidatedHumanReviewRoles: number;
      ok: boolean;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      appliedToBeta: true,
      invalidatedHumanReviewRoles: 7,
      ok: true,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "admin_publish_trait_map_guide_edit_atomic",
      expect.objectContaining({
        target_admin_account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/map/ENAKQ");
  });

  it("does not publish an overclaim rejected by the AI beta gate", async () => {
    const response = await POST(
      request({
        expectedContentHash: hero.contentHash,
        profileCode: guide.code,
        releaseId: release.releaseId,
        text: "ENAKQ는 항상 관계에서 성공하고 상대의 속마음을 정확히 알 수 있는 타고난 능력을 가진 사람이므로 어떤 관계에서도 틀림없이 좋은 결과를 만들어요.",
        unitKey: hero.unitKey,
      }),
    );
    const body = (await response.json()) as { issues?: unknown[]; ok: boolean };

    expect(response.status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.issues?.length).toBeGreaterThan(0);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

function request(body: unknown) {
  return new Request("http://localhost/api/admin/trait-map-guide-content", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}
