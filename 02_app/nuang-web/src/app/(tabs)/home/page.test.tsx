import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage, { metadata } from "@/app/(tabs)/home/page";

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("HomePage", () => {
  beforeEach(() => {
    redirectMock.mockReset();
  });

  it("uses the approved assessment-first home metadata", () => {
    expect(metadata).toMatchObject({
      title: { absolute: "성향 테스트와 관계 놀이터 | 뉴앙" },
      description: expect.stringContaining("무료 성향 테스트"),
      alternates: { canonical: "/home" },
    });
  });

  it("renders the home when no legacy feed action is present", async () => {
    const page = await HomePage({ searchParams: Promise.resolve({}) });

    expect(page).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("moves a validated legacy poll resume to the community", async () => {
    const pollId = "11111111-1111-4111-8111-111111111111";
    const optionId = "22222222-2222-4222-8222-222222222222";

    await HomePage({
      searchParams: Promise.resolve({
        auth: "connected",
        ignored: "drop-me",
        optionId,
        pollId,
        resumeFeed: "poll",
      }),
    });

    expect(redirectMock).toHaveBeenCalledWith(
      `/feed?auth=connected&optionId=${optionId}&pollId=${pollId}&resumeFeed=poll`,
    );
  });
});
