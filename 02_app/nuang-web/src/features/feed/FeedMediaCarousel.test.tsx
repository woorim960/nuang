import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedMediaCarousel } from "@/features/feed/FeedMediaCarousel";
import type { FeedPostMedia } from "@/features/feed/feed-seed";

describe("FeedMediaCarousel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
    within(carousel)
      .getAllByRole("img")
      .forEach((image) => expect(image).toHaveAttribute("loading", "lazy"));
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

  it("prioritizes only the first photo when its card is above the fold", () => {
    const media = Array.from({ length: 2 }, (_, index) => ({
      alt: `우선순위 사진 ${index + 1}`,
      height: 1200,
      id: `priority-photo-${index + 1}`,
      url: `https://images.unsplash.com/priority-photo-${index + 1}`,
      width: 960,
    })) satisfies FeedPostMedia[];

    render(<FeedMediaCarousel media={media} priority />);

    const images = screen.getAllByRole("img");
    expect(images[0]).toHaveAttribute("fetchpriority", "high");
    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[0]).toHaveAttribute("width", "960");
    expect(images[0]).toHaveAttribute("height", "1200");
    expect(images[1]).toHaveAttribute("fetchpriority", "low");
    expect(images[1]).toHaveAttribute("loading", "lazy");
  });

  it("server-renders the first photo and defers only later carousel slides", () => {
    let intersectionCallback: IntersectionObserverCallback | null = null;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersectionCallback = callback;
        }
        disconnect = disconnect;
        observe = observe;
      },
    );
    const media = [
      {
        alt: "게시물 대표 사진",
        height: 1200,
        id: "cover-photo",
        url: "https://images.unsplash.com/cover-photo",
        width: 960,
      },
      {
        alt: "나중에 넘겨볼 사진",
        height: 1200,
        id: "deferred-photo",
        url: "https://images.unsplash.com/deferred-photo",
        width: 960,
      },
    ] satisfies FeedPostMedia[];

    render(<FeedMediaCarousel media={media} />);

    expect(screen.getByRole("img", { name: "게시물 대표 사진" })).toHaveAttribute(
      "src",
      "https://images.unsplash.com/cover-photo?auto=format&fit=crop&q=76&w=960",
    );
    const image = screen.getByRole("img", { name: "나중에 넘겨볼 사진" });
    expect(image).not.toHaveAttribute("src");
    expect(observe).toHaveBeenCalledWith(image);

    act(() => {
      intersectionCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(image).toHaveAttribute(
      "src",
      "https://images.unsplash.com/deferred-photo?auto=format&fit=crop&q=76&w=960",
    );
    expect(disconnect).toHaveBeenCalled();
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
