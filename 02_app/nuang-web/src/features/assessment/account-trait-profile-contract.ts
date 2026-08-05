import type { DynamicTraitDomainScore } from "@/lib/scoring/dynamic-trait-evidence";

export type AccountTraitProfile = {
  alternativeCodes: string[];
  baseResultReportId: string;
  code: string;
  domains: DynamicTraitDomainScore[];
  evidenceCount: number;
  profileName: string;
  source: "core_and_topics" | "core_only";
  topicCount: number;
  updatedAt: string;
  version: string;
};
