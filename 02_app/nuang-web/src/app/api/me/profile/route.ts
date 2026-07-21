import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  communityProfileAvatarBucket,
  communityProfileAvatarMaxBytes,
  communityProfileTextSchema,
  isSupportedCommunityAvatarType,
} from "@/features/account/community-profile";
import {
  createCommunityProfileEditorPayload,
  ensureCommunityProfile,
  updateCommunityProfile,
} from "@/features/account/server-community-profile";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const maxMultipartBytes = communityProfileAvatarMaxBytes + 512 * 1024;
const avatarOutputSize = 512;

export async function GET() {
  const context = await getProfileContext();
  if (!context.ok) return context.response;

  const payload = await createCommunityProfileEditorPayload({
    client: context.client,
    profile: context.profile,
  });

  return profileSuccess(payload);
}

export async function PATCH(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxMultipartBytes) {
    return profileFailure({
      code: "avatar_invalid",
      message: "프로필 사진은 5MB 이하로 선택해 주세요.",
      status: 413,
    });
  }

  const context = await getProfileContext();
  if (!context.ok) return context.response;

  const formData = await readProfileFormData(request);
  if (!formData.ok) return formData.response;

  const parsedText = communityProfileTextSchema.safeParse({
    bio: stringFormValue(formData.data, "bio"),
    displayName: stringFormValue(formData.data, "displayName"),
    expectedRevision: numberFormValue(formData.data, "expectedRevision"),
    handle: stringFormValue(formData.data, "handle"),
  });

  if (!parsedText.success) {
    return profileFailure({
      code: "profile_invalid",
      issues: parsedText.error.issues.map((issue) => ({
        message: issue.message,
        path: issue.path,
      })),
      message:
        parsedText.error.issues[0]?.message ??
        "프로필 정보를 다시 확인해 주세요.",
      status: 400,
    });
  }

  const avatarValue = formData.data.get("avatar");
  const avatar = isFileValue(avatarValue) ? avatarValue : null;
  const removeAvatar = booleanFormValue(formData.data, "removeAvatar");

  if (avatar && removeAvatar) {
    return profileFailure({
      code: "profile_invalid",
      message: "사진 변경과 삭제는 한 번에 하나만 선택해 주세요.",
      status: 400,
    });
  }

  let uploadedObjectPath: string | null = null;
  let avatarUpdate:
    | {
        bucket: string;
        objectPath: string;
      }
    | null
    | undefined;

  if (avatar) {
    const processedAvatar = await processAvatar(avatar);
    if (!processedAvatar.ok) return processedAvatar.response;

    uploadedObjectPath = `${context.profile.accountId}/${parsedText.data.expectedRevision + 1}-${randomUUID()}.webp`;
    const uploadResponse = await context.client.storage
      .from(communityProfileAvatarBucket)
      .upload(uploadedObjectPath, processedAvatar.data, {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadResponse.error) {
      return profileFailure({
        code: "profile_unavailable",
        message: "프로필 사진을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        retryable: true,
        status: 503,
      });
    }

    avatarUpdate = {
      bucket: communityProfileAvatarBucket,
      objectPath: uploadedObjectPath,
    };
  } else if (removeAvatar) {
    avatarUpdate = null;
  }

  const update = await updateCommunityProfile({
    avatar: avatarUpdate,
    bio: parsedText.data.bio,
    client: context.client,
    displayName: parsedText.data.displayName,
    expectedRevision: parsedText.data.expectedRevision,
    handle: parsedText.data.handle,
    profile: context.profile,
  });

  if (!update.ok) {
    if (uploadedObjectPath) {
      await removeAvatarObject(context.client, uploadedObjectPath);
    }

    if (update.code === "profile_handle_taken") {
      return profileFailure({
        code: update.code,
        message: "이미 사용 중인 사용자 ID예요. 다른 ID를 입력해 주세요.",
        status: 409,
      });
    }

    if (update.code === "profile_revision_conflict") {
      return profileFailure({
        code: update.code,
        message:
          "다른 화면에서 프로필이 먼저 바뀌었어요. 최신 정보를 불러온 뒤 다시 저장해 주세요.",
        status: 409,
      });
    }

    return profileFailure({
      code: update.code,
      message: "프로필을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      retryable: true,
      status: 503,
    });
  }

  const previousAvatarPath = context.profile.avatarObjectPath;
  const avatarChanged = avatarUpdate !== undefined;

  if (avatarChanged && previousAvatarPath) {
    await removeAvatarObject(context.client, previousAvatarPath);
  }

  const payload = await createCommunityProfileEditorPayload({
    client: context.client,
    profile: update.profile,
  });

  return profileSuccess(payload);
}

