import { z } from "zod";
import type { PublicProfileImage } from "@/features/public-profile/profile-image";
import { BALANCE_ANSWER_REVEAL_CONSENT_VERSION } from "./constants";

export {
  BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
  BALANCE_PARTICIPANT_TOKEN_HEADER,
  balanceParticipantSessionStorageKey,
} from "./constants";

const balanceNicknameSchema = z
  .string()
  .trim()
  .min(1)
  .max(16)
  .refine(isSafeBalanceNickname, {
    message: "다른 닉네임을 사용해 주세요.",
  });

export const balanceParticipationModeSchema = z.enum([
  "private_group",
  "feed_group",
]);

export const balanceQuestionCountSchema = z.union([
  z.literal(8),
  z.literal(12),
  z.literal(16),
  z.literal(20),
  z.literal(24),
]);

export const createBalanceRoomRequestSchema = z
  .object({
    answerRevealConsentVersion: z.literal(
      BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
    ),
    clientRequestId: z.string().trim().min(8).max(128),
    hostNickname: balanceNicknameSchema,
    packSlug: z.string().trim().min(2).max(80),
    participationMode: balanceParticipationModeSchema,
    questionCount: balanceQuestionCountSchema,
    recentItemIds: z
      .array(z.string().trim().min(2).max(80))
      .max(128)
      .refine((ids) => new Set(ids).size === ids.length)
      .optional(),
    roomName: z.string().trim().min(1).max(32).optional(),
    targetParticipantCount: z.number().int().min(2).max(8),
  })
  .strict();

export const joinBalanceRoomRequestSchema = z
  .object({
    answerRevealConsentVersion: z.literal(
      BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
    ),
    clientRequestId: z.string().trim().min(8).max(128),
    nickname: balanceNicknameSchema,
  })
  .strict();

export const saveBalanceResponseRequestSchema = z
  .object({
    clientSequence: z.number().int().min(1).max(2_147_483_647),
    optionId: z.string().trim().min(2).max(128),
    responseMs: z.number().int().min(0).max(3_600_000).optional(),
  })
  .strict();

export const completeBalanceRoomRequestSchema = z
  .object({
    clientRequestId: z.string().trim().min(8).max(128),
  })
  .strict();

export const finalizeBalanceRoomRequestSchema = z
  .object({
    clientRequestId: z.string().trim().min(8).max(128),
  })
  .strict();

export const createBalanceFeedShareRequestSchema = z
  .object({
    clientRequestId: z.string().trim().min(8).max(128),
  })
  .strict();

export const removeBalanceParticipantRequestSchema = z
  .object({
    clientRequestId: z.string().trim().min(8).max(128),
  })
  .strict();

export type CreateBalanceRoomRequest = z.infer<
  typeof createBalanceRoomRequestSchema
>;
export type JoinBalanceRoomRequest = z.infer<
  typeof joinBalanceRoomRequestSchema
>;
export type SaveBalanceResponseRequest = z.infer<
  typeof saveBalanceResponseRequestSchema
>;

export type SaveBalanceResponseResponse = {
  ok: true;
  saved: {
    clientSequence: number;
    optionId: string;
    questionId: string;
  };
};

export type CompleteBalanceRoomResponse = {
  completed: {
    participantId: string;
  };
  ok: true;
  room: BalanceRoomState;
};

export type BalanceRoomQuestionView = {
  id: string;
  options: [
    { id: string; position: "left"; text: string },
    { id: string; position: "right"; text: string },
  ];
  prompt: string;
  responseOptionId: string | null;
  roundNumber: number;
  subtopic: string;
};

export type BalanceRoomParticipantView = {
  answeredCount: number;
  avatarSeed?: string | null;
  completedAt: string | null;
  id: string;
  isMe: boolean;
  isOwner: boolean;
  nickname: string;
  profileImage?: PublicProfileImage | null;
  status: "reserved" | "active" | "completed" | "left" | "removed";
};

