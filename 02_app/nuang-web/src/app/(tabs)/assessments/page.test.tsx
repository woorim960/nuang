import { describe, expect, it, vi } from "vitest";
import AssessmentsPage from "@/app/(tabs)/assessments/page";

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("AssessmentsPage", () => {
  it("temporarily redirects the retired assessment index to the gated home", () => {
    AssessmentsPage();

    expect(redirectMock).toHaveBeenCalledWith("/home");
  });
});
