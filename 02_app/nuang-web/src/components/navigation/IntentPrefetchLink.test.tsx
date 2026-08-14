import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";

vi.mock("next/link", () => ({
  default: ({
    children,
    prefetch,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    prefetch: boolean | null;
  }) => (
    <a
      {...props}
      data-prefetch={prefetch === false ? "disabled" : "automatic"}
    >
      {children}
    </a>
  ),
}));

describe("IntentPrefetchLink", () => {
  it.each(["mouseEnter", "focus", "touchStart"] as const)(
    "defers prefetching until %s signals navigation intent",
    (eventName) => {
      render(<IntentPrefetchLink href="/feed/search">검색</IntentPrefetchLink>);

      const link = screen.getByRole("link", { name: "검색" });
      expect(link).toHaveAttribute("data-prefetch", "disabled");

      fireEvent[eventName](link);

      expect(link).toHaveAttribute("data-prefetch", "automatic");
      expect(link).toHaveAttribute("href", "/feed/search");
    },
  );

  it("preserves caller events and does not prefetch when they are cancelled", () => {
    const onMouseEnter = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
    });
    render(
      <IntentPrefetchLink href="/feed" onMouseEnter={onMouseEnter}>
        커뮤니티
      </IntentPrefetchLink>,
    );

    const link = screen.getByRole("link", { name: "커뮤니티" });
    fireEvent.mouseEnter(link);

    expect(onMouseEnter).toHaveBeenCalledOnce();
    expect(link).toHaveAttribute("data-prefetch", "disabled");
  });
});
