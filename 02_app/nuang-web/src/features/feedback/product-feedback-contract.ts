import { z } from "zod";

export const productFeedbackKinds = ["bug", "usability", "idea"] as const;
export const productFeedbackAreas = [
  "home",
  "assessment",
  "community",
  "trait_map",
  "my",
  "account",
  "other",
] as const;

export type ProductFeedbackKind = (typeof productFeedbackKinds)[number];
export type ProductFeedbackArea = (typeof productFeedbackAreas)[number];

export const productFeedbackKindLabels: Record<ProductFeedbackKind, string> = {
  bug: "기능이 안 돼요",
  usability: "사용하기 불편해요",
  idea: "이런 기능이 필요해요",
};

export const productFeedbackAreaLabels: Record<ProductFeedbackArea, string> = {
  home: "홈",
  assessment: "검사",
  community: "커뮤니티",
  trait_map: "성향지도",
  my: "마이",
  account: "로그인·계정",
  other: "기타",
};

const sourcePathSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || (value.startsWith("/") && !value.startsWith("//")),
    "앱 안의 화면 경로만 보낼 수 있어요.",
  )
  .transform((value) => value || null);

export const productFeedbackWriteSchema = z.object({
  area: z.enum(productFeedbackAreas),
  body: z.string().trim().min(10).max(2_000),
  clientSessionId: z.uuid(),
  kind: z.enum(productFeedbackKinds),
  sourcePath: sourcePathSchema.default(""),
  technicalContext: z
    .object({
      locale: z.string().trim().min(2).max(40).nullable(),
      timeZone: z.string().trim().min(1).max(80).nullable(),
      viewportHeight: z.number().int().min(200).max(20_000),
      viewportWidth: z.number().int().min(240).max(20_000),
    })
    .strict(),
});

export type ProductFeedbackWriteInput = z.infer<
  typeof productFeedbackWriteSchema
>;
