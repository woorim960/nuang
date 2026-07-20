"use client";

import {
  ArrowLeft,
  Bookmark,
  Globe2,
  Heart,
  ImageUp,
  MessageCircle,
  PenLine,
  Plus,
  ScanSearch,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import { analyzeLocalFeedImages } from "@/features/feed/feed-image-analysis";
import {
  maxFeedPhotoCount,
  validateFeedPhotoFiles,
} from "@/features/feed/feed-media";
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
  | { message: string; status: "notice" }
  | { message: string; status: "error" };

type FeedComposerResponse =
  | ApiClosedPayload
  | {
      error?: string;
      feedWrite?: {
        id?: string;
      };
      message?: string;
      ok?: boolean;
    };

type ComposerPhoto = {
  file: File;
  id: string;
  previewUrl: string;
};

type ComposerStep = "edit" | "preview";

type FeedVisibility = Extract<
  FeedWriteRequest,
  { action: "create_post" }
>["visibility"];

const pendingPostStorageKey = "nuang:feed:pending-post";
const visibilityOptions: Array<{
  description: string;
  label: string;
  value: FeedVisibility;
}> = [
  {
    description: "커뮤니티의 모든 사용자가 볼 수 있어요.",
    label: "전체 공개",
    value: "public",
  },
  {
    description: "내 프로필에 들어온 사용자에게 보여요.",
    label: "프로필 공개",
    value: "profile_public",
  },
  {
    description: "나만 볼 수 있는 기록으로 남겨요.",
    label: "나만 보기",
    value: "private_draft",
  },
];

export function FeedComposer({ standalone = false }: { standalone?: boolean }) {
  const router = useRouter();
  const launchButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(standalone);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [status, setStatus] = useState<ComposerStatus>({ status: "idle" });
  const [selectedCategory, setSelectedCategory] =
    useState<FeedPostTopicCategory | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [topicSource, setTopicSource] = useState<FeedPostTopicSource>("manual");
  const [recommendingTopic, setRecommendingTopic] = useState(false);
  const [topicNote, setTopicNote] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<FeedVisibility>("public");
  const [composerStep, setComposerStep] = useState<ComposerStep>("edit");
  const trimmedBody = body.trim();
  const selectedPhoto =
    photos.find((photo) => photo.id === selectedPhotoId) ?? photos[0] ?? null;
  const visibilityLabel =
    visibilityOptions.find((option) => option.value === visibility)?.label ??
    "전체 공개";
  const canSubmit =
    status.status !== "pending" &&
    (trimmedBody.length >= 2 || photos.length > 0);
  const canRecommendCategory =
    !recommendingTopic && (trimmedBody.length > 0 || photos.length > 0);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url));
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
      const preview = new URLSearchParams(window.location.search).get("preview");
      setComposerStep(preview === "post" ? "preview" : "edit");
    };

    window.addEventListener("popstate", syncComposerStep);
    return () => window.removeEventListener("popstate", syncComposerStep);
  }, []);

  useEffect(() => {
    if (!open) return;

    const focusTimer =
      composerStep === "edit"
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
  }, [audienceOpen, composerStep, open, router, standalone]);

  async function handleUpload() {
    if (!canSubmit) {
      setStatus({
        message: "글이나 사진을 하나 이상 추가해 주세요.",
        status: "error",
      });
      return;
    }

    setStatus({ status: "pending" });

    try {
      const requestBody = buildCreatePostRequest({
        body: trimmedBody,
        category: selectedCategory,
        tags,
        topicSource,
        visibility,
      });
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
      router.push(
        createdPostId
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
    if (!canSubmit) return;

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

  function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    const allFiles = [...photos.map((photo) => photo.file), ...selectedFiles];
    const validationMessage = validateFeedPhotoFiles(allFiles);

    if (validationMessage) {
      setStatus({ message: validationMessage, status: "error" });
      return;
    }

    const createdPhotos = selectedFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(previewUrl);
      return {
        file,
        id: createPhotoId(),
        previewUrl,
      };
    });

    setPhotos((current) => [...current, ...createdPhotos]);
    setSelectedPhotoId((current) => current ?? createdPhotos[0]?.id ?? null);
    setStatus({ status: "idle" });
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
    if (!selectedPhoto) return;
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
    if (!selectedPhoto || photos[0]?.id === selectedPhoto.id) return;
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

  function closeComposer() {
    setAudienceOpen(false);
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
            <small>글과 사진을 한곳에서 나눠요</small>
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
              visibilityLabel={visibilityLabel}
            />
          ) : (
            <section
              aria-labelledby="feed-composer-title"
              aria-modal={standalone ? undefined : "true"}
              className={cn(
                styles.sheet,
                standalone && styles.standaloneSheet,
              )}
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
              <h2 id="feed-composer-title">새 게시물</h2>
              <button
                className={styles.publishButton}
                disabled={!canSubmit}
                onClick={openPreview}
                type="button"
              >
                업로드
              </button>
            </header>

            <form
              className={styles.composerForm}
              id="feed-composer-form"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className={styles.identityRow}>
                <span aria-hidden="true" className={styles.identityAvatar}>
                  나
                </span>
                <Link className={styles.identityProfileLink} href="/feed/me">
                  <strong>나</strong>
                  <span>내 프로필 보기</span>
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

              <p className={styles.trustNote}>
                <ShieldCheck aria-hidden="true" size={15} />
                성향 상세 점수와 검사 응답은 게시물에 공개되지 않아요.
              </p>

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

              <section className={styles.topicSection}>
                <div className={styles.topicHeading}>
                  <div>
                    <strong>주제</strong>
                    <span>하나만 선택</span>
                  </div>
                  <button
                    className={styles.topicRecommendButton}
                    disabled={!canRecommendCategory}
                    onClick={recommendCategory}
                    type="button"
                  >
                    <ScanSearch aria-hidden="true" size={15} />
                    {recommendingTopic ? "추천 중" : "추천"}
                  </button>
                </div>
                <div
                  aria-label="게시물 주제"
                  className={styles.categoryScroller}
                  role="radiogroup"
                >
                  {feedPostTopicCategories.map((category) => (
                    <button
                      aria-checked={selectedCategory === category}
                      aria-label={`${feedPostTopicLabels[category]} 주제`}
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                        setTopicSource("manual");
                        setTopicNote(null);
                      }}
                      role="radio"
                      type="button"
                    >
                      {feedPostTopicLabels[category]}
                    </button>
                  ))}
                </div>
                {topicNote ? (
                  <p className={styles.topicNote}>{topicNote}</p>
                ) : null}
              </section>

              {selectedPhoto ? (
                <section className={styles.photoSection}>
                  <div className={styles.photoHeading}>
                    <strong>사진</strong>
                    <span>첫 사진이 대표로 보여요</span>
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
                      disabled={photos[0]?.id === selectedPhoto.id}
                      onClick={setSelectedPhotoAsCover}
                      type="button"
                    >
                      <ImageUp aria-hidden="true" size={16} />
                      {photos[0]?.id === selectedPhoto.id
                        ? "대표 사진"
                        : "대표로 설정"}
                    </button>
                    <button onClick={removeSelectedPhoto} type="button">
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
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        <Plus aria-hidden="true" size={20} />
                      </button>
                    ) : null}
                  </div>
                  <p className={styles.photoPrivacyNote}>
                    <ShieldCheck aria-hidden="true" size={14} />
                    사진에 위치 정보가 포함될 수 있어요. 다른 사람의 얼굴과 위치
                    정보는 게시 전 확인해 주세요.
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

            <input
              accept="image/jpeg,image/png,image/webp"
              aria-label="게시물 사진 선택"
              className="sr-only"
              multiple
              onChange={handlePhotoSelection}
              ref={fileInputRef}
              type="file"
            />

            {audienceOpen ? (
              <div
                className={styles.audienceBackdrop}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget)
                    setAudienceOpen(false);
                }}
              >
                <section
                  aria-label="게시물 공개 범위"
                  className={styles.audienceSheet}
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
                </section>
              </div>
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
  visibilityLabel,
}: {
  body: string;
  category: FeedPostTopicCategory | null;
  onEdit: () => void;
  onUpload: () => void;
  photos: ComposerPhoto[];
  status: ComposerStatus;
  tags: string[];
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
        <div className={styles.previewIntro}>
          <span>업로드 전 마지막 확인</span>
          <strong>커뮤니티에서는 이렇게 보여요</strong>
          <p>내용과 사진, 주제와 공개 범위를 확인해 주세요.</p>
        </div>

        <article aria-label="게시물 최종 미리보기" className={styles.previewCard}>
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
              {photos.length > 1 ? (
                <span>1 / {photos.length}</span>
              ) : null}
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
}): FeedWriteRequest {
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