async function getProfileContext() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth;

  const client = createSupabaseServiceClient();
  if (!client) {
    return {
      ok: false as const,
      response: createApiClosedResponse("supabase_env_missing"),
    };
  }

  const profile = await ensureCommunityProfile({ client, user: auth.user });

  if (!profile) {
    return {
      ok: false as const,
      response: profileFailure({
        code: "profile_unavailable",
        message: "프로필을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        retryable: true,
        status: 503,
      }),
    };
  }

  return { client, ok: true as const, profile };
}

async function readProfileFormData(request: Request) {
  if (
    !(request.headers.get("content-type") ?? "").includes("multipart/form-data")
  ) {
    return {
      ok: false as const,
      response: profileFailure({
        code: "profile_invalid",
        message: "프로필 저장 형식을 확인하지 못했어요.",
        status: 400,
      }),
    };
  }

  try {
    return { data: await request.formData(), ok: true as const };
  } catch {
    return {
      ok: false as const,
      response: profileFailure({
        code: "profile_invalid",
        message: "프로필 정보를 읽지 못했어요. 다시 시도해 주세요.",
        status: 400,
      }),
    };
  }
}

async function processAvatar(file: File) {
  if (
    file.size <= 0 ||
    file.size > communityProfileAvatarMaxBytes ||
    !isSupportedCommunityAvatarType(file.type)
  ) {
    return {
      ok: false as const,
      response: profileFailure({
        code: "avatar_invalid",
        message: "5MB 이하의 JPG, PNG 또는 WEBP 사진을 선택해 주세요.",
        status: file.size > communityProfileAvatarMaxBytes ? 413 : 415,
      }),
    };
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    });
    const metadata = await image.metadata();
    const expectedFormat = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    }[file.type];

    if (
      metadata.format !== expectedFormat ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) > 1
    ) {
      throw new Error("Unsupported avatar payload");
    }

    const output = await image
      .rotate()
      .resize(avatarOutputSize, avatarOutputSize, {
        fit: "cover",
        position: "centre",
      })
      .webp({ effort: 4, quality: 86 })
      .toBuffer();

    return { data: output, ok: true as const };
  } catch {
    return {
      ok: false as const,
      response: profileFailure({
        code: "avatar_invalid",
        message: "사진 파일을 확인하지 못했어요. 다른 사진을 선택해 주세요.",
        status: 415,
      }),
    };
  }
}

async function removeAvatarObject(
  client: ReturnType<typeof createSupabaseServiceClient> extends infer T
    ? NonNullable<T>
    : never,
  objectPath: string,
) {
  const response = await client.storage
    .from(communityProfileAvatarBucket)
    .remove([objectPath]);

  if (response.error) {
    console.warn("[community-profile] avatar cleanup failed", {
      name: response.error.name,
    });
  }
}

function stringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function numberFormValue(formData: FormData, key: string) {
  const value = stringFormValue(formData, key);
  return /^\d+$/.test(value) ? Number(value) : Number.NaN;
}

function booleanFormValue(formData: FormData, key: string) {
  const value = stringFormValue(formData, key);
  return value === "true" || value === "1";
}

function isFileValue(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
    typeof value !== "string" &&
    typeof value.arrayBuffer === "function" &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.type === "string",
  );
}

function profileSuccess(
  profile: Awaited<ReturnType<typeof createCommunityProfileEditorPayload>>,
) {
  return NextResponse.json(
    { ok: true, profile },
    { headers: { "cache-control": "private, no-store" } },
  );
}

function profileFailure({
  code,
  issues,
  message,
  retryable = false,
  status,
}: {
  code: string;
  issues?: Array<{ message: string; path: PropertyKey[] }>;
  message: string;
  retryable?: boolean;
  status: number;
}) {
  return NextResponse.json(
    { code, issues, message, ok: false, retryable },
    { headers: { "cache-control": "private, no-store" }, status },
  );
}
