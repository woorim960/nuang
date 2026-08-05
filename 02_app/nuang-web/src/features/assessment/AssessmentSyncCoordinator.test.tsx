import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssessmentSyncCoordinator } from "./AssessmentSyncCoordinator";

const mocks = vi.hoisted(() => ({
  synchronizeAccountAssessmentAttempts: vi.fn(),
}));

vi.mock("@/features/assessment/assessment-account-sync", () => ({
  synchronizeAccountAssessmentAttempts:
    mocks.synchronizeAccountAssessmentAttempts,
}));

describe("AssessmentSyncCoordinator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    Object.defineProperty(window, "requestIdleCallback", {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defers the initial account sync so it does not compete with first paint", async () => {
    render(<AssessmentSyncCoordinator />);

    expect(mocks.synchronizeAccountAssessmentAttempts).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(399);
      await Promise.resolve();
    });
    expect(mocks.synchronizeAccountAssessmentAttempts).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(mocks.synchronizeAccountAssessmentAttempts).toHaveBeenCalledOnce();
  });

  it("cancels a scheduled sync when the app shell unmounts", async () => {
    const view = render(<AssessmentSyncCoordinator />);

    view.unmount();
    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
    });

    expect(mocks.synchronizeAccountAssessmentAttempts).not.toHaveBeenCalled();
  });
});
