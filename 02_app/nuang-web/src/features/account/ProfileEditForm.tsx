"use client";

import { ArrowLeft, Camera, Check, ImageOff, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  nuangCharacterAssetPaths,
  nuangCharacterMotifs,
  type NuangCharacterMotif,
} from "@/components/character/nuang-character-assets";
import { readJsonResponse } from "@/features/account/response-json";
import type { PublicProfileImage } from "@/features/public-profile/profile-image";
import styles from "./ProfileEditForm.module.css";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_BIO_LENGTH = 120;
const MAX_DISPLAY_NAME_LENGTH = 20;
const MAX_HANDLE_LENGTH = 24;
const MIN_DISPLAY_NAME_LENGTH = 2;
const MIN_HANDLE_LENGTH = 3;
const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type EditableProfile = {
  avatar: PublicProfileImage;
  avatarCharacterKey: NuangCharacterMotif;
  bio: string;
  code: string | null;
  displayName: string;
  handle: string;
  profileName: string | null;
  publicId: string;
  revision: number;
};

type ProfileSuccessResponse = {
  ok: true;
  profile: EditableProfile;
};

type ProfileFailureResponse = {
  code?: string;
  message?: string;
  ok: false;
  retryable?: boolean;
};

type FormNotice = { message: string; tone: "error" | "success" } | null;

