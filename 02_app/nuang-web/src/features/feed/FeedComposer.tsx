"use client";

import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  Globe2,
  Heart,
  ImageUp,
  MessageCircle,
  MessageCircleQuestion,
  PenLine,
  Plus,
  Scale,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import { IntentPrefetchLink as Link } from "@/components/navigation/IntentPrefetchLink";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import { FeedTopicSelector } from "@/features/feed/FeedTopicSelector";
import { extractExternalLinks } from "@/features/feed/link-safety";
import { analyzeLocalFeedImages } from "@/features/feed/feed-image-analysis";
import { maxFeedPhotoCount } from "@/features/feed/feed-media";
import {
  getFeedMediaClientOptimizationMessage,
  prepareFeedMediaFiles,
} from "@/features/feed/feed-media-client-optimizer";
import {
  extractCompletedFeedTags,
  feedPostTopicCategories,
  feedPostTopicLabels,
  maxFeedTagCount,
  parseFeedTopicInput,
  suggestFeedTopic,
  type FeedPostTopicCategory,
  type FeedPostTopicSource,
} from "@/features/feed/feed-topic";
import type { ApiClosedPayload } from "@/lib/api/closed-state-data";
import { cn } from "@/lib/utils/cn";
import styles from "./FeedComposer.module.css";

type ComposerStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "preparing" }
  | { message: string; status: "notice" }
  | { message: string; status: "error" };

type FeedComposerResponse =
  | ApiClosedPayload
  | {
      error?: string;
      feedWrite?: {
        id?: string;
        moderationStatus?: string | null;
      };
      message?: string;
      ok?: boolean;
    };

type ComposerPhoto = {
  file: File;
  id: string;
  originalFile: File;
  previewUrl: string;
};

type ComposerStep = "edit" | "preview";
type ComposerSpace = "daily" | "playground";
type CreateFeedPostRequest = Extract<
  FeedWriteRequest,
  { action: "create_post" }
>;

type FeedVisibility = CreateFeedPostRequest["visibility"];

const pendingPostStorageKey = "nuang:feed:pending-post";
const playgroundComposerTypes = [
  {
    description: "두 선택지로 가볍게 의견을 모아요",
    href: "/feed/balance/new?returnTo=%2Ffeed%2Fnew%3Fspace%3Dplayground",
    icon: Scale,
    label: "투표",
  },
  {
    description: "원하는 뉴앙 코드에게 질문해요",
    href: "/feed/questions/new?returnTo=%2Ffeed%2Fnew%3Fspace%3Dplayground",
    icon: MessageCircleQuestion,
    label: "뉴앙에게 물어봐",
  },
] as const;
const visibilityOptions: Array<{
  description: string;
  label: string;
  value: FeedVisibility;
}> = [
  {
    description: "커뮤니티 피드와 내 프로필에서 누구나 볼 수 있어요.",
    label: "전체 공개",
    value: "public",
  },
  {
    description:
      "커뮤니티 피드에는 나오지 않고, 내 프로필과 게시물 링크에서 누구나 볼 수 있어요.",
    label: "프로필에만 공개",
    value: "profile_public",
  },
  {
    description: "내 계정에서만 볼 수 있어요.",
    label: "나만 보기",
    value: "private_draft",
  },
];

