import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: null as null | { from: ReturnType<typeof vi.fn> },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => mocks.client,
}));

import { getBuiltinAssessmentStudioEntries } from "@/features/admin/assessment-studio-sources";
import { resolveAssessmentRuntimeContent } from "./server-assessment-content-runtime";

function createClient(rows: Record<string, { data: unknown; error: unknown }>) {
  return {
    from: vi.fn((table: string) => {
      const query = {
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(
          async () => rows[table] ?? { data: null, error: null },
        ),
        select: vi.fn(() => query),
      };
      return query;
    }),
  };
}

describe("assessment runtime content resolver", () => {
  beforeEach(() => {
    mocks.client = null;
  });

  it("falls back to the bundled content when the operations database is unavailable", async () => {
    await expect(
      resolveAssessmentRuntimeContent({
        category: "core",
        slug: "quick-core",
        subtype: "core_quick",
      }),
    ).resolves.toMatchObject({ state: "fallback" });
  });

  it("keeps a paused release unavailable even while its working copy is in review", async () => {
    mocks.client = createClient({
      assessment_content_entry: {
        data: {
          deleted_at: null,
          id: "entry-1",
          paused_at: "2026-08-03T00:00:00.000Z",
          published_release_id: "release-1",
          source_origin: "builtin",
          status: "in_review",
        },
        error: null,
      },
    });

    await expect(
      resolveAssessmentRuntimeContent({
        category: "core",
        slug: "quick-core",
        subtype: "core_quick",
      }),
    ).resolves.toMatchObject({ releaseId: "release-1", state: "unavailable" });
    expect(mocks.client.from).toHaveBeenCalledTimes(1);
  });

  it("returns the validated immutable release document for a published entry", async () => {
    const document = getBuiltinAssessmentStudioEntries()[0]!.document;
    mocks.client = createClient({
      assessment_content_entry: {
        data: {
          deleted_at: null,
          id: "entry-1",
          paused_at: null,
          published_release_id: "release-1",
          source_origin: "builtin",
          status: "published",
        },
        error: null,
      },
      assessment_content_release: {
        data: { document, id: "release-1", release_number: 3 },
        error: null,
      },
    });

    await expect(
      resolveAssessmentRuntimeContent({
        category: "core",
        slug: "quick-core",
        subtype: "core_quick",
      }),
    ).resolves.toMatchObject({
      document,
      releaseId: "release-1",
      releaseNumber: 3,
      state: "published",
    });
  });

  it("keeps an adult-only release private during the beta", async () => {
    const document = {
      ...getBuiltinAssessmentStudioEntries()[0]!.document,
      ageAccessPolicy: "adult_verification_required" as const,
    };
    mocks.client = createClient({
      assessment_content_entry: {
        data: {
          deleted_at: null,
          id: "entry-adult",
          paused_at: null,
          published_release_id: "release-adult",
          source_origin: "operator",
          status: "published",
        },
        error: null,
      },
      assessment_content_release: {
        data: {
          document,
          id: "release-adult",
          release_number: 1,
        },
        error: null,
      },
    });

    await expect(
      resolveAssessmentRuntimeContent({
        category: "core",
        slug: "adult-only",
        subtype: "core_quick",
      }),
    ).resolves.toMatchObject({
      document: null,
      releaseId: "release-adult",
      state: "unavailable",
    });
  });
});
