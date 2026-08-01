import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeedMediaCarousel } from "@/features/feed/FeedMediaCarousel";
import type { FeedPostMedia } from "@/features/feed/feed-seed";

describe("FeedMediaCarousel", () => {
  it("shows several photos one at a time with a swipe position counter", () => {
    const media = Array.from({ length: 4 }, (_, index) => ({
      alt: `주말 사진 ${index + 1}`,
      height: 1200,
      id: `photo-${index + 1}`,
      url: `https://images.unsplash.com/photo-${index + 1}`,
      width: 960,
    })) satisfies FeedPostMedia[];

    render(<FeedMediaCarousel media={media} />);

    const carousel = screen.getByRole("region", {
      name: "게시물 사진 4장",
    });
    expect(within(carousel).getAllByRole("img")).toHaveLength(4);
    expect(within(carousel).getByText("1 / 4")).toBeVisible();

    const track = within(carousel).getByRole("group", {
      name: "사진 넘겨보기",
    });
    Object.defineProperty(track, "clientWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(track, "scrollLeft", {
      configurable: true,
      value: 320,
    });
    fireEvent.scroll(track);

    expect(within(carousel).getByText("2 / 4")).toBeVisible();
  });

  it("moves to the next photo when a mouse drag crosses the snap point", () => {
    const media = Array.from({ length: 3 }, (_, index) => ({
      alt: `드래그 사진 ${index + 1}`,
      height: 1200,
      id: `drag-photo-${index + 1}`,
      url: `https://images.unsplash.com/drag-photo-${index + 1}`,
      width: 960,
    })) satisfies FeedPostMedia[];

    render(<FeedMediaCarousel media={media} />);

    const carousel = screen.getByRole("region", {
      name: "게시물 사진 3장",
    });
    const track = within(carousel).getByRole("group", {
      name: "사진 넘겨보기",
    });
    Object.defineProperty(track, "clientWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(track, "scrollLeft", {
      configurable: true,
      value: 0,
      writable: true,
    });
    Object.defineProperty(track, "setPointerCapture", {
      configurable: true,
      value: () => undefined,
    });
    Object.defineProperty(track, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(track, "scrollTo", {
      configurable: true,
      value: ({ left }: ScrollToOptions) => {
        track.scrollLeft = Number(left ?? 0);
      },
    });

    fireEvent.pointerDown(track, {
      button: 0,
      clientX: 280,
      pointerId: 7,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(track, {
      clientX: 20,
      pointerId: 7,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(track, {
      clientX: 20,
      pointerId: 7,
      pointerType: "mouse",
    });

    expect(within(carousel).getByText("2 / 3")).toBeVisible();
    expect(track).toHaveAttribute("data-dragging", "false");
  });
});