export function FeedComposer({
  initialSpace = "daily",
  standalone = false,
}: {
  initialSpace?: ComposerSpace;
  standalone?: boolean;
}) {
  const router = useRouter();
  const launchButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const photoPreparationGenerationRef = useRef(0);
  const photoPreparationPendingRef = useRef(false);
  const clientRequestRef = useRef<{
    fingerprint: string;
    id: string;
  } | null>(null);
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(standalone);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [status, setStatus] = useState<ComposerStatus>({ status: "idle" });
  const [isPhotoPreparing, setIsPhotoPreparing] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<FeedPostTopicCategory | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [topicSource, setTopicSource] = useState<FeedPostTopicSource>("manual");
  const [recommendingTopic, setRecommendingTopic] = useState(false);
  const [topicNote, setTopicNote] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<FeedVisibility>("public");
  const [composerStep, setComposerStep] = useState<ComposerStep>("edit");
  const [composerSpace, setComposerSpace] =
    useState<ComposerSpace>(initialSpace);
  const trimmedBody = body.trim();
  const selectedPhoto =
    photos.find((photo) => photo.id === selectedPhotoId) ?? photos[0] ?? null;
  const visibilityLabel =
    visibilityOptions.find((option) => option.value === visibility)?.label ??
    "전체 공개";
  const canSubmit =
    status.status !== "pending" &&
    !isPhotoPreparing &&
    (trimmedBody.length >= 2 || photos.length > 0);
  const canRecommendCategory =
    !isPhotoPreparing &&
    !recommendingTopic &&
    (trimmedBody.length > 0 || photos.length > 0);
  const pendingExternalLinkCount = extractExternalLinks(body).filter(
    (link) => link.status === "pending",
  ).length;

  useEffect(() => {
    return () => {
      photoPreparationGenerationRef.current += 1;
      photoPreparationPendingRef.current = false;
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (
      searchParams.get("auth") !== "connected" ||
      searchParams.get("resumeFeed") !== "post"
    ) {
      return;
    }

    const pendingPost = readPendingPost();
    clearPostResumeParams();

    if (!pendingPost) return;

    const restoreTimer = window.setTimeout(() => {
      setBody(pendingPost.body);
      setSelectedCategory(pendingPost.category);
      setTags(pendingPost.tags);
      setTopicSource(pendingPost.topicSource);
      setVisibility(pendingPost.visibility);
      setOpen(true);
      setStatus({
        message: pendingPost.hadPhotos
          ? "로그인됐어요. 사진만 다시 선택하면 게시할 수 있어요."
          : "로그인됐어요. 내용을 확인하고 게시해 주세요.",
        status: "notice",
      });
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    const syncComposerStep = () => {
      const preview = new URLSearchParams(window.location.search).get(
        "preview",
      );
      setComposerStep(preview === "post" ? "preview" : "edit");
    };

    window.addEventListener("popstate", syncComposerStep);
    return () => window.removeEventListener("popstate", syncComposerStep);
  }, []);

  useEffect(() => {
    if (!open) return;

    const focusTimer =
      composerStep === "edit" && composerSpace === "daily"
        ? window.setTimeout(() => textareaRef.current?.focus(), 0)
        : undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (audienceOpen) {
        setAudienceOpen(false);
        return;
      }
      if (composerStep === "preview") {
        returnToEdit();
        return;
      }
      clientRequestRef.current = null;
      if (standalone) {
        router.push("/feed");
        return;
      }
      setOpen(false);
      setStatus({ status: "idle" });
      window.setTimeout(() => launchButtonRef.current?.focus(), 0);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (focusTimer) window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [audienceOpen, composerSpace, composerStep, open, router, standalone]);

  async function handleUpload() {
    if (photoPreparationPendingRef.current) return;

    if (!canSubmit) {
      setStatus({
        message: "글이나 사진을 하나 이상 추가해 주세요.",
        status: "error",
      });
      return;
    }

    setStatus({ status: "pending" });

    try {
      const draftRequestBody = buildCreatePostRequest({
        body: trimmedBody,
        category: selectedCategory,
        tags,
        topicSource,
        visibility,
      });
      const fingerprint = createPostRequestFingerprint(
        draftRequestBody,
        photos,
      );
      const currentRequest = clientRequestRef.current;
      const clientRequest =
        currentRequest?.fingerprint === fingerprint
          ? currentRequest
          : {
              fingerprint,
              id: createClientRequestId(),
            };
      clientRequestRef.current = clientRequest;
      const requestBody: CreateFeedPostRequest = {
        ...draftRequestBody,
        clientRequestId: clientRequest.id,
      };
      const response = await fetch(
        "/api/feed",
        createPostRequestInit(requestBody, photos),
      );
      const payload = (await response
        .json()
        .catch(() => null)) as FeedComposerResponse | null;

      if (response.status === 401) {
        window.sessionStorage.setItem(
          pendingPostStorageKey,
          JSON.stringify({
            body,
            category: selectedCategory,
            hadPhotos: photos.length > 0,
            tags,
            topicSource,
            visibility,
          }),
        );
        setStatus({
          message: "로그인 후 게시할 수 있어요.",
          status: "notice",
        });
        const resumePath = standalone
          ? "/feed/new?resumeFeed=post"
          : "/feed?resumeFeed=post";
        router.push(
          `/login?next=${encodeURIComponent(resumePath)}&reason=community`,
        );
        return;
      }

      if (
        payload &&
        "error" in payload &&
        payload.error === "feature_closed" &&
        "display" in payload
      ) {
        setStatus({
          message: payload.display.message,
          status: "notice",
        });
        return;
      }

      if (!response.ok) {
        setStatus({
          message: payload?.message ?? "게시 상태를 확인하지 못했어요.",
          status: "error",
        });
        return;
      }

      clearPhotos();
      setBody("");
      setSelectedCategory(null);
      setTags([]);
      setTopicSource("manual");
      setTopicNote(null);
      setVisibility("public");
      window.sessionStorage.removeItem(pendingPostStorageKey);
      const createdPostId =
        payload && "feedWrite" in payload ? payload.feedWrite?.id : undefined;
      const pendingReview =
        payload &&
        "feedWrite" in payload &&
        payload.feedWrite?.moderationStatus === "pending_review";
      router.push(
        pendingReview
          ? "/feed?review=pending"
          : createdPostId
            ? `/feed?posted=${encodeURIComponent(createdPostId)}`
            : "/feed?posted=complete",
      );
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 게시 상태를 확인하지 못했어요.",
        status: "error",
      });
    }
  }

  function openPreview() {
    if (photoPreparationPendingRef.current || !canSubmit) return;

    const url = new URL(window.location.href);
    url.searchParams.set("preview", "post");
    window.history.pushState(
      { ...window.history.state, feedComposerPreview: true },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    setAudienceOpen(false);
    setStatus({ status: "idle" });
    setComposerStep("preview");
  }

  function returnToEdit() {
    setComposerStep("edit");
    const url = new URL(window.location.href);
    if (url.searchParams.get("preview") === "post") {
      window.history.back();
    }
  }

  async function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0 || photoPreparationPendingRef.current)
      return;

    const existingPhotos = photos;
    const originalFiles = [
      ...existingPhotos.map((photo) => photo.originalFile),
      ...selectedFiles,
    ];
    const generation = photoPreparationGenerationRef.current + 1;
    photoPreparationGenerationRef.current = generation;
    photoPreparationPendingRef.current = true;
    setIsPhotoPreparing(true);
    setStatus({ status: "preparing" });

    try {
      const prepared = await prepareFeedMediaFiles(originalFiles);
      if (photoPreparationGenerationRef.current !== generation) return;
      if (prepared.files.length !== originalFiles.length) {
        throw new Error(
          "Prepared photo count does not match the source batch.",
        );
      }

      const nextUrls: string[] = [];
      try {
        prepared.files.forEach((file) => {
          nextUrls.push(URL.createObjectURL(file));
        });
      } catch (error) {
        nextUrls.forEach((url) => URL.revokeObjectURL(url));
        throw error;
      }

      const nextPhotos = prepared.files.map((file, index) => ({
        file,
        id: existingPhotos[index]?.id ?? createPhotoId(),
        originalFile: originalFiles[index],
        previewUrl: nextUrls[index],
      }));
      const previousUrls = objectUrlsRef.current;
      objectUrlsRef.current = nextUrls;
      setPhotos(nextPhotos);
      setSelectedPhotoId((current) => current ?? nextPhotos[0]?.id ?? null);
      setStatus({ status: "idle" });
      previousUrls.forEach((url) => URL.revokeObjectURL(url));
    } catch (error) {
      if (photoPreparationGenerationRef.current !== generation) return;
      setStatus({
        message: getFeedMediaClientOptimizationMessage(error),
        status: "error",
      });
    } finally {
      if (photoPreparationGenerationRef.current === generation) {
        photoPreparationPendingRef.current = false;
        setIsPhotoPreparing(false);
      }
    }
  }

  function handleBodyChange(value: string) {
    const extracted = extractCompletedFeedTags(value, tags);
    setBody(extracted.body);
    setTags(extracted.tags);

    if (extracted.limitReached) {
      setStatus({
        message: `태그는 최대 ${maxFeedTagCount}개까지 추가할 수 있어요.`,
        status: "error",
      });
    } else if (status.status === "error") {
      setStatus({ status: "idle" });
    }
  }

  function removeTag(tagToRemove: string) {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  }

  function removeSelectedPhoto() {
    if (!selectedPhoto || photoPreparationPendingRef.current) return;
    URL.revokeObjectURL(selectedPhoto.previewUrl);
    objectUrlsRef.current = objectUrlsRef.current.filter(
      (url) => url !== selectedPhoto.previewUrl,
    );
    setPhotos((current) => {
      const remaining = current.filter(
        (photo) => photo.id !== selectedPhoto.id,
      );
      setSelectedPhotoId(remaining[0]?.id ?? null);
      return remaining;
    });
  }

  function setSelectedPhotoAsCover() {
    if (
      !selectedPhoto ||
      photoPreparationPendingRef.current ||
      photos[0]?.id === selectedPhoto.id
    ) {
      return;
    }
    setPhotos((current) => [
      selectedPhoto,
      ...current.filter((photo) => photo.id !== selectedPhoto.id),
    ]);
  }

  async function recommendCategory() {
    if (!canRecommendCategory) return;
    setRecommendingTopic(true);
    setTopicNote("글과 사진을 기기 안에서 살펴보고 있어요.");

    try {
      const imageHints = await analyzeLocalFeedImages(
        photos.map((photo) => photo.file),
      );
      const topic = suggestFeedTopic({
        body: trimmedBody,
        imageHints,
        photoCount: photos.length,
      });
      setSelectedCategory(topic.category);
      setTopicSource("local_suggestion");
      setTopicNote(
        "글과 가까운 주제를 선택했어요. 다른 주제로 바로 바꿀 수 있어요.",
      );
    } catch {
      const topic = suggestFeedTopic({
        body: trimmedBody,
        photoCount: photos.length,
      });
      setSelectedCategory(topic.category);
      setTopicSource("local_suggestion");
      setTopicNote(
        "글을 중심으로 주제를 골랐어요. 원하면 바로 바꿀 수 있어요.",
      );
    } finally {
      setRecommendingTopic(false);
    }
  }

  function selectComposerSpace(nextSpace: ComposerSpace) {
    setComposerSpace(nextSpace);
    setAudienceOpen(false);
    setStatus({ status: "idle" });

    if (!standalone) return;

    const url = new URL(window.location.href);
    if (nextSpace === "playground") {
      url.searchParams.set("space", "playground");
    } else {
      url.searchParams.delete("space");
    }
    window.history.replaceState(
      { ...window.history.state, feedComposerSpace: nextSpace },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  function closeComposer() {
    setAudienceOpen(false);
    clientRequestRef.current = null;
    if (standalone) {
      router.push("/feed");
      return;
    }
    setOpen(false);
    setStatus({ status: "idle" });
    window.setTimeout(() => launchButtonRef.current?.focus(), 0);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (!standalone && event.target === event.currentTarget) closeComposer();
  }

  function clearPhotos() {
    clientRequestRef.current = null;
    for (const photo of photos) URL.revokeObjectURL(photo.previewUrl);
    objectUrlsRef.current = [];
    setPhotos([]);
    setSelectedPhotoId(null);
  }

  return (
    <section
      className={cn(styles.composer, standalone && styles.standaloneComposer)}
      id="feed-composer"
    >
      {!standalone ? (
        <button
          aria-label="새 게시물 쓰기"
          className={styles.launchButton}
          onClick={() => router.push("/feed/new")}
          ref={launchButtonRef}
          type="button"
        >
          <span aria-hidden="true" className={styles.launchAvatar}>
            나
          </span>
          <span className={styles.launchCopy}>
            <strong>오늘의 이야기를 나눠보세요</strong>
          </span>
          <span aria-hidden="true" className={styles.launchCta}>
            <PenLine size={16} strokeWidth={2} />
            글쓰기
          </span>
        </button>
      ) : null}

      {!open ? <ComposerStatusMessage status={status} /> : null}

      {open ? (
        <div
          className={cn(
            styles.backdrop,
            standalone && styles.standaloneBackdrop,
          )}
          onMouseDown={handleBackdropClick}
        >
          {composerStep === "preview" ? (
            <ComposerPreview
              body={trimmedBody}
              category={selectedCategory}
              onEdit={returnToEdit}
              onUpload={handleUpload}
              photos={photos}
              status={status}
              tags={tags}
              pendingExternalLinkCount={pendingExternalLinkCount}
              visibilityLabel={visibilityLabel}
            />
          ) : (
            <section
              aria-labelledby="feed-composer-title"
              aria-modal={standalone ? undefined : "true"}
              className={cn(styles.sheet, standalone && styles.standaloneSheet)}
              role={standalone ? undefined : "dialog"}
            >
              <header className={styles.sheetHeader}>
                <button
                  aria-label="글쓰기 닫기"
                  className={styles.closeButton}
                  onClick={closeComposer}
                  type="button"
                >
                  <X aria-hidden="true" size={22} strokeWidth={1.9} />
                </button>
                <h2 id="feed-composer-title">글쓰기</h2>
                {composerSpace === "daily" ? (
                  <button
                    className={styles.publishButton}
                    disabled={!canSubmit}
                    onClick={openPreview}
                    type="button"
                  >
                    업로드
                  </button>
                ) : (
                  <span aria-hidden="true" className={styles.headerSpacer} />
                )}
              </header>

              <nav
                aria-label="글쓰기 공간"
                className={styles.composerModeNav}
                role="tablist"
              >
                <button
                  aria-controls="daily-composer-panel"
                  aria-selected={composerSpace === "daily"}
                  id="daily-composer-tab"
                  onClick={() => selectComposerSpace("daily")}
                  role="tab"
                  type="button"
                >
                  일상
                </button>
                <button
                  aria-controls="playground-composer-panel"
                  aria-selected={composerSpace === "playground"}
                  id="playground-composer-tab"
                  onClick={() => selectComposerSpace("playground")}
                  role="tab"
                  type="button"
                >
                  놀이터
                </button>
                <span
                  aria-hidden="true"
                  data-space={composerSpace}
                  className={styles.composerModeIndicator}
                />
              </nav>

              <form
                className={styles.composerForm}
                id="daily-composer-panel"
                hidden={composerSpace !== "daily"}
                onSubmit={(event) => event.preventDefault()}
                aria-labelledby="daily-composer-tab"
                role="tabpanel"
              >
                <div className={styles.identityRow}>
                  <span aria-hidden="true" className={styles.identityAvatar}>
                    나
                  </span>
                  <Link className={styles.identityProfileLink} href="/feed/me">
                    <strong>나</strong>
                  </Link>
                  <button
                    className={styles.audienceButton}
                    onClick={() => setAudienceOpen(true)}
                    type="button"
                  >
                    <Globe2 aria-hidden="true" size={15} />
                    {visibilityLabel}
                  </button>
                </div>

                <label className="sr-only" htmlFor="feed-composer-body">
                  글 내용
                </label>
                <div className={styles.editorWrap}>
                  <textarea
                    className={styles.bodyInput}
                    id="feed-composer-body"
                    maxLength={800}
                    onChange={(event) => handleBodyChange(event.target.value)}
                    placeholder="지금 나누고 싶은 생각이나 경험이 있나요?"
                    ref={textareaRef}
                    rows={6}
                    value={body}
                  />
                  {body.length >= 700 ? (
                    <span className={styles.characterCount}>
                      {body.length} / 800
                    </span>
                  ) : null}
                </div>

                {tags.length > 0 ? (
                  <div aria-label="추가한 태그" className={styles.tagChips}>
                    {tags.map((tag) => (
                      <button
                        aria-label={`${tag} 태그 삭제`}
                        key={tag}
                        onClick={() => removeTag(tag)}
                        type="button"
                      >
                        <span>#{tag}</span>
                        <X aria-hidden="true" size={13} strokeWidth={2.2} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={styles.tagHint}>
                    <strong>#태그</strong>를 추가해서 추천 알고리즘을 조정할 수
                    있어요.
                  </p>
                )}

                <FeedTopicSelector
                  canRecommend={canRecommendCategory}
                  layout="embedded"
                  note={topicNote}
                  onChange={(category) => {
                    setSelectedCategory(category);
                    setTopicSource("manual");
                    setTopicNote(null);
                  }}
                  onRecommend={recommendCategory}
                  recommending={recommendingTopic}
                  selectedCategory={selectedCategory}
                />

                {selectedPhoto ? (
                  <section className={styles.photoSection}>
                    <div className={styles.photoHeading}>
                      <strong>사진</strong>
                    </div>
                    <div className={styles.photoStage}>
                      {photos[0]?.id === selectedPhoto.id ? (
                        <span className={styles.coverBadge}>대표 사진</span>
                      ) : null}
                      <span className={styles.photoCounter}>
                        {photos.findIndex(
                          (photo) => photo.id === selectedPhoto.id,
                        ) + 1}{" "}
                        / {photos.length}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="선택한 게시물 사진 미리보기"
                        src={selectedPhoto.previewUrl}
                      />
                    </div>
                    <div className={styles.photoActions}>
                      <button
                        disabled={
                          isPhotoPreparing || photos[0]?.id === selectedPhoto.id
                        }
                        onClick={setSelectedPhotoAsCover}
                        type="button"
                      >
                        <ImageUp aria-hidden="true" size={16} />
                        {photos[0]?.id === selectedPhoto.id
                          ? "대표 사진"
                          : "대표로 설정"}
                      </button>
                      <button
                        disabled={isPhotoPreparing}
                        onClick={removeSelectedPhoto}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                        삭제
                      </button>
                    </div>
                    <div className={styles.thumbnailStrip}>
                      {photos.map((photo, index) => (
                        <button
                          aria-label={`${index + 1}번째 사진 선택`}
                          aria-pressed={photo.id === selectedPhoto.id}
                          className={styles.thumbnailButton}
                          key={photo.id}
                          onClick={() => setSelectedPhotoId(photo.id)}
                          type="button"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img alt="" src={photo.previewUrl} />
                          <span>{index + 1}</span>
                        </button>
                      ))}
                      {photos.length < maxFeedPhotoCount ? (
                        <button
                          aria-label="사진 더 추가"
                          className={styles.addPhotoTile}
                          disabled={isPhotoPreparing}
                          onClick={() => fileInputRef.current?.click()}
                          type="button"
                        >
                          <Plus aria-hidden="true" size={20} />
                        </button>
                      ) : null}
                    </div>
                    <p className={styles.photoPrivacyNote}>
                      <ShieldCheck aria-hidden="true" size={14} />
                      사진에 위치 정보가 포함될 수 있어요. 다른 사람의 얼굴과
                      위치 정보는 게시 전 확인해 주세요.
                    </p>
                  </section>
                ) : (
                  <section className={styles.emptyPhotoSection}>
                    <div className={styles.photoHeading}>
                      <strong>사진</strong>
                      <span>최대 {maxFeedPhotoCount}장</span>
                    </div>
                    <button
                      aria-label="사진 추가"
                      className={styles.emptyPhotoTile}
                      disabled={isPhotoPreparing}
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <span aria-hidden="true">
                        <Plus size={23} strokeWidth={1.8} />
                      </span>
                      <strong>사진 추가</strong>
                    </button>
                    <p className={styles.photoPrivacyNote}>
                      <ShieldCheck aria-hidden="true" size={14} />
                      다른 사람의 얼굴과 위치 정보는 게시 전 확인해 주세요.
                    </p>
                  </section>
                )}

                <ComposerStatusMessage status={status} />
              </form>

              {composerSpace === "playground" ? (
                <section
                  aria-labelledby="playground-composer-tab playground-composer-heading"
                  className={styles.playgroundComposer}
                  id="playground-composer-panel"
                  role="tabpanel"
                >
                  <div className={styles.playgroundHeading}>
                    <h3 id="playground-composer-heading">
                      어떤 글을 만들까요?
                    </h3>
                  </div>

                  <div className={styles.playgroundTypeList}>
                    {playgroundComposerTypes.map((item) => {
                      const Icon = item.icon;

                      return (
                        <Link
                          className={styles.playgroundType}
                          href={item.href}
                          key={item.href}
                        >
                          <span aria-hidden="true" className={styles.typeIcon}>
                            <Icon size={21} strokeWidth={1.65} />
                          </span>
                          <span className={styles.typeCopy}>
                            <strong>{item.label}</strong>
                            <small>{item.description}</small>
                          </span>
                          <ChevronRight
                            aria-hidden="true"
                            className={styles.typeChevron}
                            size={18}
                            strokeWidth={1.65}
                          />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {composerSpace === "daily" ? (
                <input
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  aria-label="게시물 사진 선택"
                  className="sr-only"
                  disabled={isPhotoPreparing}
                  multiple
                  onChange={handlePhotoSelection}
                  ref={fileInputRef}
                  type="file"
                />
              ) : null}

              {composerSpace === "daily" && audienceOpen ? (
                <BottomSheet
                  backdropLabel="공개 범위 닫기"
                  className={styles.audienceSheet}
                  dialogProps={{ "aria-label": "게시물 공개 범위" }}
                  onClose={() => setAudienceOpen(false)}
                >
                  <header>
                    <strong>공개 범위</strong>
                    <button
                      aria-label="공개 범위 닫기"
                      onClick={() => setAudienceOpen(false)}
                      type="button"
                    >
                      <X aria-hidden="true" size={19} />
                    </button>
                  </header>
                  {visibilityOptions.map((option) => (
                    <button
                      aria-pressed={visibility === option.value}
                      className={styles.audienceOption}
                      key={option.value}
                      onClick={() => {
                        setVisibility(option.value);
                        setAudienceOpen(false);
                      }}
                      type="button"
                    >
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                      <span
                        aria-hidden="true"
                        className={styles.audienceCheck}
                      />
                    </button>
                  ))}
                </BottomSheet>
              ) : null}
            </section>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ComposerPreview({
  body,
  category,
  onEdit,
  onUpload,
  photos,
  status,
  tags,
  pendingExternalLinkCount,
  visibilityLabel,
}: {
  body: string;
  category: FeedPostTopicCategory | null;
  onEdit: () => void;
  onUpload: () => void;
  photos: ComposerPhoto[];
  status: ComposerStatus;
  tags: string[];
  pendingExternalLinkCount: number;
  visibilityLabel: string;
}) {
  return (
    <section
      aria-labelledby="feed-composer-preview-title"
      className={cn(styles.sheet, styles.standaloneSheet, styles.previewSheet)}
    >
      <header className={styles.previewHeader}>
        <button onClick={onEdit} type="button">
          <ArrowLeft aria-hidden="true" size={19} strokeWidth={2} />
          수정하기
        </button>
        <h2 id="feed-composer-preview-title">게시물 미리보기</h2>
        <span aria-hidden="true" />
      </header>

      <div className={styles.previewBody}>
        <article
          aria-label="게시물 최종 미리보기"
          className={styles.previewCard}
        >
          <header className={styles.previewIdentity}>
            <span aria-hidden="true" className={styles.identityAvatar}>
              나
            </span>
            <span>
              <strong>나</strong>
              <small>방금 전 · {visibilityLabel}</small>
            </span>
          </header>

          {category || tags.length > 0 ? (
            <div className={styles.previewTopics}>
              {category ? (
                <strong>{feedPostTopicLabels[category]}</strong>
              ) : null}
              {tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          ) : null}

          {body ? <p className={styles.previewCopy}>{body}</p> : null}

          {photos[0] ? (
            <div className={styles.previewMedia}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="업로드할 게시물 대표 사진" src={photos[0].previewUrl} />
              {photos.length > 1 ? <span>1 / {photos.length}</span> : null}
            </div>
          ) : null}

          <div aria-hidden="true" className={styles.previewActions}>
            <span>
              <Heart size={20} strokeWidth={1.8} />
            </span>
            <span>
              <MessageCircle size={20} strokeWidth={1.8} />
            </span>
            <span>
              <Send size={19} strokeWidth={1.8} />
            </span>
            <span>
              <Bookmark size={20} strokeWidth={1.8} />
            </span>
          </div>
        </article>

        <p className={styles.previewTrustNote}>
          <ShieldCheck aria-hidden="true" size={15} />
          검사 응답과 상세 점수는 게시물에 포함되지 않아요.
        </p>
        {pendingExternalLinkCount > 0 ? (
          <p className={styles.previewTrustNote}>
            <ShieldCheck aria-hidden="true" size={15} />
            처음 보는 사이트 링크 {pendingExternalLinkCount}개는 글과 함께
            게시되지만, 안전 확인 전까지 열리지 않아요.
          </p>
        ) : null}
        <ComposerStatusMessage status={status} />
      </div>

      <footer className={styles.previewFooter}>
        <button
          disabled={status.status === "pending"}
          onClick={onUpload}
          type="button"
        >
          {status.status === "pending" ? "업로드 중" : "업로드"}
        </button>
      </footer>
    </section>
  );
}

function buildCreatePostRequest({
  body,
  category,
  tags,
  topicSource,
  visibility,
}: {
  body: string;
  category: FeedPostTopicCategory | null;
  tags: string[];
  topicSource: FeedPostTopicSource;
  visibility: FeedVisibility;
}): CreateFeedPostRequest {
  return {
    action: "create_post",
    body,
    source: "free_text",
    topic:
      category || tags.length > 0
        ? { category, source: topicSource, tags }
        : undefined,
    visibility,
  };
}

function createPostRequestFingerprint(
  requestBody: CreateFeedPostRequest,
  photos: ComposerPhoto[],
) {
  return JSON.stringify({
    photos: photos.map((photo) => ({
      id: photo.id,
      lastModified: photo.file.lastModified,
      size: photo.file.size,
      type: photo.file.type,
    })),
    requestBody,
  });
}

function createPostRequestInit(
  requestBody: FeedWriteRequest,
  photos: ComposerPhoto[],
): RequestInit {
  if (photos.length === 0) {
    return {
      body: JSON.stringify(requestBody),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    };
  }

  const formData = new FormData();
  formData.set("payload", JSON.stringify(requestBody));
  photos.forEach((photo) =>
    formData.append("media", photo.file, photo.file.name),
  );

  return {
    body: formData,
    method: "POST",
  };
}

function ComposerStatusMessage({ status }: { status: ComposerStatus }) {
  if (status.status === "idle") return null;

  return (
    <p
      aria-live="polite"
      className={cn(
        styles.status,
        status.status === "error" && styles.statusError,
      )}
      role={status.status === "error" ? "alert" : "status"}
    >
      {status.status === "pending"
        ? "게시물을 업로드하고 있어요"
        : status.status === "preparing"
          ? "사진을 빠르게 올릴 수 있게 준비하고 있어요"
          : status.message}
    </p>
  );
}

function readPendingPost() {
  const value = window.sessionStorage.getItem(pendingPostStorageKey);

  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as {
      body?: unknown;
      category?: unknown;
      hadPhotos?: unknown;
      tags?: unknown;
      topicInput?: unknown;
      topicSource?: unknown;
      visibility?: unknown;
    };
    const visibility = visibilityOptions.some(
      (option) => option.value === parsed.visibility,
    )
      ? (parsed.visibility as FeedVisibility)
      : "public";
    const legacyTopic =
      typeof parsed.topicInput === "string"
        ? parseFeedTopicInput(parsed.topicInput)
        : null;
    const category = feedPostTopicCategories.includes(
      parsed.category as FeedPostTopicCategory,
    )
      ? (parsed.category as FeedPostTopicCategory)
      : (legacyTopic?.category ?? null);
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags
          .filter((tag): tag is string => typeof tag === "string")
          .slice(0, maxFeedTagCount)
      : (legacyTopic?.tags ?? []);

    return {
      body: typeof parsed.body === "string" ? parsed.body.slice(0, 800) : "",
      category,
      hadPhotos: parsed.hadPhotos === true,
      tags,
      topicSource:
        parsed.topicSource === "local_suggestion"
          ? "local_suggestion"
          : "manual",
      visibility,
    } as const;
  } catch {
    window.sessionStorage.removeItem(pendingPostStorageKey);
    return null;
  }
}

function clearPostResumeParams() {
  const url = new URL(window.location.href);
  ["auth", "resumeFeed"].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function createPhotoId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `photo-${Date.now()}-${Math.random()}`
  );
}

function createClientRequestId() {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `feed-${randomUuid}`;

  const randomBytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(randomBytes);
    return `feed-${Array.from(randomBytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")}`;
  }

  return `feed-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
