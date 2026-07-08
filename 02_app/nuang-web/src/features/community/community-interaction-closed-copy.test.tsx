import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityCommentPreview } from "@/features/community/CommunityCommentPreview";
import { CommunityComposerPreview } from "@/features/community/CommunityComposerPreview";
import { CommunityReactionPreview } from "@/features/community/CommunityReactionPreview";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

const target = {
  id: "daily_prompt_001",
  type: "community_preview_card",
} as const;

const misleadingSavedCopy =
  /저장됐|저장됨|저장 완료|게시됨|게시 완료|등록됨|등록 완료|반응 완료|댓글 완료|성공/;
const forbiddenVisibleDevCopy =
  /Supabase|RLS|URL\/key|credential|DB|payload|skeleton|seed|preview|callback/i;

describe("community interaction closed copy", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify(createApiClosedPayload("supabase_env_missing")),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 503,
          },
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps reaction preview copy clear that no reaction is saved", async () => {
    const { container } = render(
      <CommunityReactionPreview
        cardTitle="오늘의 질문"
        previewCount={128}
        target={target}
      />,
    );

    expect(screen.getByText("공감 준비")).toBeInTheDocument();
    expect(screen.getByText("공식 주제 카드 · 내 반응 미저장")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "오늘의 질문 반응 준비 확인" }));

    expect(
      await screen.findByText("아직 계정 연결을 열기 전이에요."),
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent(misleadingSavedCopy);
    expect(container).not.toHaveTextContent(forbiddenVisibleDevCopy);
  });

  it("keeps comment preview copy in preview/readiness language", async () => {
    const { container } = render(
      <CommunityCommentPreview cardTitle="오늘의 질문" target={target} />,
    );

    expect(screen.getByPlaceholderText("짧게 미리 써보기")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("오늘의 질문 댓글 미리쓰기"), {
      target: {
        value: "저는 잠깐 생각할 시간이 있으면 좋아요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "오늘의 질문 댓글 준비 확인" }));

    expect(
      await screen.findByText("아직 계정 연결을 열기 전이에요."),
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent(misleadingSavedCopy);
    expect(container).not.toHaveTextContent(forbiddenVisibleDevCopy);
  });

  it("keeps composer closed-state copy away from posted/saved success language", async () => {
    const { container } = render(<CommunityComposerPreview />);

    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: {
        value: "나는 대화 전에 생각을 정리할 시간이 있으면 더 편해요.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "게시 준비 확인" }));

    expect(
      await screen.findByText("아직 계정 연결을 열기 전이에요."),
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent(misleadingSavedCopy);
    expect(container).not.toHaveTextContent(forbiddenVisibleDevCopy);
  });
});
