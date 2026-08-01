import { describe, expect, it } from "vitest";
import {
  BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
  createBalanceRoomRequestSchema,
  joinBalanceRoomRequestSchema,
  saveBalanceResponseRequestSchema,
} from "./api-contract";

describe("together balance API contract", () => {
  const validRoom = {
    answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
    clientRequestId: "room-request-001",
    hostNickname: "민지",
    packSlug: "what-to-eat",
    participationMode: "private_group",
    questionCount: 20,
    roomName: "금요일 메뉴 대결",
    targetParticipantCount: 4,
  };

  it("accepts supported room sizes and fixed assessment lengths", () => {
    expect(createBalanceRoomRequestSchema.safeParse(validRoom).success).toBe(
      true,
    );
    expect(
      createBalanceRoomRequestSchema.safeParse({
        ...validRoom,
        questionCount: 24,
        targetParticipantCount: 8,
      }).success,
    ).toBe(true);
    const withoutConsent: Partial<typeof validRoom> = { ...validRoom };
    delete withoutConsent.answerRevealConsentVersion;
    expect(
      createBalanceRoomRequestSchema.safeParse(withoutConsent).success,
    ).toBe(false);
  });

  it("rejects oversized rooms, arbitrary lengths, and unknown fields", () => {
    expect(
      createBalanceRoomRequestSchema.safeParse({
        ...validRoom,
        targetParticipantCount: 9,
      }).success,
    ).toBe(false);
    expect(
      createBalanceRoomRequestSchema.safeParse({
        ...validRoom,
        questionCount: 10,
      }).success,
    ).toBe(false);
    expect(
      createBalanceRoomRequestSchema.safeParse({
        ...validRoom,
        participantAnswers: ["a", "b"],
      }).success,
    ).toBe(false);
  });

  it("keeps nickname and answer writes small and explicit", () => {
    expect(
      joinBalanceRoomRequestSchema.safeParse({
        answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
        clientRequestId: "join-request-001",
        nickname: "하린",
      }).success,
    ).toBe(true);
    expect(
      joinBalanceRoomRequestSchema.safeParse({
        answerRevealConsentVersion: "outdated-consent",
        clientRequestId: "join-request-001",
        nickname: "하린",
      }).success,
    ).toBe(false);
    expect(
      joinBalanceRoomRequestSchema.safeParse({
        answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
        clientRequestId: "join-request-001",
        nickname: "가".repeat(17),
      }).success,
    ).toBe(false);
    expect(
      saveBalanceResponseRequestSchema.safeParse({
        clientSequence: 1,
        optionId: "food_001_a",
        responseMs: 820,
      }).success,
    ).toBe(true);
  });

  it("rejects control characters, contact promotion, abuse, and operator impersonation", () => {
    for (const nickname of [
      "민\u200B지",
      "https://spam.com",
      "010-1234-5678",
      "@follow_me",
      "뉴앙 관리자",
      "official",
      "시발",
    ]) {
      expect(
        joinBalanceRoomRequestSchema.safeParse({
          answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
          clientRequestId: "join-request-001",
          nickname,
        }).success,
        nickname,
      ).toBe(false);
    }
    for (const nickname of ["민지", "관리 잘하는 민수", "공식처럼 웃긴 준"]) {
      expect(
        joinBalanceRoomRequestSchema.safeParse({
          answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
          clientRequestId: "join-request-001",
          nickname,
        }).success,
        nickname,
      ).toBe(true);
    }
  });
});
