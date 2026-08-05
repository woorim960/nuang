import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  assessmentStudioDocumentSchema,
  type AssessmentStudioCategory,
  type AssessmentStudioDocument,
  type AssessmentStudioSubtype,
} from "@/features/admin/assessment-studio-contract";
import {
  hasAssessmentStudioBlockers,
  validateAssessmentStudioDocument,
} from "@/features/admin/assessment-studio-validation";
import { canExposeAssessmentInBeta } from "@/features/assessment/assessment-age-access-policy";
import type {
  BalancePack,
  BalancePackCatalogItem,
} from "@/features/together-balance/types";
import {
  getPublicBalancePack,
  PUBLIC_BALANCE_PACKS,
} from "@/features/together-balance/content";

export type AssessmentRuntimeResolution =
  | { state: "fallback"; document: null; releaseId: null; releaseNumber: null }
  | {
      state: "published";
      document: AssessmentStudioDocument;
      releaseId: string;
      releaseNumber: number;
    }
  | {
      state: "unavailable";
      document: null;
      releaseId: string | null;
      releaseNumber: null;
    };

export async function resolveAssessmentRuntimeContent({
  category,
  slug,
  subtype,
}: {
  category: AssessmentStudioCategory;
  slug: string;
  subtype: AssessmentStudioSubtype;
}): Promise<AssessmentRuntimeResolution> {
  const client = createSupabaseServiceClient();
  if (!client || typeof client.from !== "function") {
    return {
      document: null,
      releaseId: null,
      releaseNumber: null,
      state: "fallback",
    };
  }

  const entry = await client
    .from("assessment_content_entry")
    .select("id,status,source_origin,published_release_id,deleted_at,paused_at")
    .eq("category", category)
    .eq("subtype", subtype)
    .eq("slug", slug)
    .maybeSingle();
  if (entry.error)
    return {
      document: null,
      releaseId: null,
      releaseNumber: null,
      state: "fallback",
    };
  if (!entry.data)
    return {
      document: null,
      releaseId: null,
      releaseNumber: null,
      state: "fallback",
    };
  if (
    entry.data.status === "paused" ||
    entry.data.status === "archived" ||
    entry.data.deleted_at ||
    entry.data.paused_at
  ) {
    return {
      document: null,
      releaseId: entry.data.published_release_id,
      releaseNumber: null,
      state: "unavailable",
    };
  }
  if (!entry.data.published_release_id) {
    return entry.data.source_origin === "builtin"
      ? {
          document: null,
          releaseId: null,
          releaseNumber: null,
          state: "fallback",
        }
      : {
          document: null,
          releaseId: null,
          releaseNumber: null,
          state: "unavailable",
        };
  }

  const release = await client
    .from("assessment_content_release")
    .select("id,document,release_number")
    .eq("id", entry.data.published_release_id)
    .maybeSingle();
  if (release.error || !release.data) {
    return {
      document: null,
      releaseId: null,
      releaseNumber: null,
      state: "fallback",
    };
  }
  const document = assessmentStudioDocumentSchema.safeParse(
    release.data.document,
  );
  if (!document.success) {
    return {
      document: null,
      releaseId: release.data.id,
      releaseNumber: null,
      state: "fallback",
    };
  }
  if (!canExposeAssessmentInBeta(document.data.ageAccessPolicy)) {
    return {
      document: null,
      releaseId: release.data.id,
      releaseNumber: null,
      state: "unavailable",
    };
  }
  const issues = validateAssessmentStudioDocument(document.data);
  if (hasAssessmentStudioBlockers(issues)) {
    return {
      document: null,
      releaseId: release.data.id,
      releaseNumber: null,
      state: "fallback",
    };
  }
  return {
    document: document.data,
    releaseId: release.data.id,
    releaseNumber: release.data.release_number,
    state: "published",
  };
}

