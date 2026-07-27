import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureAccountForUser: vi.fn(),
  readPrivateContact: vi.fn(),
  revealPrivateEmail: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccountForUser,
}));

vi.mock("@/features/account/server-private-contact", () => ({
  readPrivateContact: mocks.readPrivateContact,
}));

vi.mock("@/features/account/private-contact-security", () => ({
  revealPrivateEmail: mocks.revealPrivateEmail,
}));

import { resolveAdminIdentityForUser } from "@/features/admin/server-admin-access";

const client = {} as SupabaseClient;
const user = { email: null, id: "auth-user" } as unknown as User;

describe("verified private email admin access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_BOOTSTRAP_EMAILS = "woorimprog@gmail.com";
    mocks.ensureAccountForUser.mockResolvedValue({
      accountId: "11111111-1111-4111-8111-111111111111",
      ok: true,
    });
  });

  it("does not grant access to an unverified profile email", async () => {
    mocks.readPrivateContact.mockResolvedValue({
      data: {
        emailEncrypted: "encrypted",
        emailStatus: "unverified",
      },
      ok: true,
    });

    await expect(
      resolveAdminIdentityForUser({ client, user }),
    ).resolves.toBeNull();
    expect(mocks.revealPrivateEmail).not.toHaveBeenCalled();
  });

  it("grants access when the verified profile email is allowlisted", async () => {
    mocks.readPrivateContact.mockResolvedValue({
      data: {
        emailEncrypted: "encrypted",
        emailStatus: "verified",
      },
      ok: true,
    });
    mocks.revealPrivateEmail.mockReturnValue("WOORIMPROG@gmail.com");

    await expect(
      resolveAdminIdentityForUser({ client, user }),
    ).resolves.toMatchObject({
      email: "woorimprog@gmail.com",
      source: "verified_profile",
    });
  });
});
