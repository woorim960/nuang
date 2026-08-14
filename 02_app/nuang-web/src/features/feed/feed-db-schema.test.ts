import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const foundationMigration = readFileSync(
  "supabase/migrations/202607090103_feed_foundation.sql",
  "utf8",
);
const seedTargetMigration = readFileSync(
  "supabase/migrations/202607090104_feed_seed_targets.sql",
  "utf8",
);
const feedApiGrantMigration = readFileSync(
  "supabase/migrations/202607090105_feed_api_grants.sql",
  "utf8",
);
const preferenceMigration = readFileSync(
  "supabase/migrations/202607090106_feed_preference_not_interested.sql",
  "utf8",
);
const interactionMigration = readFileSync(
  "supabase/migrations/202607100003_feed_mvp_interactions.sql",
  "utf8",
);
const homeCommunityPollMigration = readFileSync(
  "supabase/migrations/202607190002_home_daily_community_poll.sql",
  "utf8",
);
const topicMediaMigration = readFileSync(
  "supabase/migrations/202608140005_feed_post_topics_media.sql",
  "utf8",
);
const communityProfileSocialMigration = readFileSync(
  "supabase/migrations/202607200002_community_profile_social.sql",
  "utf8",
);
const communitySafetyMigration = readFileSync(
  "supabase/migrations/202607280003_community_safety_mvp.sql",
  "utf8",
);
const communityMutationGuardMigration = readFileSync(
  "supabase/migrations/202608140003_community_mutation_guard.sql",
  "utf8",
);
const atomicProfileBlockMigration = readFileSync(
  "supabase/migrations/202608050006_atomic_profile_block_cleanup.sql",
  "utf8",
);
const communitySocialServerSource = readFileSync(
  "src/features/feed/server-community-social.ts",
  "utf8",
);
const migrations = `${foundationMigration}\n${seedTargetMigration}\n${preferenceMigration}\n${interactionMigration}\n${homeCommunityPollMigration}\n${topicMediaMigration}`;

