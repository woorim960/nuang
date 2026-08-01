import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AdvertisingInquiryComplete } from "./AdvertisingInquiryComplete";

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

describe("AdvertisingInquiryComplete", () => {
  beforeEach(() => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createStorage(),
    });
  });

  it("shows the public receipt and only the masked contact email", async () => {
    window.sessionStorage.setItem(
      "nuang:advertising-inquiry:completion.v1",
      JSON.stringify({
        maskedEmail: "br***@example.com",
        publicReference: "AD-20260801-A7K3M2",
      }),
    );

    render(
      <AdvertisingInquiryComplete publicReference="AD-20260801-A7K3M2" />,
    );

    expect(screen.getByText("AD-20260801-A7K3M2")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("br***@example.com")).toBeInTheDocument(),
    );
    expect(screen.queryByText("brand@example.com")).not.toBeInTheDocument();
    expect(
      screen.getByText(/영업일 기준 1~2일 안에 연락드릴게요/),
    ).toBeInTheDocument();
  });
});
