import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { buildTrustedOAuthIdentities } from "@/features/auth/oauth-identity-policy";

describe("buildTrustedOAuthIdentities", () => {
  it("normalizes every Supabase identity with a fixed allowlisted issuer", () => {
    const result = buildTrustedOAuthIdentities({
      id: "auth-user-1",
      identities: [
        {
          id: "kakao-subject",
          identity_data: { email: "member@example.com", iss: "forged" },
          identity_id: "supabase-identity-kakao",
          provider: "kakao",
          user_id: "auth-user-1",
        },
        {
          id: "google-subject",
          identity_data: { email_verified: false },
          identity_id: "supabase-identity-google",
          provider: "google",
          user_id: "auth-user-1",
        },
      ],
    } as unknown as User);

    expect(result).toEqual({
      identities: [
        {
          issuer: "https://accounts.google.com",
          provider: "google",
          provider_subject: "google-subject",
          supabase_identity_id: "supabase-identity-google",
        },
        {
          issuer: "https://kauth.kakao.com",
          provider: "kakao",
          provider_subject: "kakao-subject",
          supabase_identity_id: "supabase-identity-kakao",
        },
      ],
      ok: true,
    });
  });

  it("does not turn an unknown provider into email", () => {
    expect(
      buildTrustedOAuthIdentities({
        id: "auth-user-1",
        identities: [
          {
            id: "apple-subject",
            identity_id: "supabase-identity-apple",
            provider: "apple",
            user_id: "auth-user-1",
          },
        ],
      } as unknown as User),
    ).toEqual({ code: "provider_not_allowed", ok: false });
  });

  it("fails closed instead of substituting the auth user id for a missing subject", () => {
    expect(
      buildTrustedOAuthIdentities({
        id: "auth-user-1",
        identities: [
          {
            id: " ",
            identity_id: "supabase-identity-google",
            provider: "google",
            user_id: "auth-user-1",
          },
        ],
      } as unknown as User),
    ).toEqual({ code: "identity_missing", ok: false });
  });

  it("rejects duplicate subjects and duplicate Supabase identity ids", () => {
    const baseIdentity = {
      id: "google-subject",
      identity_id: "supabase-identity-google",
      provider: "google",
      user_id: "auth-user-1",
    };

    expect(
      buildTrustedOAuthIdentities({
        id: "auth-user-1",
        identities: [baseIdentity, { ...baseIdentity }],
      } as unknown as User),
    ).toEqual({ code: "duplicate_identity", ok: false });

    expect(
      buildTrustedOAuthIdentities({
        id: "auth-user-1",
        identities: [
          baseIdentity,
          {
            id: "kakao-subject",
            identity_id: "supabase-identity-google",
            provider: "kakao",
            user_id: "auth-user-1",
          },
        ],
      } as unknown as User),
    ).toEqual({ code: "duplicate_identity", ok: false });
  });

  it("rejects an auth user with no server identities", () => {
    expect(
      buildTrustedOAuthIdentities({
        id: "auth-user-1",
        identities: [],
      } as unknown as User),
    ).toEqual({ code: "identity_missing", ok: false });
  });
});
