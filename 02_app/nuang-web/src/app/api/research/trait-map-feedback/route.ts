import { NextResponse } from "next/server";
import { z } from "zod";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { readAccountResults } from "@/features/account/server-reads";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { nuangCodeSchema } from "@/features/nuang-code/trait-map-knowledge-contract";
import { getPublishedTraitMapCustomerGuide } from "@/features/nuang-code/trait-map-customer-guide-registry";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const fitRatingSchema = z.enum([
  "very_close",
  "mostly_close",
  "partly_different",
  "very_different",
]);
const feedbackSchema = z.object({
  chapterId: z.string().regex(/^chapter-\d{2}$/),
  code: nuangCodeSchema,
  fitRating: fitRatingSchema,
  note: z.string().trim().max(500).default(""),
  sectionKey: z.string().regex(/^section-\d{2}$/),
});

export async function GET(request: Request) {
  const parsedCode = nuangCodeSchema.safeParse(
    new URL(request.url).searchParams.get("code"),
  );
  if (!parsedCode.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const context = await loadFeedbackContext();
  if (!context.ok) return context.response;

  const representative = selectRepresentativeResult(context.results);
  if (!representative || representative.profileCode !== parsedCode.data) {
    return NextResponse.json({
      eligible: false,
      feedback: [],
      ok: true,
    });
  }

  const response = await context.serviceClient
    .from("research_trait_map_section_feedback")
    .select("chapter_id,section_key,fit_rating,note")
    .eq("account_id", context.accountId)
    .eq("profile_code", parsedCode.data);

  if (response.error) {
    return NextResponse.json(
      { error: "trait_map_feedback_read_failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    eligible: true,
    feedback: (response.data ?? []).map((row) => ({
      chapterId: row.chapter_id,
      fitRating: row.fit_rating,
      note: row.note ?? "",
      sectionKey: row.section_key,
    })),
    ok: true,
  });
}

export async function POST(request: Request) {
  const parsedBody = feedbackSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedBody.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const context = await loadFeedbackContext();
  if (!context.ok) return context.response;

  const representative = selectRepresentativeResult(context.results);
  if (!representative || representative.profileCode !== parsedBody.data.code) {
    return NextResponse.json(
      { error: "own_profile_code_required" },
      { status: 403 },
    );
  }

  const guide = getPublishedTraitMapCustomerGuide(parsedBody.data.code);
  const chapter = guide?.chapters.find(
    (candidate) => candidate.id === parsedBody.data.chapterId,
  );
  const sectionIndex = Number(parsedBody.data.sectionKey.slice(-2)) - 1;
  const section = chapter?.sections[sectionIndex];
  if (!guide || !chapter || !section) {
    return NextResponse.json(
      { error: "trait_map_section_not_found" },
      { status: 404 },
    );
  }

  const response = await context.serviceClient
    .from("research_trait_map_section_feedback")
    .upsert(
      {
        account_id: context.accountId,
        chapter_id: chapter.id,
        fit_rating: parsedBody.data.fitRating,
        guide_version: guide.version,
        note: parsedBody.data.note || null,
        profile_code: guide.code,
        section_key: parsedBody.data.sectionKey,
        section_title: section.title,
        updated_at: new Date().toISOString(),
        verification_source: "account_result",
      },
      {
        onConflict:
          "account_id,guide_version,profile_code,chapter_id,section_key",
      },
    );

  if (response.error) {
    return NextResponse.json(
      { error: "trait_map_feedback_save_failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function loadFeedbackContext() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth;

  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) {
    return {
      ok: false as const,
      response: createApiClosedResponse("supabase_env_missing"),
    };
  }

  const [accountResponse, resultsResponse] = await Promise.all([
    serviceClient
      .schema("identity")
      .from("auth_identity")
      .select("account_id")
      .eq("supabase_user_id", auth.user.id)
      .is("revoked_at", null)
      .order("provider_linked_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    readAccountResults({
      client: serviceClient,
      user: auth.user,
    }),
  ]);

  if (accountResponse.error || !accountResponse.data || !resultsResponse.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "trait_map_feedback_context_failed" },
        { status: 503 },
      ),
    };
  }

  return {
    accountId: accountResponse.data.account_id as string,
    ok: true as const,
    results: resultsResponse.data,
    serviceClient,
  };
}

function selectRepresentativeResult(results: AccountResultSummary[]) {
  return [...results].sort((left, right) => {
    const kindDifference =
      Number(right.kind === "full") - Number(left.kind === "full");
    if (kindDifference !== 0) return kindDifference;
    return right.completedAt.localeCompare(left.completedAt);
  })[0];
}
