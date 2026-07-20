import type {
  GateCResponseChoice,
  GateCUnsureReason,
} from "@/features/research/gate-c/gate-c-study-contract";

export const gateCPublicConsentVersion = "GATE-C-PUBLIC-2026-07-20";

export const gateCAgeBands = [
  "18_19",
  "20_24",
  "25_29",
  "30_34",
  "35_39",
  "40_plus",
] as const;

export const gateCLifeContexts = [
  "student",
  "employed",
  "self_employed",
  "care_or_housework",
  "transition",
  "other",
] as const;

export const gateCAssessmentExperiences = [
  "first_time",
  "sometimes",
  "often",
] as const;

export type GateCAgeBand = (typeof gateCAgeBands)[number];
export type GateCLifeContext = (typeof gateCLifeContexts)[number];
export type GateCAssessmentExperience =
  (typeof gateCAssessmentExperiences)[number];

export type GateCPublicResponseRecord = {
  studyItemId: string;
  orderIndex: number;
  firstChoice: GateCResponseChoice;
  finalChoice: GateCResponseChoice;
  responseChanged: boolean;
  changeCount: number;
  firstAnswerElapsedMs: number;
  confusionFlag: boolean;
  confusionNote: string;
  unsureReason: GateCUnsureReason | null;
};

export type GateCPublicSessionStart = {
  formId: string;
  participantCode: string;
  sessionId: string;
  sessionToken: string;
  withdrawalCode: string;
};

export const gateCAgeBandLabels: Record<GateCAgeBand, string> = {
  "18_19": "18–19세",
  "20_24": "20–24세",
  "25_29": "25–29세",
  "30_34": "30–34세",
  "35_39": "35–39세",
  "40_plus": "40세 이상",
};

export const gateCLifeContextLabels: Record<GateCLifeContext, string> = {
  student: "학생",
  employed: "직장 생활 중",
  self_employed: "자영업·프리랜서",
  care_or_housework: "돌봄·가사 중심",
  transition: "구직·휴식·전환 중",
  other: "그 밖의 생활",
};

export const gateCAssessmentExperienceLabels: Record<
  GateCAssessmentExperience,
  string
> = {
  first_time: "거의 처음이에요",
  sometimes: "가끔 해봤어요",
  often: "자주 해봤어요",
};
