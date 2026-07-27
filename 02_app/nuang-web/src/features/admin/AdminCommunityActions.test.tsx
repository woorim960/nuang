import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCommunityActions } from "@/features/admin/AdminCommunityActions";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("AdminCommunityActions", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.restoreAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.removeAttribute("open");
    });
  });

  it("allows a limited post to be published again", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    render(
      <AdminCommunityActions
        id="11111111-1111-4111-8111-111111111111"
        kind="post"
        status="limited"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "노출 제한" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 게시" }));
    expect(
      screen.getByRole("heading", { name: "이 게시물을 다시 공개할까요?" }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(
        screen.getByRole("dialog", {
          name: "이 게시물을 다시 공개할까요?",
        }),
      ).getByRole("button", { name: "다시 게시" }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/community",
        expect.objectContaining({
          body: JSON.stringify({
            action: "publish_post",
            id: "11111111-1111-4111-8111-111111111111",
          }),
          method: "POST",
        }),
      );
      expect(refresh).toHaveBeenCalled();
    });
  });
});
