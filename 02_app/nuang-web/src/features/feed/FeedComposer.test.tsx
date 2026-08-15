import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedComposer } from "@/features/feed/FeedComposer";

const mediaOptimizerMock = vi.hoisted(() => ({
  prepare: vi.fn(),
}));
const navigationMock = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock(
  "@/features/feed/feed-media-client-optimizer",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/feed/feed-media-client-optimizer")
      >();
    return { ...actual, prepareFeedMediaFiles: mediaOptimizerMock.prepare };
  },
);

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMock.router,
}));

describe("FeedComposer", () => {
  beforeEach(() => {
    mediaOptimizerMock.prepare.mockReset();
    mediaOptimizerMock.prepare.mockImplementation(async (files: File[]) => ({
      files: [...files],
      mode: "original_fallback",
      outputBytes: files.reduce((total, file) => total + file.size, 0),
      sourceBytes: files.reduce((total, file) => total + file.size, 0),
    }));
    navigationMock.router.push.mockClear();
    navigationMock.router.refresh.mockClear();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/feed");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("moves from the feed entry to one dedicated writing screen", () => {
    render(<FeedComposer />);

    fireEvent.click(screen.getByRole("button", { name: "새 게시물 쓰기" }));

    expect(navigationMock.router.push).toHaveBeenCalledWith("/feed/new");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("posts one familiar free-writing flow with a category and body hashtags", async () => {
    stubSuccessfulPost();
    render(<FeedComposer standalone />);

    expect(screen.getByRole("heading", { name: "글쓰기" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "일상" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "놀이터" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "사진 추가" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("게시물 사진 선택")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp,image/heic,image/heif",
    );
    expect(
      screen.queryByRole("button", { name: "사진 0/19" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "전체 공개" })).toHaveLength(
      1,
    );

    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: {
        value: "오늘은 새로운 카페까지 천천히 걸어갔어요. #카페 #산책 ",
      },
    });
    fireEvent.click(screen.getByRole("radio", { name: "일상 주제" }));

    expect(
      screen.getByRole("button", { name: "카페 태그 삭제" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "산책 태그 삭제" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    expect(
      screen.getByRole("heading", { name: "게시물 미리보기" }),
    ).toBeInTheDocument();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    await waitFor(() => {
      expect(navigationMock.router.push).toHaveBeenCalledWith(
        "/feed?posted=feed_post_001",
      );
    });
    expect(getLastJsonRequestBody()).toMatchObject({
      action: "create_post",
      body: "오늘은 새로운 카페까지 천천히 걸어갔어요.",
      source: "free_text",
      topic: {
        category: "daily_life",
        source: "manual",
        tags: ["카페", "산책"],
      },
      visibility: "public",
    });
  });

  it("selects a category when the user asks for a free local suggestion", async () => {
    stubSuccessfulPost();
    render(<FeedComposer standalone />);

    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: { value: "친구와 대화를 나누며 서로의 마음을 물어봤어요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "추천" }));

    expect(
      await screen.findByRole("radio", { name: "관계 주제" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByText(
        "글과 가까운 주제를 선택했어요. 다른 주제로 바로 바꿀 수 있어요.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "업로드" }));
    expect(
      screen.getByRole("heading", { name: "게시물 미리보기" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));
    await waitFor(() => {
      expect(navigationMock.router.push).toHaveBeenCalledWith(
        "/feed?posted=feed_post_001",
      );
    });
    expect(getLastJsonRequestBody()).toMatchObject({
      topic: {
        category: "relationships",
        source: "local_suggestion",
        tags: [],
      },
    });
  });

  it("turns a completed body hashtag into a removable tag chip", () => {
    render(<FeedComposer standalone />);

    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: { value: "오늘 인사해요 #안녕 " },
    });

    expect(screen.getByLabelText("글 내용")).toHaveValue("오늘 인사해요 ");
    fireEvent.click(screen.getByRole("button", { name: "안녕 태그 삭제" }));
    expect(
      screen.queryByRole("button", { name: "안녕 태그 삭제" }),
    ).not.toBeInTheDocument();
  });

  it("never opens the preview or uploads from an Enter-driven form submit", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedComposer standalone />);

    const bodyInput = screen.getByLabelText("글 내용");
    fireEvent.change(bodyInput, {
      target: { value: "엔터는 줄바꿈에만 사용해요." },
    });
    fireEvent.keyDown(bodyInput, { key: "Enter" });
    fireEvent.submit(bodyInput.closest("form") as HTMLFormElement);

    expect(screen.getByRole("heading", { name: "글쓰기" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "게시물 미리보기" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns from the preview to the same editable draft", () => {
    render(<FeedComposer standalone />);

    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: { value: "수정할 수 있는 미리보기예요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));
    fireEvent.click(screen.getByRole("button", { name: "수정하기" }));

    expect(screen.getByRole("heading", { name: "글쓰기" })).toBeInTheDocument();
    expect(screen.getByLabelText("글 내용")).toHaveValue(
      "수정할 수 있는 미리보기예요.",
    );
  });

  it("uploads selected photos as multipart data without putting them in JSON", async () => {
    stubSuccessfulPost();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:feed-photo");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    render(<FeedComposer standalone />);

    const photo = new File(["photo"], "walk.webp", { type: "image/webp" });
    const preparedPhoto = new File(["prepared-photo"], "prepared-walk.webp", {
      type: "image/webp",
    });
    mediaOptimizerMock.prepare.mockResolvedValueOnce({
      files: [preparedPhoto],
      mode: "optimized",
      outputBytes: preparedPhoto.size,
      sourceBytes: photo.size,
    });
    fireEvent.change(screen.getByLabelText("게시물 사진 선택"), {
      target: { files: [photo] },
    });

    expect(
      await screen.findByAltText("선택한 게시물 사진 미리보기"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "업로드" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    expect(
      screen.getByAltText("업로드할 게시물 대표 사진"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    await waitFor(() => {
      expect(navigationMock.router.push).toHaveBeenCalledWith(
        "/feed?posted=feed_post_001",
      );
    });
    const request = getLastRequestInit();
    expect(request.headers).toBeUndefined();
    expect(request.body).toBeInstanceOf(FormData);
    const formData = request.body as FormData;
    expect(formData.getAll("media")).toHaveLength(1);
    expect(formData.get("media")).toMatchObject({
      name: "prepared-walk.webp",
      type: "image/webp",
    });
    expect(mediaOptimizerMock.prepare).toHaveBeenCalledWith([photo]);
    expect(JSON.parse(String(formData.get("payload")))).toMatchObject({
      action: "create_post",
      body: "",
      clientRequestId: expect.stringMatching(/^feed-/),
      source: "free_text",
    });
  });

  it("reuses a client request id for an unchanged retry and rotates it after the draft changes", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedComposer standalone />);

    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: { value: "같은 초안을 안전하게 다시 보내요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "업로드" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("button", { name: "수정하기" }));
    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: { value: "내용을 바꾼 새 초안을 안전하게 보내요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    const requestIds = fetchMock.mock.calls.map(([, init]) => {
      const body = JSON.parse(String(init?.body)) as {
        clientRequestId: string;
      };
      return body.clientRequestId;
    });
    expect(requestIds[0]).toMatch(/^feed-/);
    expect(requestIds[1]).toBe(requestIds[0]);
    expect(requestIds[2]).not.toBe(requestIds[1]);
  });

  it("locks photo actions while preparing and reprocesses preserved originals when another photo is added", async () => {
    vi.spyOn(URL, "createObjectURL").mockImplementation(
      (file) => `blob:${(file as File).name}`,
    );
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    render(<FeedComposer standalone />);

    const firstOriginal = new File(["first-source"], "first.jpg", {
      type: "image/jpeg",
    });
    const firstPrepared = new File(["first-ready"], "first-ready.webp", {
      type: "image/webp",
    });
    mediaOptimizerMock.prepare.mockResolvedValueOnce({
      files: [firstPrepared],
      mode: "optimized",
      outputBytes: firstPrepared.size,
      sourceBytes: firstOriginal.size,
    });

    fireEvent.change(screen.getByLabelText("게시물 사진 선택"), {
      target: { files: [firstOriginal] },
    });
    expect(
      await screen.findByAltText("선택한 게시물 사진 미리보기"),
    ).toHaveAttribute("src", "blob:first-ready.webp");

    const secondOriginal = new File(["second-source"], "second.png", {
      type: "image/png",
    });
    const firstPreparedAgain = new File(
      ["first-ready-again"],
      "first-ready-again.webp",
      { type: "image/webp" },
    );
    const secondPrepared = new File(["second-ready"], "second-ready.webp", {
      type: "image/webp",
    });
    let resolvePreparation:
      | ((value: {
          files: File[];
          mode: "optimized";
          outputBytes: number;
          sourceBytes: number;
        }) => void)
      | undefined;
    mediaOptimizerMock.prepare.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePreparation = resolve;
        }),
    );

    fireEvent.change(screen.getByLabelText("게시물 사진 선택"), {
      target: { files: [secondOriginal] },
    });

    expect(
      await screen.findByText("사진을 빠르게 올릴 수 있게 준비하고 있어요"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "업로드" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "삭제" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "사진 더 추가" })).toBeDisabled();
    expect(screen.getByLabelText("게시물 사진 선택")).toBeDisabled();
    expect(mediaOptimizerMock.prepare).toHaveBeenLastCalledWith([
      firstOriginal,
      secondOriginal,
    ]);

    resolvePreparation?.({
      files: [firstPreparedAgain, secondPrepared],
      mode: "optimized",
      outputBytes: firstPreparedAgain.size + secondPrepared.size,
      sourceBytes: firstOriginal.size + secondOriginal.size,
    });

    await waitFor(() => {
      expect(
        screen.queryByText("사진을 빠르게 올릴 수 있게 준비하고 있어요"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByAltText("선택한 게시물 사진 미리보기")).toHaveAttribute(
      "src",
      "blob:first-ready-again.webp",
    );
    expect(screen.getByRole("button", { name: "삭제" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "사진 더 추가" })).toBeEnabled();
  });

  it("does not submit when both writing and photos are empty", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedComposer standalone />);

    expect(screen.getByRole("button", { name: "업로드" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "추천" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restores text settings after login and explains that photos must be reselected", async () => {
    window.sessionStorage.setItem(
      "nuang:feed:pending-post",
      JSON.stringify({
        body: "로그인 전에 적어둔 생각이에요.",
        category: "thoughts",
        hadPhotos: true,
        tags: ["기록"],
        topicSource: "manual",
        visibility: "profile_public",
      }),
    );
    window.history.replaceState(
      {},
      "",
      "/feed/new?resumeFeed=post&auth=connected",
    );
    render(<FeedComposer standalone />);

    expect(
      await screen.findByRole("heading", { name: "글쓰기" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText("글 내용")).toHaveValue(
        "로그인 전에 적어둔 생각이에요.",
      );
    });
    expect(screen.getByRole("radio", { name: "생각 주제" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "기록 태그 삭제" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("로그인됐어요. 사진만 다시 선택하면 게시할 수 있어요."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "프로필에만 공개" }),
    ).toHaveLength(1);
  });

  it("saves the draft and returns through login when posting requires an account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "unauthenticated" }), {
            headers: { "content-type": "application/json" },
            status: 401,
          }),
      ),
    );
    render(<FeedComposer standalone />);

    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: { value: "짧은 생각을 남겨요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    expect(
      screen.getByRole("heading", { name: "게시물 미리보기" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    await waitFor(() => {
      expect(navigationMock.router.push).toHaveBeenCalledWith(
        "/login?next=%2Ffeed%2Fnew%3FresumeFeed%3Dpost&reason=community",
      );
    });
    expect(window.sessionStorage.getItem("nuang:feed:pending-post")).toContain(
      "짧은 생각을 남겨요.",
    );
  });

  it("separates daily writing from expandable playground formats", () => {
    render(<FeedComposer standalone />);

    fireEvent.click(screen.getByRole("tab", { name: "놀이터" }));

    expect(screen.getByRole("tab", { name: "놀이터" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("heading", { name: "어떤 글을 만들까요?" }),
    ).toBeVisible();
    expect(screen.queryByLabelText("글 내용")).not.toBeVisible();
    expect(screen.getByRole("link", { name: /투표/ })).toHaveAttribute(
      "href",
      "/feed/balance/new?returnTo=%2Ffeed%2Fnew%3Fspace%3Dplayground",
    );
    expect(
      screen.getByRole("link", { name: /뉴앙에게 물어봐/ }),
    ).toHaveAttribute(
      "href",
      "/feed/questions/new?returnTo=%2Ffeed%2Fnew%3Fspace%3Dplayground",
    );
    expect(
      screen.queryByRole("button", { name: "업로드" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "일상" }));

    expect(screen.getByLabelText("글 내용")).toBeVisible();
    expect(screen.getByRole("button", { name: "업로드" })).toBeDisabled();
  });
});

function stubSuccessfulPost() {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            feedWrite: {
              action: "create_post",
              id: "feed_post_001",
              moderationStatus: "published",
              targetType: "feed_post",
            },
            ok: true,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
    ),
  );
}

function getLastRequestInit() {
  const mockedFetch = vi.mocked(fetch);
  return mockedFetch.mock.calls.at(-1)?.[1] as RequestInit;
}

function getLastJsonRequestBody() {
  return JSON.parse(String(getLastRequestInit().body));
}
