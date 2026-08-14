import { z } from "zod";

export const localResultIdSchema = z
  .string()
  .min(6)
  .max(128)
  .refine((value) => value === value.trim(), {
    message: "결과 식별자 앞뒤에 공백을 사용할 수 없습니다.",
  });
