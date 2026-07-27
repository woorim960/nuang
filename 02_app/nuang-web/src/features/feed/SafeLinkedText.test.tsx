import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SafeLinkedText } from "./SafeLinkedText";

describe("SafeLinkedText", () => {
  it("opens approved links safely", () => {
    render(
      <SafeLinkedText
        links={[
          {
            displayUrl: "https://new.example",
            hostname: "new.example",
            normalizedUrl: "https://new.example/",
            status: "approved",
          },
        ]}
        text="확인 https://new.example"
      />,
    );

    const link = screen.getByRole("link", { name: "https://new.example" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute(
      "rel",
      expect.stringContaining("noopener"),
    );
  });

  it("leaves unknown links non-clickable while the post remains readable", () => {
    render(<SafeLinkedText text="확인 https://unknown.example/path" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("확인 중")).toBeInTheDocument();
    expect(screen.getByText("https://unknown.example/path")).toBeInTheDocument();
  });
});