export async function resolveAssessmentReleaseById({
  category,
  releaseId,
  slug,
  subtype,
}: {
  category: AssessmentStudioCategory;
  releaseId: string;
  slug: string;
  subtype: AssessmentStudioSubtype;
}): Promise<AssessmentRuntimeResolution> {
  const client = createSupabaseServiceClient();
  if (!client || typeof client.from !== "function") {
    return {
      document: null,
      releaseId: null,
      releaseNumber: null,
      state: "fallback",
    };
  }
  const release = await client
    .from("assessment_content_release")
    .select("id,entry_id,document,release_number")
    .eq("id", releaseId)
    .maybeSingle();
  if (release.error || !release.data) {
    return {
      document: null,
      releaseId,
      releaseNumber: null,
      state: "unavailable",
    };
  }
  const entry = await client
    .from("assessment_content_entry")
    .select("category,subtype,slug")
    .eq("id", release.data.entry_id)
    .maybeSingle();
  if (
    entry.error ||
    !entry.data ||
    entry.data.category !== category ||
    entry.data.subtype !== subtype ||
    entry.data.slug !== slug
  ) {
    return {
      document: null,
      releaseId,
      releaseNumber: null,
      state: "unavailable",
    };
  }
  const document = assessmentStudioDocumentSchema.safeParse(
    release.data.document,
  );
  if (!document.success) {
    return {
      document: null,
      releaseId,
      releaseNumber: null,
      state: "unavailable",
    };
  }
  if (!canExposeAssessmentInBeta(document.data.ageAccessPolicy)) {
    return {
      document: null,
      releaseId,
      releaseNumber: null,
      state: "unavailable",
    };
  }
  return {
    document: document.data,
    releaseId,
    releaseNumber: release.data.release_number,
    state: "published",
  };
}

export async function resolvePublicBalancePack(slug: string) {
  const resolution = await resolveAssessmentRuntimeContent({
    category: "together",
    slug,
    subtype: "balance_pack",
  });
  if (resolution.state === "unavailable") return null;
  const pack = (
    resolution.document?.payload as { pack?: BalancePack } | undefined
  )?.pack;
  const fallback = getPublicBalancePack(slug);
  const selected = pack ?? fallback;
  return selected
    ? {
        pack: selected,
        releaseId: resolution.releaseId,
        releaseNumber: resolution.releaseNumber,
      }
    : null;
}

const resolvePublicBalancePacksUncached = async (): Promise<BalancePack[]> => {
  const client = createSupabaseServiceClient();
  let managedSlugs: string[] = [];
  if (client && typeof client.from === "function") {
    const entries = await client
      .from("assessment_content_entry")
      .select("slug")
      .eq("category", "together")
      .eq("subtype", "balance_pack");
    if (!entries.error) {
      managedSlugs = (entries.data ?? []).flatMap((entry) =>
        typeof entry.slug === "string" ? [entry.slug] : [],
      );
    }
  }
  const slugs = [
    ...new Set([
      ...PUBLIC_BALANCE_PACKS.map((pack) => pack.slug),
      ...managedSlugs,
    ]),
  ];
  const resolved = await Promise.all(slugs.map(resolvePublicBalancePack));
  return resolved.flatMap((item) => (item ? [item.pack] : []));
};

export const resolvePublicBalancePacks = unstable_cache(
  resolvePublicBalancePacksUncached,
  ["public-balance-packs-v1"],
  {
    revalidate: 60,
    tags: ["public-balance-packs"],
  },
);

export async function resolvePublicBalancePackCatalog(): Promise<
  BalancePackCatalogItem[]
> {
  const packs = await resolvePublicBalancePacks();
  return packs.map((pack) => ({
    defaultQuestionCount: pack.defaultQuestionCount,
    description: pack.description,
    id: pack.id,
    sampleOptions: [
      pack.questions[0]?.options[0].text ?? "선택 A",
      pack.questions[0]?.options[1].text ?? "선택 B",
    ],
    scoringTemplate: pack.scoringTemplate,
    slug: pack.slug,
    title: pack.title,
    totalQuestionCount: pack.questions.length,
  }));
}