describe("feed db schema draft", () => {
  it("defines the first feed tables without legacy product naming", () => {
    expect(migrations).toContain("create schema if not exists feed");
    expect(migrations).toContain("create table feed.feed_post");
    expect(migrations).toContain("create table feed.feed_comment");
    expect(migrations).toContain("create table feed.feed_reaction");
    expect(migrations).toContain("create table feed.feed_bookmark");
    expect(migrations).toContain(
      "create table if not exists feed.feed_preference",
    );
    expect(migrations).toContain("create table if not exists feed.feed_poll");
    expect(migrations).toContain(
      "create table if not exists feed.feed_poll_option",
    );
    expect(migrations).toContain(
      "create table if not exists feed.feed_poll_vote",
    );
    expect(migrations).not.toContain("community");
  });

  it("keeps public feed projections separate from raw assessment data", () => {
    expect(migrations).toContain("attachment_payload jsonb");
    expect(migrations).toContain("public_projection_payload jsonb");
    expect(migrations).not.toContain("raw_score");
    expect(migrations).not.toContain("direct_response");
    expect(migrations).not.toContain("assessment_response");
  });

  it("enables RLS before opening future writes", () => {
    expect(foundationMigration).toContain(
      "alter table feed.feed_post enable row level security",
    );
    expect(foundationMigration).toContain(
      "alter table feed.feed_comment enable row level security",
    );
    expect(foundationMigration).toContain(
      "alter table feed.feed_reaction enable row level security",
    );
    expect(foundationMigration).toContain(
      "alter table feed.feed_bookmark enable row level security",
    );
  });

  it("supports official seed card targets without storing raw scoring data", () => {
    expect(seedTargetMigration).toContain("target_type = 'feed_seed_card'");
    expect(seedTargetMigration).toContain("feed_reaction_seed_unique_idx");
    expect(seedTargetMigration).toContain("feed_bookmark_seed_unique_idx");
    expect(seedTargetMigration).not.toContain("raw_score");
  });

  it("stores not interested as a private feed preference", () => {
    expect(preferenceMigration).toContain("preference in ('not_interested')");
    expect(preferenceMigration).toContain(
      "feed_preference_post_active_unique_idx",
    );
    expect(preferenceMigration).toContain(
      "feed_preference_seed_active_unique_idx",
    );
    expect(preferenceMigration).toContain(
      "alter table feed.feed_preference enable row level security",
    );
    expect(preferenceMigration).toContain("feed own preference read");
    expect(preferenceMigration).not.toContain("raw_score");
    expect(preferenceMigration).not.toContain("assessment_response");
  });

  it("grants the feed schema to Data API roles after feed tables are created", () => {
    expect(feedApiGrantMigration).toContain(
      "grant usage on schema feed to anon, authenticated, service_role",
    );
    expect(feedApiGrantMigration).toContain(
      "grant all on all tables in schema feed to anon, authenticated, service_role",
    );
    expect(feedApiGrantMigration).toContain("notify pgrst, 'reload schema'");
    expect(preferenceMigration).toContain(
      "grant all on feed.feed_preference to anon, authenticated, service_role",
    );
    expect(interactionMigration).toContain(
      "grant all on feed.feed_poll to anon, authenticated, service_role",
    );
    expect(interactionMigration).toContain(
      "grant all on feed.feed_poll_vote to anon, authenticated, service_role",
    );
    expect(communityProfileSocialMigration).toContain(
      "feed.profile_follow,\n  feed.activity_notification",
    );
    expect(communityProfileSocialMigration).toContain(
      "to anon, authenticated, service_role",
    );
    expect(communityProfileSocialMigration).toContain(
      "notify pgrst, 'reload schema'",
    );
  });

  it("supports feed MVP poll interactions without exposing voter lists", () => {
    expect(interactionMigration).toContain("'balance_game'");
    expect(interactionMigration).toContain("'report_share'");
    expect(interactionMigration).toContain("feed_poll_vote_active_account_idx");
    expect(interactionMigration).toContain("nuang_code text");
    expect(interactionMigration).not.toContain("direct_response");
    expect(interactionMigration).not.toContain("raw_score");
  });

  it("seeds one official home poll without storing assessment responses", () => {
    expect(homeCommunityPollMigration).toContain(
      "balance_home_free_day_together_solo_001",
    );
    expect(homeCommunityPollMigration).toContain(
      "insert into feed.feed_poll_option",
    );
    expect(homeCommunityPollMigration).toContain("'published'");
    expect(homeCommunityPollMigration).not.toContain("assessment_response");
    expect(homeCommunityPollMigration).not.toContain("raw_score");
  });

  it("stores post topics and ordered private media without a paid AI dependency", () => {
    expect(topicMediaMigration).toContain("topic_category text");
    expect(topicMediaMigration).toContain("topic_tags text[]");
    expect(topicMediaMigration).toContain("'local_suggestion'");
    expect(topicMediaMigration).toContain(
      "create table if not exists feed.feed_post_media",
    );
    expect(topicMediaMigration).toContain("sort_order between 1 and 19");
    expect(topicMediaMigration).toContain("'feed-media'");
    expect(topicMediaMigration).toContain("false,");
    expect(topicMediaMigration).not.toContain("openai");
    expect(topicMediaMigration).not.toContain("gemini");
  });

  it("adds content reporting, write quotas, and link-gated publishing", () => {
    expect(communitySafetyMigration).toContain(
      "create table if not exists feed.content_report",
    );
    expect(communitySafetyMigration).toContain(
      "content_report_open_post_reporter_unique",
    );
    expect(communitySafetyMigration).toContain(
      "profile_report_open_reporter_target_unique",
    );
    expect(communitySafetyMigration).toContain(
      "create table if not exists feed.community_write_bucket",
    );
    expect(communitySafetyMigration).toContain(
      "create or replace function feed.check_community_write_guard",
    );
    expect(communitySafetyMigration).toContain(
      "create trigger feed_external_link_moderation_sync",
    );
    expect(communitySafetyMigration).toContain(
      "when v_has_pending then 'pending_review'",
    );
    expect(communitySafetyMigration).toContain(
      "when v_has_blocked then 'removed'",
    );
    expect(communitySafetyMigration).toContain(
      "revoke all on feed.content_report, feed.community_write_bucket",
    );
  });

  it("fails closed around public interaction targets and rate limits every growing action", () => {
    expect(communityMutationGuardMigration).toContain(
      "create or replace function feed.check_community_mutation_guard",
    );
    expect(communityMutationGuardMigration).toContain(
      "moderation_status = 'published'",
    );
    expect(communityMutationGuardMigration).toContain(
      "visibility in ('public', 'profile_public')",
    );
    expect(communityMutationGuardMigration).toContain(
      "comment.deleted_at is null",
    );
    expect(communityMutationGuardMigration).toContain("when 'react' then");
    expect(communityMutationGuardMigration).toContain("when 'bookmark' then");
    expect(communityMutationGuardMigration).toContain("when 'vote_poll' then");
    expect(communityMutationGuardMigration).toContain(
      "when 'follow_profile' then",
    );
    expect(communityMutationGuardMigration).toContain(
      "return 'target_invalid'",
    );
    expect(communityMutationGuardMigration).toContain("to service_role");
  });

  it("removes both follow directions and notifications in the block transaction", () => {
    expect(atomicProfileBlockMigration).toContain(
      "function feed.set_profile_block",
    );
    expect(atomicProfileBlockMigration).toContain("update feed.profile_follow");
    expect(atomicProfileBlockMigration).toContain(
      "update feed.activity_notification",
    );
    expect(atomicProfileBlockMigration).toContain(
      "follower_account_id = p_blocked_account_id",
    );
    expect(communitySocialServerSource).toContain('.rpc("set_profile_block"');
  });
});