export type BalancePairResultView = {
  answers: Array<{
    id: string;
    isMatch: boolean;
    myOptionText: string;
    otherOptionText: string;
    prompt: string;
    subtopic: string;
  }>;
  comparedCount: number;
  matchCount: number;
  otherParticipantId: string;
  otherParticipantAvatarSeed?: string | null;
  otherParticipantNickname: string;
  score: number;
};

export type BalanceQuestionResultView = {
  counts: Array<{
    count: number;
    optionId: string;
    optionText: string;
  }>;
  id: string;
  isUnanimous: boolean;
  prompt: string;
  subtopic: string;
};

export type BalanceRoomResultView = {
  comparedQuestionCount: number;
  completedParticipantCount: number;
  groupLabel: string;
  groupScore: number;
  isFinal: boolean;
  pairCount: number;
  pairResults: BalancePairResultView[];
  splitQuestions: BalanceQuestionResultView[];
  unanimousQuestions: BalanceQuestionResultView[];
};

export type BalanceRoomState = {
  canFinalize: boolean;
  canShareToFeed: boolean;
  currentParticipantCount: number;
  expiresAt: string;
  isOwner: boolean;
  myParticipantId: string;
  pack: {
    description: string;
    resultLabel: string;
    scoringTemplate:
      | "taste_sync"
      | "relationship_standard"
      | "ideal_preference"
      | "reciprocal_fit"
      | "dilemma_fun"
      | "discovery_only";
    slug: string;
    title: string;
  };
  participants: BalanceRoomParticipantView[];
  participationMode: "private_group" | "feed_group";
  questions: BalanceRoomQuestionView[];
  questionCount: number;
  result: BalanceRoomResultView | null;
  resultStatus: "waiting" | "current" | "final";
  roomCode: string;
  roomId: string;
  roomName: string;
  targetParticipantCount: number;
};

export type CreateBalanceRoomResponse = {
  ok: true;
  participantToken: string;
  room: BalanceRoomState;
};

export type BalanceRoomPreview = {
  currentParticipantCount: number;
  expiresAt: string;
  hostNickname: string;
  joinStatus: "open" | "full" | "closed";
  pack: {
    description: string;
    slug: string;
    title: string;
  };
  participationMode: "private_group" | "feed_group";
  questionCount: number;
  roomCode: string;
  roomName: string;
  targetParticipantCount: number;
};

export type BalanceRoomPreviewResponse = {
  ok: true;
  room: BalanceRoomPreview;
};

export type JoinBalanceRoomResponse = {
  ok: true;
  participantToken: string;
  room: BalanceRoomState;
};

export type BalanceRoomStateResponse = {
  ok: true;
  room: BalanceRoomState;
};

export type BalanceApiError = {
  code:
    | "invalid_request_origin"
    | "rate_limited"
    | "validation_error"
    | "storage_unavailable"
    | "pack_not_found"
    | "room_not_found"
    | "room_expired"
    | "room_full"
    | "room_closed"
    | "nickname_taken"
    | "participant_unauthorized"
    | "participant_removed"
    | "participant_not_found"
    | "question_not_found"
    | "option_not_found"
    | "incomplete_answers"
    | "owner_only"
    | "feed_auth_required"
    | "feed_share_failed"
    | "request_conflict"
    | "unexpected_error";
  message: string;
  ok: false;
  retryable: boolean;
};

function isSafeBalanceNickname(value: string) {
  if (/[\p{Cc}\p{Cf}]/u.test(value)) return false;
  if (
    /(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|io|co\.kr)|@[a-z0-9_.]{3,})/iu.test(
      value,
    )
  ) {
    return false;
  }
  if (/(?:\d[\s().-]?){8,}/u.test(value)) return false;

  const compact = value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[\s._-]+/gu, "");
  if (/(씨발|시발|병신|개새끼|좆|fuck|bitch)/iu.test(compact)) return false;
  return !/^(?:뉴앙)?(?:운영자|관리자|운영진|공식|official|admin)$/iu.test(
    compact,
  );
}
