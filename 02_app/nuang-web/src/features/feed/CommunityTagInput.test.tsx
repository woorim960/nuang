import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CommunityTagInput } from "@/features/feed/CommunityTagInput";

function TagInputHarness({
  onChangeSpy,
}: {
  onChangeSpy?: (tags: string[]) => void;
}) {
  const [tags, setTags] = useState<string[]>([]);

  return (
    <CommunityTagInput
      onChange={(nextTags) => {
        setTags(nextTags);
        onChangeSpy?.(nextTags);
      }}
      tags={tags}
    />
  );
}

describe("CommunityTagInput", () => {
  it("registers a Korean tag once after composition is complete", () => {
    const onChangeSpy = vi.fn();
    render(<TagInputHarness onChangeSpy={onChangeSpy} />);
    const input = screen.getByLabelText("태그 추가");

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "관계" } });
    fireEvent.keyDown(input, {
      isComposing: true,
      key: " ",
      keyCode: 229,
    });

    expect(onChangeSpy).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input, { data: "계" });
    fireEvent.keyDown(input, { key: " " });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenLastCalledWith(["관계"]);
    expect(screen.getByRole("button", { name: "관계 태그 삭제" })).toBeVisible();
    expect(screen.queryByText("#관계계")).not.toBeInTheDocument();
  });

  it("also registers a tag with Enter and ignores a duplicate", () => {
    const onChangeSpy = vi.fn();
    render(<TagInputHarness onChangeSpy={onChangeSpy} />);
    const input = screen.getByLabelText("태그 추가");

    fireEvent.change(input, { target: { value: "산책" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "#산책" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChangeSpy).toHaveBeenLastCalledWith(["산책"]);
    expect(
      screen.getAllByRole("button", { name: "산책 태그 삭제" }),
    ).toHaveLength(1);
  });
});
