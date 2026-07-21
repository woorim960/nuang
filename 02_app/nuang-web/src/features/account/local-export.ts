import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import {
  getLabExpiresAt,
  type StoredLabResult,
} from "@/features/lab/lab-storage";

export const localExportSchemaVersion = "nuang.local-export.v0.1";

export const localExportPrivacyNote =
  "이 파일에는 뉴앙 검사 응답이 포함될 수 있으니 공유에 주의하세요.";

export function buildLocalExportPayload({
  coreAttempts,
  exportedAt,
  labResults,
}: {
  coreAttempts: LocalAssessmentAttempt[];
  exportedAt: string;
  labResults: StoredLabResult[];
}) {
  return {
    coreAttempts,
    exportedAt,
    labResults: labResults.map((result) => ({
      ...result,
      expiresAt: getLabExpiresAt(result),
    })),
    note: localExportPrivacyNote,
    schema: localExportSchemaVersion,
  };
}
