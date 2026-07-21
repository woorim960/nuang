import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import {
  communityProfileVisibilitySchema,
  type CommunityProfileVisibilityPayload,
} from "@/features/account/profile-visibility-settings";
import {
  createCommunityProfileEditorPayload,
  ensureCommunityProfile,
} from "@/features/account/server-community-profile";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { saveProfileVisibilityRequestSchema } from "@/features/together/api-schemas";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const context = await createVisibilityContext();
  if (!context.ok) return context.response;

  const editor = await createCommunityProfileEditorPayload({
    client: context.client,
    profile: context.profile,
  });

  return NextResponse.json({
    ok: true,
    visibility: createVisibilityPayload(context.profile, editor),
  });
}

export async function PUT(request: Request) {
  const payload = await readValidatedJson(
    request,
    communityProfileVisibilitySchema,
  );
  if (!payload.ok) return payload.response;

  return saveVisibility(payload.data);
}

// The legacy writer remains compatible with earlier app builds while all new
// clients use PUT with the three user-facing controls.
export async function POST(request: Request) {
  const payload = await readValidatedJson(
    request,
    saveProfileVisibilityRequestSchema,
  );
  if (!payload.ok) return payload.response;

  const visibilityByField = new Map(
    payload.data.settings.map((setting) => [
      setting.fieldId,
      setting.visibility,
    ]),
  );
  const context = await createVisibilityContext();
  if (!context.ok) return context.response;

  const codeVisible =
    visibilityByField.get("representative_profile") === "public";
  const detailsVisible =
    codeVisible &&
    visibilityByField.get("core_domain_map") === "public" &&
    visibilityByField.get("core_facet_summary") === "public";

  return persistVisibility({
    client: context.client,
    data: {
      codeVisible,
      comparisonEnabled: detailsVisible,
      detailsVisible,
      expectedRevision: context.profile.revision,
      policyVersion: payload.data.policyVersion,
    },
    profile: context.profile,
  });
}

async function saveVisibility(
  data: Parameters<typeof communityProfileVisibilitySchema.parse>[0] & {
    codeVisible: boolean;
    comparisonEnabled: boolean;
    detailsVisible: boolean;
    expectedRevision: number;
    policyVersion: typeof profileVisibilityPolicyVersion;
  },
) {
  const context = await createVisibilityContext();
  if (!context.ok) return context.response;

  if (context.profile.revision !== data.expectedRevision) {
    return NextResponse.json(
      {
        error: "revision_conflict",
        message:
          "다른 화면에서 공개 정보가 먼저 바뀌었어요. 새로고침 후 다시 확인해 주세요.",
      },
      { status: 409 },
    );
  }

  return persistVisibility({
    client: context.client,
    data,
    profile: context.profile,
  });
}

async function persistVisibility({
  client,
  data,
  profile,
}: {
  client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
  data: {
    codeVisible: boolean;
    comparisonEnabled: boolean;
    detailsVisible: boolean;
    expectedRevision: number;
    policyVersion: typeof profileVisibilityPolicyVersion;
  };
  profile: NonNullable<Awaited<ReturnType<typeof ensureCommunityProfile>>>;
}) {
  const response = await client
    .schema("profile")
    .rpc("save_community_profile_visibility", {
      p_account_id: profile.accountId,
      p_code_visible: data.codeVisible,
      p_comparison_enabled: data.comparisonEnabled,
      p_details_visible: data.detailsVisible,
      p_expected_revision: data.expectedRevision,
      p_policy_version: data.policyVersion,
    });

  if (response.error) {
    const isConflict = response.error.message.includes("REVISION_CONFLICT");
    return NextResponse.json(
      {
        error: isConflict ? "revision_conflict" : "visibility_save_failed",
        message: isConflict
          ? "다른 화면에서 공개 정보가 먼저 바뀌었어요. 새로고침 후 다시 확인해 주세요."
          : "공개 정보를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      },
      { status: isConflict ? 409 : 500 },
    );
  }

  const row = Array.isArray(response.data) ? response.data[0] : response.data;
  const revision =
    row && typeof row === "object" && "revision" in row
      ? Number(row.revision)
      : data.expectedRevision + 1;
  const editor = await createCommunityProfileEditorPayload({
    client,
    profile: {
      ...profile,
      codeVisibility: data.codeVisible ? "public" : "private",
      comparisonEnabled: data.comparisonEnabled,
      detailVisibility: data.detailsVisible ? "public" : "private",
      revision,
    },
  });

  return NextResponse.json({
    ok: true,
    visibility: {
      code: editor.code,
      codeVisible: data.codeVisible,
      comparisonEnabled: data.comparisonEnabled,
      detailsVisible: data.detailsVisible,
      displayName: editor.displayName,
      profileName: editor.profileName,
      publicId: editor.publicId,
      revision,
    } satisfies CommunityProfileVisibilityPayload,
  });
}

async function createVisibilityContext() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth;

  const client = createSupabaseServiceClient();
  if (!client) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "service_unavailable",
          message: "공개 정보 설정을 불러올 수 없어요.",
        },
        { status: 503 },
      ),
    };
  }

  const profile = await ensureCommunityProfile({
    client,
    user: auth.user as User,
  });
  if (!profile) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "profile_unavailable",
          message: "프로필을 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        },
        { status: 503 },
      ),
    };
  }

  return { client, ok: true as const, profile };
}

function createVisibilityPayload(
  profile: NonNullable<Awaited<ReturnType<typeof ensureCommunityProfile>>>,
  editor: Awaited<ReturnType<typeof createCommunityProfileEditorPayload>>,
) {
  return {
    code: editor.code,
    codeVisible: profile.codeVisibility === "public",
    comparisonEnabled: profile.comparisonEnabled,
    detailsVisible: profile.detailVisibility === "public",
    displayName: editor.displayName,
    profileName: editor.profileName,
    publicId: editor.publicId,
    revision: profile.revision,
  } satisfies CommunityProfileVisibilityPayload;
}
