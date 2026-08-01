import { z } from "zod";

export const adminCommunityContentTypes = [
  "balance_game",
  "daily_question",
] as const;

export const adminCommunityContentStatuses = [
  "draft",
  "scheduled",
  "published",
  "closed",
  "archived",
] as const;

const balanceOptionSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "선택지 식별값을 입력해 주세요.")
    .max(64)
    .regex(
      /^[a-z0-9_]+$/,
      "선택지 식별값은 영문 소문자, 숫자, _만 사용할 수 있어요.",
    ),
  label: z.string().trim().min(1, "선택지 문구를 입력해 주세요.").max(80),
});

const contentFieldsSchema = z.object({
  body: z.string().trim().max(800).default(""),
  contentType: z.enum(adminCommunityContentTypes),
  options: z.array(balanceOptionSchema).max(2).default([]),
  prompt: z.string().trim().min(4, "질문을 4자 이상 입력해 주세요.").max(160),
  responseClosesAt: z.iso.datetime({ offset: true }).nullable().optional(),
  scheduledFor: z.iso.datetime({ offset: true }).nullable().optional(),
  title: z
    .string()
    .trim()
    .min(2, "운영용 제목을 2자 이상 입력해 주세요.")
    .max(80),
});

export const adminCommunityContentRequestSchema = z
  .discriminatedUnion("action", [
    contentFieldsSchema.extend({
      action: z.literal("create"),
    }),
    contentFieldsSchema.extend({
      action: z.literal("update"),
      contentId: z.uuid(),
    }),
    z.object({
      action: z.literal("schedule"),
      contentId: z.uuid(),
      scheduledFor: z.iso.datetime({ offset: true }),
    }),
    z.object({
      action: z.enum([
        "archive",
        "close",
        "delete_draft",
        "duplicate",
        "feature",
        "publish",
      ]),
      contentId: z.uuid(),
    }),
  ])
  .superRefine((value, context) => {
    if (value.action !== "create" && value.action !== "update") return;
    if (value.contentType === "balance_game") {
      if (value.options.length !== 2) {
        context.addIssue({
          code: "custom",
          message: "투표에는 서로 다른 두 선택지가 필요합니다.",
          path: ["options"],
        });
        return;
      }
      const keys = new Set(value.options.map((option) => option.key));
      const labels = new Set(
        value.options.map((option) => option.label.toLocaleLowerCase("ko-KR")),
      );
      if (keys.size !== 2 || labels.size !== 2) {
        context.addIssue({
          code: "custom",
          message: "두 선택지는 서로 다르게 입력해 주세요.",
          path: ["options"],
        });
      }
    } else if (value.options.length > 0) {
      context.addIssue({
        code: "custom",
        message: "오늘의 질문에는 투표 선택지를 넣을 수 없습니다.",
        path: ["options"],
      });
    }
  });

export type AdminCommunityContentRequest = z.infer<
  typeof adminCommunityContentRequestSchema
>;

export function isFutureSchedule(value: string, now = Date.now()) {
  const scheduledAt = new Date(value).getTime();
  return Number.isFinite(scheduledAt) && scheduledAt > now + 60_000;
}
