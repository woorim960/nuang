import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCommunityProfileEditorPayload: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  ensureCommunityProfile: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  sharp: vi.fn(),
  sharpMetadata: vi.fn(),
  sharpToBuffer: vi.fn(),
  storageFrom: vi.fn(),
  storageRemove: vi.fn(),
  storageUpload: vi.fn(),
  updateCommunityProfile: vi.fn(),
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock("@/features/account/server-community-profile", () => ({
  createCommunityProfileEditorPayload:
    mocks.createCommunityProfileEditorPayload,
  ensureCommunityProfile: mocks.ensureCommunityProfile,
  updateCommunityProfile: mocks.updateCommunityProfile,
}));

vi.mock("sharp", () => ({
  default: mocks.sharp,
}));

import { GET, PATCH } from "@/app/api/me/profile/route";

const profile = {
  accountId: "10000000-0000-4000-8000-000000000001",
  avatarBucket: null,
  avatarObjectPath: null,
  avatarRevision: 0,
  bio: "산책과 카페 이야기를 좋아해요.",
  codeVisibility: "public" as const,
  comparisonEnabled: true,
  detailVisibility: "public" as const,
  displayName: "여름",
  handle: "summer.day",
  id: "20000000-0000-4000-8000-000000000001",
  revision: 1,
  status: "active" as const,
};

const editorPayload = {
  avatar: {
    alt: "여름 프로필 이미지",
    motif: "purple" as const,
    source: "character" as const,
    src: "/assets/characters/nuang-character-purple.webp",
  },
  bio: profile.bio,
  code: "ENAKQ",
  displayName: profile.displayName,
  handle: profile.handle,
  profileName: "관계를 여는 지휘자",
  publicId: profile.id,
  revision: profile.revision,
};

describe("my community profile api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: { id: "supabase-user" },
    });
    mocks.storageUpload.mockResolvedValue({ data: {}, error: null });
    mocks.storageRemove.mockResolvedValue({ data: {}, error: null });
    mocks.storageFrom.mockReturnValue({
      remove: mocks.storageRemove,
      upload: mocks.storageUpload,
    });
    mocks.createSupabaseServiceClient.mockReturnValue({
      storage: { from: mocks.storageFrom },
    });
    mocks.sharpMetadata.mockResolvedValue({
      format: "png",
      height: 1,
      pages: 1,
      width: 1,
    });
    mocks.sharpToBuffer.mockResolvedValue(Buffer.from("webp-avatar"));
    const imagePipeline = {
      metadata: mocks.sharpMetadata,
      resize: vi.fn(),
      rotate: vi.fn(),
      toBuffer: mocks.sharpToBuffer,
      webp: vi.fn(),
    };
    imagePipeline.rotate.mockReturnValue(imagePipeline);
    imagePipeline.resize.mockReturnValue(imagePipeline);
    imagePipeline.webp.mockReturnValue(imagePipeline);
    mocks.sharp.mockReturnValue(imagePipeline);
    mocks.ensureCommunityProfile.mockResolvedValue(profile);
    mocks.createCommunityProfileEditorPayload.mockResolvedValue(editorPayload);
  });

  it("returns the authenticated user's editable profile without caching", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body).toEqual({ ok: true, profile: editorPayload });
  });

  it("updates text fields with revision protection", async () => {
    const updatedProfile = {
      ...profile,
      bio: "새로운 소개",
      displayName: "새여름",
      handle: "new.summer",
      revision: 2,
    };
    mocks.updateCommunityProfile.mockResolvedValue({
      ok: true,
      profile: updatedProfile,
    });
    mocks.createCommunityProfileEditorPayload.mockResolvedValue({
      ...editorPayload,
      bio: updatedProfile.bio,
      displayName: updatedProfile.displayName,
      handle: updatedProfile.handle,
      revision: 2,
    });

    const response = await PATCH(
      profileRequest({
        bio: updatedProfile.bio,
        displayName: updatedProfile.displayName,
        expectedRevision: "1",
        handle: updatedProfile.handle,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.revision).toBe(2);
    expect(mocks.updateCommunityProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        avatar: undefined,
        bio: "새로운 소개",
        displayName: "새여름",
        expectedRevision: 1,
        handle: "new.summer",
        profile,
      }),
    );
  });

  it("returns a field error before a write for an invalid handle", async () => {
    const response = await PATCH(
      profileRequest({
        bio: "소개",
        displayName: "여름",
        expectedRevision: "1",
        handle: "한글 아이디",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("profile_invalid");
    expect(body.message).toContain("영문");
    expect(mocks.updateCommunityProfile).not.toHaveBeenCalled();
  });

  it("returns a distinct conflict when the handle is already taken", async () => {
    mocks.updateCommunityProfile.mockResolvedValue({
      code: "profile_handle_taken",
      ok: false,
    });

    const response = await PATCH(
      profileRequest({
        bio: "소개",
        displayName: "여름",
        expectedRevision: "1",
        handle: "taken.handle",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("profile_handle_taken");
    expect(body.retryable).toBe(false);
  });

  it("returns a distinct conflict when another device saved first", async () => {
    mocks.updateCommunityProfile.mockResolvedValue({
      code: "profile_revision_conflict",
      ok: false,
    });

    const response = await PATCH(
      profileRequest({
        bio: "소개",
        displayName: "여름",
        expectedRevision: "1",
        handle: "summer.day",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("profile_revision_conflict");
    expect(body.message).toContain("최신 정보");
  });

  it("normalizes an uploaded image to a 512px WebP before saving", async () => {
    const updatedProfile = {
      ...profile,
      avatarBucket: "profile-avatars",
      avatarObjectPath: "new-avatar.webp",
      avatarRevision: 1,
      revision: 2,
    };
    mocks.updateCommunityProfile.mockResolvedValue({
      ok: true,
      profile: updatedProfile,
    });
    const formData = new FormData();
    formData.set("bio", "소개");
    formData.set("displayName", "여름");
    formData.set("expectedRevision", "1");
    formData.set("handle", "summer.day");
    formData.set(
      "avatar",
      new File([tinyPng], "avatar.png", { type: "image/png" }),
    );

    const response = await PATCH({
      formData: async () => formData,
      headers: new Headers({
        "content-type": "multipart/form-data; boundary=test",
      }),
    } as Request);

    expect(response.status).toBe(200);
    expect(mocks.storageFrom).toHaveBeenCalledWith("profile-avatars");
    expect(mocks.storageUpload).toHaveBeenCalledWith(
      expect.stringMatching(
        /^10000000-0000-4000-8000-000000000001\/2-[0-9a-f-]+\.webp$/,
      ),
      expect.anything(),
      expect.objectContaining({ contentType: "image/webp", upsert: false }),
    );
  });
});

const tinyPng = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nHsAAAAASUVORK5CYII=",
    "base64",
  ),
);

function profileRequest(fields: Record<string, string>) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.set(key, value));

  return new Request("http://localhost:3000/api/me/profile", {
    body: formData,
    method: "PATCH",
  });
}
