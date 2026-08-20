import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomSheet } from "@/components/ui/BottomSheet";

describe("BottomSheet", () => {
  it("portals a bottom-aligned modal layer to the body and manages focus", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <div style={{ isolation: "isolate" }}>
        <BottomSheet
          backdropLabel="테스트 시트 닫기"
          dialogProps={{ "aria-label": "테스트 시트" }}
          initialFocus="dialog"
          onClose={onClose}
        >
          <button type="button">확인</button>
        </BottomSheet>
      </div>,
    );

    const dialog = screen.getByRole("dialog", { name: "테스트 시트" });
    const layer = dialog.parentElement;

    expect(dialog).toHaveAttribute("data-bottom-sheet", "true");
    expect(layer).toHaveAttribute("data-bottom-sheet-layer", "true");
    expect(layer?.parentElement).toBe(document.body);
    expect(
      screen.getByRole("button", { name: "테스트 시트 닫기" }),
    ).not.toHaveAttribute("inert");
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "테스트 시트 닫기" }));
    expect(onClose).toHaveBeenCalledTimes(2);

    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
