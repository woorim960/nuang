import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCognitiveInterviewSession } from "@/features/admin/AdminCognitiveInterviewSession";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("AdminCognitiveInterviewSession", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    window.localStorage.clear();
  });

  it("requires consent and pseudonymous setup before handing the device to a participant", async () => {
    render(<AdminCognitiveInterviewSession />);

    const start = screen.getByRole("button", { name: /참여자 문항 시작/ });
    expect(start).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/참여자 가명 코드/), {
      target: { value: "P-R1-001" },
    });
    fireEvent.change(screen.getByLabelText(/진행자 코드/), {
      target: { value: "MOD-01" },
    });
    for (const label of [
      /연구 목적·보관기간·철회 방법/,
      /언제든 중단할 수 있고/,
      /녹음·화면 기록 여부/,
      /직접 식별정보를 넣지 않습니다/,
    ]) {
      fireEvent.click(screen.getByRole("checkbox", { name: label }));
    }

    expect(start).toBeEnabled();
    fireEvent.click(start);

    expect(
      screen.getByText("이제 기기를 참여자에게 건네주세요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "정한 때에 맞춰 내 부분을 끝낸다.",
      }),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(
        window.localStorage.getItem("nuang:m05-facilitator-draft:v1"),
      ).toContain("P-R1-001"),
    );
  });
});
