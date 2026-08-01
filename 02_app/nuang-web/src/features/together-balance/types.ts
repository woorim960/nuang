export const TOGETHER_BALANCE_ENGINE_VERSION = "1.0.0";
export const TOGETHER_BALANCE_SCORING_VERSION = "together-balance-v1";
export const TOGETHER_BALANCE_RECIPE_VERSION = "together-balance-recipe-v1";

export type BalanceScoringTemplate =
  | "taste_sync"
  | "relationship_standard"
  | "ideal_preference"
  | "reciprocal_fit"
  | "dilemma_fun"
  | "discovery_only";

export type BalanceResultSemantics =
  | "taste_sync"
  | "relationship_standard_sync"
  | "ideal_preference_similarity"
  | "reciprocal_fit"
  | "choice_chemistry"
  | "discovery_only";

export type BalancePromptRole =
  "taste" | "standard" | "preference" | "self_behavior";

export type BalanceIntensity = "light" | "lively" | "deep";
export type BalanceAudience = "all" | "friends" | "couple" | "family" | "team";
export type BalanceSensitivity = "general" | "personal" | "private";
export type BalanceQuestionPhase = "familiar" | "everyday" | "conversation";
export type BalanceQuestionCount = 8 | 12 | 16 | 20 | 24;

export type BalanceOption = Readonly<{
  id: string;
  text: string;
}>;

export type BalanceQuestion = Readonly<{
  id: string;
  packId: string;
  prompt: string;
  options: readonly [BalanceOption, BalanceOption];
  subtopic: string;
  promptRole: BalancePromptRole;
  meaningCode?: string;
  phase: BalanceQuestionPhase;
  intensity: BalanceIntensity;
  audience: BalanceAudience;
  sensitivity: BalanceSensitivity;
  scored: boolean;
  highlightPriority: number;
  conversationValue: number;
  contentVersion: number;
}>;

export type BalancePack = Readonly<{
  id: string;
  slug: string;
  title: string;
  description: string;
  scoringTemplate: BalanceScoringTemplate;
  resultSemantics: BalanceResultSemantics;
  defaultQuestionCount: BalanceQuestionCount;
  supportedQuestionCounts: readonly BalanceQuestionCount[];
  roundSize: 8;
  contentPoolVersion: number;
  questions: readonly BalanceQuestion[];
}>;

export type BalanceExposure = Readonly<{
  itemId: string;
  seenAt: string | Date;
  participantId?: string;
  groupId?: string;
}>;

export type BalanceSelectionRequest = Readonly<{
  pack: BalancePack;
  questionCount: BalanceQuestionCount;
  roomQuestionSeed: string;
  groupId?: string;
  participantIds?: readonly string[];
  exposures?: readonly BalanceExposure[];
  now?: string | Date;
  repeatWindowDays?: number;
  maxRepeatRatio?: number;
}>;

export type BalanceSelectedQuestion = Readonly<{
  question: BalanceQuestion;
  repeatedForGroup: boolean;
  recentlySeenByParticipant: boolean;
}>;

export type BalanceRound = Readonly<{
  roundNumber: number;
  questions: readonly BalanceSelectedQuestion[];
}>;

export type BalanceQuestionSet = Readonly<{
  packId: string;
  contentPoolVersion: number;
  recipeVersion: string;
  roomQuestionSeed: string;
  questionCount: number;
  freshQuestionCount: number;
  repeatedQuestionCount: number;
  repeatRatio: number;
  disclosure: string | null;
  questionSetHash: string;
  rounds: readonly BalanceRound[];
}>;

export type BalanceDisplayedOption = BalanceOption &
  Readonly<{
    position: "left" | "right";
  }>;

export type BalanceResponse = Readonly<{
  participantId: string;
  itemId: string;
  optionId: string;
  clientSequence?: number;
  answeredAt?: string | Date;
}>;

export type BalancePairScore = Readonly<{
  participantAId: string;
  participantBId: string;
  semantics: Exclude<BalanceResultSemantics, "reciprocal_fit">;
  matchCount: number;
  comparedCount: number;
  rawScore: number | null;
  roundedScore: number | null;
  scoringVersion: string;
}>;

export type BalanceReciprocalDirectionScore = Readonly<{
  preferenceOwnerId: string;
  behaviorOwnerId: string;
  matchCount: number;
  comparedCount: number;
  rawScore: number | null;
  roundedScore: number | null;
}>;

export type BalanceReciprocalScore = Readonly<{
  participantAId: string;
  participantBId: string;
  semantics: "reciprocal_fit";
  fromAToB: BalanceReciprocalDirectionScore;
  fromBToA: BalanceReciprocalDirectionScore;
  matchCount: number;
  comparedCount: number;
  rawScore: number | null;
  roundedScore: number | null;
  scoringVersion: string;
}>;

export type BalanceGroupScore = Readonly<{
  semantics: Exclude<
    BalanceResultSemantics,
    "reciprocal_fit" | "discovery_only"
  >;
  participantCount: number;
  pairCount: number;
  rawScore: number | null;
  roundedScore: number | null;
  pairs: readonly BalancePairScore[];
  scoringVersion: string;
}>;