export function ProfileEditForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarCharacterKey, setAvatarCharacterKey] =
    useState<NuangCharacterMotif>("purple");
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<FormNotice>(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/me/profile", {
        cache: "no-store",
        method: "GET",
      });
      const payload = await readJsonResponse<
        ProfileSuccessResponse | ProfileFailureResponse
      >(response);

      if (response.status === 401) {
        router.replace("/login?next=%2Fmy%2Fprofile%2Fedit&reason=profile");
        return;
      }

      if (!response.ok || !payload || payload.ok !== true) {
        const failure = payload?.ok === false ? payload : null;
        setNotice({
          message:
            failure?.message ??
            "프로필을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
          tone: "error",
        });
        return;
      }

      setProfile(payload.profile);
      setDisplayName(payload.profile.displayName);
      setHandle(payload.profile.handle);
      setBio(payload.profile.bio);
      setAvatarCharacterKey(payload.profile.avatarCharacterKey ?? "purple");
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setRemoveAvatar(false);
    } catch {
      setNotice({
        message: "연결이 불안정해요. 인터넷 연결을 확인해 주세요.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProfile(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const trimmedDisplayName = displayName.trim();
  const trimmedHandle = handle.trim();
  const trimmedBio = bio.trim();
  const displayNameError = getDisplayNameError(trimmedDisplayName);
  const handleError = getHandleError(trimmedHandle);
  const hasChanges = Boolean(
    profile &&
    (trimmedDisplayName !== profile.displayName ||
      trimmedHandle !== profile.handle ||
      trimmedBio !== profile.bio ||
      avatarFile ||
      removeAvatar ||
      avatarCharacterKey !== profile.avatarCharacterKey),
  );
  const canSave = Boolean(
    profile && hasChanges && !displayNameError && !handleError && !saving,
  );
  const avatarSrc =
    avatarPreviewUrl ??
    (removeAvatar
      ? nuangCharacterAssetPaths[avatarCharacterKey]
      : (profile?.avatar.src ?? nuangCharacterAssetPaths[avatarCharacterKey]));
  const avatarAlt = avatarPreviewUrl
    ? "새 프로필 사진 미리보기"
    : removeAvatar
      ? "뉴앙 기본 프로필 캐릭터"
      : (profile?.avatar.alt ?? "뉴앙 기본 프로필 캐릭터");
  const hasCustomAvatar = Boolean(
    avatarFile || (profile?.avatar.source !== "character" && !removeAvatar),
  );

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasChanges || saving) return;
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasChanges, saving]);

  function requestExit() {
    if (hasChanges && !saving) {
      setExitConfirmOpen(true);
      return;
    }

    router.push("/my");
  }

  function handleAvatarSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    if (!allowedAvatarTypes.has(file.type)) {
      setNotice({
        message: "JPG, PNG, WebP 형식의 사진을 선택해 주세요.",
        tone: "error",
      });
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setNotice({
        message: "프로필 사진은 5MB 이하로 선택해 주세요.",
        tone: "error",
      });
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setAvatarFile(file);
    setAvatarPreviewUrl(nextPreviewUrl);
    setRemoveAvatar(false);
    setNotice(null);
  }

  function useDefaultAvatar() {
    setCharacterPickerOpen(true);
    setNotice(null);
  }

  function chooseCharacter(motif: NuangCharacterMotif) {
    setAvatarCharacterKey(motif);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setRemoveAvatar(true);
    setCharacterPickerOpen(false);
    setNotice(null);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !canSave) return;

    setSaving(true);
    setNotice(null);

    const formData = new FormData();
    formData.set("displayName", trimmedDisplayName);
    formData.set("handle", trimmedHandle);
    formData.set("bio", trimmedBio);
    formData.set("expectedRevision", String(profile.revision));
    formData.set("removeAvatar", String(removeAvatar));
    formData.set("avatarCharacterKey", avatarFile ? "" : avatarCharacterKey);
    if (avatarFile) formData.set("avatar", avatarFile);

    try {
      const response = await fetch("/api/me/profile", {
        body: formData,
        method: "PATCH",
      });
      const payload = await readJsonResponse<
        ProfileSuccessResponse | ProfileFailureResponse
      >(response);

      if (response.status === 401) {
        router.replace("/login?next=%2Fmy%2Fprofile%2Fedit&reason=profile");
        return;
      }

      if (!response.ok || !payload || payload.ok !== true) {
        const failure = payload?.ok === false ? payload : null;
        setNotice({
          message: getSaveFailureMessage(failure),
          tone: "error",
        });
        return;
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setProfile(payload.profile);
      setDisplayName(payload.profile.displayName);
      setHandle(payload.profile.handle);
      setBio(payload.profile.bio);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setRemoveAvatar(false);
      setAvatarCharacterKey(payload.profile.avatarCharacterKey ?? "purple");
      setNotice({ message: "프로필을 저장했어요.", tone: "success" });
      router.push("/my");
      router.refresh();
    } catch {
      setNotice({
        message:
          "연결이 불안정해요. 입력한 내용은 그대로 두었으니 다시 시도해 주세요.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button
          aria-label="마이로 돌아가기"
          onClick={requestExit}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </button>
        <h1>프로필 편집</h1>
        <button
          className={styles.saveButton}
          disabled={!canSave}
          form="profile-edit-form"
          type="submit"
        >
          {saving ? "저장 중" : "저장"}
        </button>
      </header>

      {loading ? (
        <ProfileEditLoading />
      ) : profile ? (
        <form id="profile-edit-form" onSubmit={saveProfile}>
          <section className={styles.photoSection}>
            <div className={styles.avatarFrame}>
              {/* Blob previews and user-controlled remote URLs need a plain image element. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={avatarAlt} src={avatarSrc} />
              <button
                aria-label="프로필 사진 선택"
                className={styles.cameraButton}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Camera aria-hidden="true" size={17} strokeWidth={1.8} />
              </button>
            </div>
            <button
              className={styles.changePhotoButton}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              사진 변경
            </button>
            {hasCustomAvatar ? (
              <button
                className={styles.defaultPhotoButton}
                onClick={useDefaultAvatar}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={14} strokeWidth={1.7} />
                기본 캐릭터 사용
              </button>
            ) : (
              <>
                <button
                  className={styles.defaultPhotoButton}
                  onClick={useDefaultAvatar}
                  type="button"
                >
                  기본 캐릭터 바꾸기
                </button>
                <p className={styles.photoHint}>
                  원하는 뉴앙 캐릭터를 프로필로 사용해 보세요.
                </p>
              </>
            )}
            {characterPickerOpen ? (
              <div
                aria-label="기본 캐릭터 선택"
                className={styles.characterPicker}
                role="radiogroup"
              >
                {nuangCharacterMotifs.map((motif) => (
                  <button
                    aria-checked={avatarCharacterKey === motif}
                    aria-label={`${getCharacterLabel(motif)} 캐릭터 선택`}
                    className={styles.characterChoice}
                    key={motif}
                    onClick={() => chooseCharacter(motif)}
                    role="radio"
                    type="button"
                  >
                    <span className={styles.characterImage}>
                      <Image
                        alt={`${getCharacterLabel(motif)} 뉴앙 캐릭터`}
                        height={42}
                        src={nuangCharacterAssetPaths[motif]}
                        width={42}
                      />
                      {avatarCharacterKey === motif ? (
                        <i aria-hidden="true">
                          <Check size={11} strokeWidth={2.4} />
                        </i>
                      ) : null}
                    </span>
                    <span>{getCharacterLabel(motif)}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <input
              accept="image/jpeg,image/png,image/webp"
              aria-label="프로필 사진 파일"
              className="sr-only"
              onChange={handleAvatarSelection}
              ref={fileInputRef}
              type="file"
            />
          </section>

          <section className={styles.fieldsSection}>
            <div className={styles.sectionHeading}>
              <strong>기본 정보</strong>
              <p>프로필과 내가 쓴 게시물에 함께 보여요.</p>
            </div>

            <ProfileField
              error={displayNameError}
              hint="2~20자로 입력해 주세요."
              id="profile-display-name"
              label="이름"
            >
              <input
                aria-describedby="profile-display-name-help"
                aria-invalid={Boolean(displayNameError)}
                autoComplete="nickname"
                id="profile-display-name"
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setNotice(null);
                }}
                required
                value={displayName}
              />
            </ProfileField>

            <ProfileField
              error={handleError}
              hint="영문 소문자, 숫자, 점과 밑줄로 3~24자"
              id="profile-handle"
              label="아이디"
            >
              <div className={styles.handleInput}>
                <span aria-hidden="true">@</span>
                <input
                  aria-describedby="profile-handle-help"
                  aria-invalid={Boolean(handleError)}
                  autoCapitalize="none"
                  autoComplete="username"
                  id="profile-handle"
                  maxLength={MAX_HANDLE_LENGTH}
                  onChange={(event) => {
                    setHandle(
                      event.target.value.replace(/^@/, "").toLowerCase(),
                    );
                    setNotice(null);
                  }}
                  required
                  spellCheck={false}
                  value={handle}
                />
              </div>
            </ProfileField>

            <ProfileField
              counter={`${bio.length}/${MAX_BIO_LENGTH}`}
              hint="좋아하는 것, 요즘의 관심사처럼 나를 소개해 보세요."
              id="profile-bio"
              label="프로필 메시지"
            >
              <textarea
                aria-describedby="profile-bio-help profile-bio-counter"
                id="profile-bio"
                maxLength={MAX_BIO_LENGTH}
                onChange={(event) => {
                  setBio(event.target.value);
                  setNotice(null);
                }}
                placeholder="나를 편하게 소개해 주세요"
                rows={4}
                value={bio}
              />
            </ProfileField>
          </section>

          <section className={styles.traitSection}>
            <div>
              <span>내 뉴앙 코드</span>
              <strong>{profile.code ?? "검사 결과 없음"}</strong>
              {profile.profileName ? <p>{profile.profileName}</p> : null}
            </div>
            <p>
              성향 정보는 프로필 편집이 아닌 검사 결과에서 관리해요. 공개 여부는
              설정의 공개 정보에서 바꿀 수 있어요.
            </p>
          </section>

          {notice ? (
            <p
              aria-live="polite"
              className={styles.notice}
              data-tone={notice.tone}
              role={notice.tone === "error" ? "alert" : "status"}
            >
              {notice.message}
            </p>
          ) : null}
        </form>
      ) : (
        <section className={styles.loadError}>
          <span aria-hidden="true">
            <ImageOff size={23} strokeWidth={1.7} />
          </span>
          <strong>프로필을 불러오지 못했어요</strong>
          <p>{notice?.message ?? "잠시 뒤 다시 시도해 주세요."}</p>
          <button
            onClick={() => {
              setLoading(true);
              setNotice(null);
              void loadProfile();
            }}
            type="button"
          >
            다시 불러오기
          </button>
        </section>
      )}

      {exitConfirmOpen ? (
        <div
          className={styles.dialogBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setExitConfirmOpen(false);
          }}
        >
          <section
            aria-labelledby="profile-exit-title"
            aria-modal="true"
            className={styles.dialog}
            role="dialog"
          >
            <strong id="profile-exit-title">수정한 내용을 나갈까요?</strong>
            <p>아직 저장하지 않은 변경 사항은 사라져요.</p>
            <div>
              <button
                className={styles.exitButton}
                onClick={() => router.push("/my")}
                type="button"
              >
                나가기
              </button>
              <button
                autoFocus
                className={styles.keepEditingButton}
                onClick={() => setExitConfirmOpen(false)}
                type="button"
              >
                계속 편집
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function ProfileField({
  children,
  counter,
  error,
  hint,
  id,
  label,
}: {
  children: React.ReactNode;
  counter?: string;
  error?: string | null;
  hint: string;
  id: string;
  label: string;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldHeading}>
        <label htmlFor={id}>{label}</label>
        {counter ? <span id={`${id}-counter`}>{counter}</span> : null}
      </div>
      {children}
      <p data-error={Boolean(error)} id={`${id}-help`}>
        {error ?? hint}
      </p>
    </div>
  );
}

function ProfileEditLoading() {
  return (
    <section aria-live="polite" className={styles.loading} role="status">
      <span className={styles.loadingAvatar} />
      <span className={styles.loadingLine} />
      <span className={styles.loadingLine} />
      <span className={styles.loadingField} />
      <span className={styles.loadingField} />
      <p>프로필을 불러오는 중</p>
    </section>
  );
}

function getDisplayNameError(value: string) {
  if (value.length < MIN_DISPLAY_NAME_LENGTH) {
    return `이름은 ${MIN_DISPLAY_NAME_LENGTH}자 이상 입력해 주세요.`;
  }
  if (value.length > MAX_DISPLAY_NAME_LENGTH) {
    return `이름은 ${MAX_DISPLAY_NAME_LENGTH}자까지 입력할 수 있어요.`;
  }
  return null;
}

function getCharacterLabel(motif: NuangCharacterMotif) {
  return motif === "purple"
    ? "라일락"
    : motif === "flame"
      ? "코랄"
      : motif === "sun"
        ? "레몬"
        : motif === "water"
          ? "아쿠아"
          : "포레스트";
}

function getHandleError(value: string) {
  if (value.length < MIN_HANDLE_LENGTH || value.length > MAX_HANDLE_LENGTH) {
    return `아이디는 ${MIN_HANDLE_LENGTH}~${MAX_HANDLE_LENGTH}자로 입력해 주세요.`;
  }
  if (!/^[a-z0-9._]+$/.test(value)) {
    return "아이디에는 영문 소문자, 숫자, 점과 밑줄만 사용할 수 있어요.";
  }
  return null;
}

function getSaveFailureMessage(payload: ProfileFailureResponse | null) {
  if (payload?.code === "profile_handle_taken") {
    return "이미 사용 중인 아이디예요. 다른 아이디를 입력해 주세요.";
  }
  if (payload?.code === "profile_revision_conflict") {
    return "다른 화면에서 프로필이 변경됐어요. 다시 불러온 뒤 수정해 주세요.";
  }
  if (payload?.code === "avatar_invalid") {
    return payload.message ?? "프로필 사진을 확인하고 다시 선택해 주세요.";
  }
  return (
    payload?.message ??
    "프로필을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요."
  );
}
