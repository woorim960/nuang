import { afterEach, describe, expect, it } from "vitest";
import { isAdminEmail } from "@/features/admin/server-admin-access";

const originalAdminEmails = process.env.ADMIN_BOOTSTRAP_EMAILS;

afterEach(() => {
  if (originalAdminEmails === undefined) {
    delete process.env.ADMIN_BOOTSTRAP_EMAILS;
  } else {
    process.env.ADMIN_BOOTSTRAP_EMAILS = originalAdminEmails;
  }
});

describe("admin email access", () => {
  it("allows only a configured email after normalization", () => {
    process.env.ADMIN_BOOTSTRAP_EMAILS =
      "woorimprog@gmail.com, second@example.com";

    expect(isAdminEmail("WOORIMPROG@gmail.com")).toBe(true);
    expect(isAdminEmail(" second@example.com ")).toBe(true);
    expect(isAdminEmail("viewer@example.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });
});
