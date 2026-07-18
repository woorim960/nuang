import { describe, expect, it, vi } from "vitest";
import TogetherPage from "@/app/(tabs)/together/page";

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("TogetherPage", () => {
  it("redirects the removed together tab to feed", () => {
    TogetherPage();

    expect(redirectMock).toHaveBeenCalledWith("/feed");
  });
});
