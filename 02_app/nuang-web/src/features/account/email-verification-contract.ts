import { z } from "zod";

export const emailVerificationCodeLength = 6;
export const emailVerificationExpiresInSeconds = 10 * 60;
export const emailVerificationMaxAttempts = 5;
export const emailVerificationResendSeconds = 60;
export const emailVerificationHourlyLimit = 5;

export const emailVerificationConfirmSchema = z.object({
  challengeId: z.string().uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

export type EmailVerificationRequestPayload = {
  challengeId: string;
  emailMasked: string;
  expiresAt: string;
  resendAfterSeconds: number;
};

export type EmailVerificationConfirmPayload = {
  emailStatus: "verified";
  verifiedAt: string;
};
