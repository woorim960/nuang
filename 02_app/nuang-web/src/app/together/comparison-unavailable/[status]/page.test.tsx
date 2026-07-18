import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicComparisonUnavailablePage, {
  generateStaticParams,
  metadata,
} from "@/app/together/comparison-unavailable/[status]/page";

const redirectMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));

describe("PublicComparisonUnavailablePage", () => {
  beforeEach(() => {
    notFoundMock.mockClear();
    redirectMock.mockClear();
  });

  it("keeps blocked comparison pages noindex and redirects legacy statuses to reports", async () => {
    await PublicComparisonUnavailablePage({
      params: Promise.resolve({ status: "disabled" }),
    });

    expect(metadata.robots).toEqual({
      follow: false,
      index: false,
    });
    expect(redirectMock).toHaveBeenCalledWith("/my/reports");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("does not redirect unsupported statuses", async () => {
    await PublicComparisonUnavailablePage({
      params: Promise.resolve({ status: "unknown" }),
    });

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("prebuilds only supported blocked statuses", () => {
    expect(generateStaticParams()).toEqual([
      { status: "stale" },
      { status: "disabled" },
      { status: "deleted" },
    ]);
  });
});
