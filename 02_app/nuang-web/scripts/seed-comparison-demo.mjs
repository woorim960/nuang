import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = {
  ...process.env,
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
};

const url = nonEmpty(env.NEXT_PUBLIC_SUPABASE_URL);
const serviceRoleKey = nonEmpty(env.SUPABASE_SERVICE_ROLE_KEY);

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(1);
}

const client = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const policyVersion = "profile-visibility.v0.1";
const snapshotContractVersion = "public-profile-snapshot.v0.1";
const scoringVersion = "dev-comparison-demo.v0.1";
const itemReleaseVersion = "dev-comparison-demo.v0.1";

const characterAssetPaths = {
  flame: "/assets/characters/nuang-character-flame.webp",
  forest: "/assets/characters/nuang-character-forest.webp",
  purple: "/assets/characters/nuang-character-purple.webp",
  sun: "/assets/characters/nuang-character-sun.webp",
  water: "/assets/characters/nuang-character-water.webp",
};

const domains = [
  ["SE", "사람 사이 에너지"],
  ["ER", "마음의 반응"],
  ["SM", "일상 리듬"],
  ["RO", "관계 방식"],
  ["OE", "감각과 생각"],
];

const facetLabels = [
  "먼저 다가가기",
  "거리 존중",
  "감정 표현",
  "감정 회복",
  "계획 유지",
  "유연한 전환",
  "세부 관찰",
  "큰 그림 이해",
  "새로움 탐색",
  "익숙함 안정",
];

const devAccounts = [
  {
    accountId: "10000000-0000-4000-8000-000000000101",
    attemptId: "11000000-0000-4000-8000-000000000101",
    displayName: "서연",
    handle: "seoyeon.flame",
    motif: "flame",
    postId: "12000000-0000-4000-8000-000000000101",
    profileCode: "TVOAE",
    profileName: "불꽃의 온기 탐험가",
    publishedAt: "2026-07-10T02:10:00.000Z",
    resultReportId: "13000000-0000-4000-8000-000000000101",
    scores: [76, 68, 62, 71, 79],
    snapshotId: "14000000-0000-4000-8000-000000000101",
    source: "daily_mood",
    text:
      "오늘은 먼저 말을 걸고 싶은 에너지가 커요. 가볍게 시작하면 대화가 금방 따뜻해지는 날 같아요.",
  },
  {
    accountId: "10000000-0000-4000-8000-000000000102",
    attemptId: "11000000-0000-4000-8000-000000000102",
    displayName: "지호",
    handle: "jiho.water",
    motif: "water",
    postId: "12000000-0000-4000-8000-000000000102",
    profileCode: "SVODE",
    profileName: "물결의 새길 개척가",
    publishedAt: "2026-07-10T02:04:00.000Z",
    resultReportId: "13000000-0000-4000-8000-000000000102",
    scores: [42, 74, 58, 77, 66],
    snapshotId: "14000000-0000-4000-8000-000000000102",
    source: "daily_question",
    text:
      "다른 사람과 속도가 다를 때는 바로 맞추기보다, 잠깐 관찰한 뒤 내 방식으로 답하는 편이에요.",
  },
  {
    accountId: "10000000-0000-4000-8000-000000000103",
    attemptId: "11000000-0000-4000-8000-000000000103",
    displayName: "하린",
    handle: "harin.sun",
    motif: "sun",
    postId: "12000000-0000-4000-8000-000000000103",
    profileCode: "TCOAP",
    profileName: "햇살의 세심한 실천가",
    publishedAt: "2026-07-10T01:58:00.000Z",
    resultReportId: "13000000-0000-4000-8000-000000000103",
    scores: [63, 52, 82, 69, 48],
    snapshotId: "14000000-0000-4000-8000-000000000103",
    source: "trait_card",
    text:
      "내 성향을 한 문장으로 적어보니 생각보다 명확해졌어요. 편안한 루틴이 저를 잘 설명해주는 것 같아요.",
  },
  {
    accountId: "10000000-0000-4000-8000-000000000104",
    attemptId: "11000000-0000-4000-8000-000000000104",
    displayName: "도윤",
    handle: "doyun.forest",
    motif: "forest",
    postId: "12000000-0000-4000-8000-000000000104",
    profileCode: "SCFAP",
    profileName: "숲의 편안한 조율가",
    publishedAt: "2026-07-10T01:52:00.000Z",
    resultReportId: "13000000-0000-4000-8000-000000000104",
    scores: [36, 61, 75, 55, 44],
    snapshotId: "14000000-0000-4000-8000-000000000104",
    source: "map_reflection",
    text:
      "성향지도를 보니 저는 조용히 균형을 맞추는 쪽에 가까웠어요. 느리지만 오래 가는 관계가 편해요.",
  },
  {
    accountId: "10000000-0000-4000-8000-000000000105",
    attemptId: "11000000-0000-4000-8000-000000000105",
    displayName: "민재",
    handle: "minjae.spark",
    motif: "flame",
    postId: "12000000-0000-4000-8000-000000000105",
    profileCode: "TVFDE",
    profileName: "불꽃의 자유 발견가",
    publishedAt: "2026-07-10T01:45:00.000Z",
    resultReportId: "13000000-0000-4000-8000-000000000105",
    scores: [81, 57, 46, 73, 88],
    snapshotId: "14000000-0000-4000-8000-000000000105",
    source: "free_text",
    text:
      "새로운 장소에서 생각이 확 열리는 편이에요. 오늘은 익숙한 루틴보다 작은 변화를 하나 넣어보고 싶어요.",
  },
];

const comments = [
  {
    authorIndex: 1,
    body: "이 표현 좋다. 나도 오늘은 조금 천천히 반응하고 싶었어.",
    commentId: "15000000-0000-4000-8000-000000000101",
    postIndex: 0,
    publishedAt: "2026-07-10T02:13:00.000Z",
  },
  {
    authorIndex: 2,
    body: "루틴이 편하다는 말에 공감돼. 안정감이 먼저 있어야 움직이기 쉬운 것 같아.",
    commentId: "15000000-0000-4000-8000-000000000102",
    postIndex: 3,
    publishedAt: "2026-07-10T02:01:00.000Z",
  },
  {
    authorIndex: 4,
    body: "새로운 장소에서 생각이 열린다는 말 완전 내 쪽이다.",
    commentId: "15000000-0000-4000-8000-000000000103",
    postIndex: 4,
    publishedAt: "2026-07-10T01:51:00.000Z",
  },
];

const reactions = [
  [0, 1, "same"],
  [0, 2, "like"],
  [1, 0, "curious"],
  [2, 3, "support"],
  [3, 4, "same"],
  [4, 0, "like"],
].map(([postIndex, accountIndex, reaction], index) => ({
  accountIndex,
  postIndex,
  reaction,
  reactionId: `16000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
}));

const balanceGamePost = {
  body:
    "저는 산 쪽이 더 끌려요. 혼자 걸으면서 생각이 조용히 정리되는 시간이 좋아요.",
  createdAt: "2026-07-10T02:18:00.000Z",
  optionIds: {
    mountain: "18000000-0000-4000-8000-000000000201",
    sea: "18000000-0000-4000-8000-000000000202",
  },
  options: [
    {
      key: "mountain",
      label: "산",
      sortOrder: 1,
    },
    {
      key: "sea",
      label: "바다",
      sortOrder: 2,
    },
  ],
  pollId: "18000000-0000-4000-8000-000000000101",
  postId: "12000000-0000-4000-8000-000000000201",
  promptId: "balance_trip_mountain_sea_001",
  question: "나 혼자 여행 간다면?",
  votes: [
    {
      accountIndex: 0,
      optionKey: "mountain",
      voteId: "19000000-0000-4000-8000-000000000101",
    },
    {
      accountIndex: 1,
      optionKey: "sea",
      voteId: "19000000-0000-4000-8000-000000000102",
    },
    {
      accountIndex: 2,
      optionKey: "mountain",
      voteId: "19000000-0000-4000-8000-000000000103",
    },
    {
      accountIndex: 3,
      optionKey: "mountain",
      voteId: "19000000-0000-4000-8000-000000000104",
    },
    {
      accountIndex: 4,
      optionKey: "sea",
      voteId: "19000000-0000-4000-8000-000000000105",
    },
  ],
};

const reportSharePost = {
  accountIndex: 1,
  body: "요즘 저를 설명하는 뉴앙 리포트를 공유해요. 저는 새로운 길을 천천히 열어보는 쪽에 가까웠어요.",
  createdAt: "2026-07-10T02:16:00.000Z",
  postId: "12000000-0000-4000-8000-000000000202",
};

const profileVisibilityDefaults = [
  ["display_profile", "public", "allowed"],
  ["representative_profile", "public", "allowed"],
  ["core_domain_map", "public", "allowed"],
  ["core_facet_summary", "public", "allowed"],
  ["quick_core_result", "private", "hidden"],
  ["lab_results", "private", "hidden"],
  ["direct_responses", "private", "blocked"],
  ["raw_scores", "private", "blocked"],
  ["sensitive_assessments", "private", "blocked"],
  ["crisis_help_interactions", "private", "blocked"],
  ["demographics", "private", "hidden"],
  ["account_identity", "private", "blocked"],
].map(([fieldId, visibility, comparisonUse]) => ({
  comparisonUse,
  fieldId,
  visibility,
}));

await main();

async function main() {
  console.log("Seeding NUANG comparison demo dataset...");

  await upsertAccounts();
  await upsertContactProfiles();
  await upsertAttempts();
  await upsertReports();
  await upsertVisibilitySettings();
  await upsertPublicSnapshots();
  await upsertFeedPosts();
  await upsertFeedPolls();
  await upsertComments();
  await upsertReactions();

  console.log("Seed complete.");
  console.log(
    JSON.stringify(
      {
        feedPosts: devAccounts.length + 2,
        pollVotes: balanceGamePost.votes.length,
        publicProfiles: devAccounts.map((account) => ({
          displayName: account.displayName,
          profileCode: account.profileCode,
          publicSnapshotId: account.snapshotId,
        })),
      },
      null,
      2,
    ),
  );
}

async function upsertAccounts() {
  await must(
    client.schema("identity").from("account").upsert(
      devAccounts.map((account) => ({
        id: account.accountId,
        status: "active",
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "id" },
    ),
    "identity.account",
  );
}

async function upsertContactProfiles() {
  await must(
    client.schema("identity").from("contact_profile").upsert(
      devAccounts.map((account) => ({
        account_id: account.accountId,
        avatar_url: characterAssetPaths[account.motif],
        display_name: account.displayName,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "account_id" },
    ),
    "identity.contact_profile",
  );
}

async function upsertAttempts() {
  await must(
    client.schema("assessment").from("assessment_attempt").upsert(
      devAccounts.map((account) => ({
        account_id: account.accountId,
        assessment_kind: "full",
        assessment_slug: "core-full-demo",
        claimed_at: account.publishedAt,
        completed_at: account.publishedAt,
        id: account.attemptId,
        item_release_version: itemReleaseVersion,
        local_result_id: `dev_demo_${account.handle}`,
        scoring_version: scoringVersion,
        status: "claimed",
      })),
      { onConflict: "id" },
    ),
    "assessment.assessment_attempt",
  );
}

async function upsertReports() {
  await must(
    client.schema("report").from("result_report").upsert(
      devAccounts.map((account) => ({
        account_id: account.accountId,
        attempt_id: account.attemptId,
        created_at: account.publishedAt,
        id: account.resultReportId,
        profile_code: account.profileCode,
        profile_name: account.profileName,
        report_kind: "full",
        share_summary: createShareSummary(account),
        summary: createResultSummary(account),
      })),
      { onConflict: "id" },
    ),
    "report.result_report",
  );
}

async function upsertVisibilitySettings() {
  const settings = devAccounts.flatMap((account) =>
    profileVisibilityDefaults.map((setting) => ({
      account_id: account.accountId,
      comparison_use: setting.comparisonUse,
      field_id: setting.fieldId,
      policy_version: policyVersion,
      updated_at: new Date().toISOString(),
      visibility: setting.visibility,
    })),
  );

  await must(
    client.schema("profile").from("profile_visibility_setting").upsert(settings, {
      onConflict: "account_id,field_id",
    }),
    "profile.profile_visibility_setting",
  );
}

async function upsertPublicSnapshots() {
  await must(
    client.schema("profile").from("profile_public_snapshot").upsert(
      devAccounts.map((account) => ({
        account_id: account.accountId,
        created_at: account.publishedAt,
        id: account.snapshotId,
        published_at: account.publishedAt,
        result_report_id: account.resultReportId,
        snapshot_payload: createPublicSnapshotPayload(account),
        status: "active",
        visibility_policy_version: policyVersion,
      })),
      { onConflict: "id" },
    ),
    "profile.profile_public_snapshot",
  );
}

async function upsertFeedPosts() {
  const reportAuthor = devAccounts[reportSharePost.accountIndex];
  const feedRows = [
    ...devAccounts.map((account) => ({
      attachment_payload: [],
      author_account_id: account.accountId,
      body: account.text,
      created_at: account.publishedAt,
      id: account.postId,
      moderation_status: "published",
      public_projection_payload: {
        authorHandle: account.handle,
        authorName: account.displayName,
        publicSnapshotId: account.snapshotId,
      },
      published_at: account.publishedAt,
      source: account.source,
      source_id: `dev_demo_${account.handle}`,
      visibility: "public",
    })),
    {
      attachment_payload: [],
      author_account_id: devAccounts[0].accountId,
      body: balanceGamePost.body,
      created_at: balanceGamePost.createdAt,
      id: balanceGamePost.postId,
      moderation_status: "published",
      public_projection_payload: {
        authorHandle: devAccounts[0].handle,
        authorName: devAccounts[0].displayName,
        balanceGame: {
          promptId: balanceGamePost.promptId,
          question: balanceGamePost.question,
          selectedOptionKey: "mountain",
          version: "balance-game.v0.1",
        },
        publicSnapshotId: devAccounts[0].snapshotId,
        source: "balance_game",
        sourceId: balanceGamePost.promptId,
      },
      published_at: balanceGamePost.createdAt,
      source: "balance_game",
      source_id: balanceGamePost.promptId,
      visibility: "public",
    },
    {
      attachment_payload: [
        {
          id: reportAuthor.resultReportId,
          type: "result_summary",
        },
      ],
      author_account_id: reportAuthor.accountId,
      body: reportSharePost.body,
      created_at: reportSharePost.createdAt,
      id: reportSharePost.postId,
      moderation_status: "published",
      public_projection_payload: {
        authorHandle: reportAuthor.handle,
        authorName: reportAuthor.displayName,
        publicSnapshotId: reportAuthor.snapshotId,
        reportShare: {
          assessmentKind: "full",
          completedAt: reportAuthor.publishedAt,
          domains: createDomains(reportAuthor),
          profileCode: reportAuthor.profileCode,
          profileName: reportAuthor.profileName,
          resultLabel: "현재 대표 성향",
        },
        source: "report_share",
        sourceId: reportAuthor.resultReportId,
      },
      published_at: reportSharePost.createdAt,
      source: "report_share",
      source_id: reportAuthor.resultReportId,
      visibility: "public",
    },
  ];

  await must(
    client.schema("feed").from("feed_post").upsert(feedRows, { onConflict: "id" }),
    "feed.feed_post",
  );
}

async function upsertFeedPolls() {
  await must(
    client.schema("feed").from("feed_poll").upsert(
      {
        created_at: balanceGamePost.createdAt,
        id: balanceGamePost.pollId,
        post_id: balanceGamePost.postId,
        prompt_id: balanceGamePost.promptId,
        question: balanceGamePost.question,
        status: "active",
      },
      { onConflict: "id" },
    ),
    "feed.feed_poll",
  );

  await must(
    client.schema("feed").from("feed_poll_option").upsert(
      balanceGamePost.options.map((option) => ({
        id: balanceGamePost.optionIds[option.key],
        label: option.label,
        option_key: option.key,
        poll_id: balanceGamePost.pollId,
        sort_order: option.sortOrder,
      })),
      { onConflict: "id" },
    ),
    "feed.feed_poll_option",
  );

  await must(
    client.schema("feed").from("feed_poll_vote").upsert(
      balanceGamePost.votes.map((vote) => {
        const account = devAccounts[vote.accountIndex];

        return {
          account_id: account.accountId,
          created_at: balanceGamePost.createdAt,
          id: vote.voteId,
          nuang_code: account.profileCode,
          option_id: balanceGamePost.optionIds[vote.optionKey],
          poll_id: balanceGamePost.pollId,
          profile_name: account.profileName,
        };
      }),
      { onConflict: "id" },
    ),
    "feed.feed_poll_vote",
  );
}

async function upsertComments() {
  await must(
    client.schema("feed").from("feed_comment").upsert(
      comments.map((comment) => ({
        author_account_id: devAccounts[comment.authorIndex].accountId,
        body: comment.body,
        created_at: comment.publishedAt,
        id: comment.commentId,
        moderation_status: "published",
        post_id: devAccounts[comment.postIndex].postId,
        published_at: comment.publishedAt,
        target_key: null,
        target_type: "feed_post",
      })),
      { onConflict: "id" },
    ),
    "feed.feed_comment",
  );
}

async function upsertReactions() {
  await must(
    client.schema("feed").from("feed_reaction").upsert(
      reactions.map((reaction) => ({
        account_id: devAccounts[reaction.accountIndex].accountId,
        created_at: devAccounts[reaction.postIndex].publishedAt,
        id: reaction.reactionId,
        reaction: reaction.reaction,
        target_id: devAccounts[reaction.postIndex].postId,
        target_key: null,
        target_type: "feed_post",
      })),
      { onConflict: "id" },
    ),
    "feed.feed_reaction",
  );
}

function createPublicSnapshotPayload(account) {
  return {
    contractVersion: snapshotContractVersion,
    createdAt: account.publishedAt,
    displayProfile: {
      displayName: account.displayName,
      motif: account.motif,
      profileImage: {
        alt: `${account.displayName} 프로필 이미지`,
        motif: account.motif,
        source: "character",
        src: characterAssetPaths[account.motif],
      },
    },
    privacy: {
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    },
    profile: {
      code: account.profileCode,
      name: account.profileName,
    },
    publicData: {
      coreDomainMap: createDomains(account),
      coreFacetSummary: createFacets(account),
    },
    snapshotId: account.snapshotId,
    visibility: {
      includedFields: [
        "display_profile",
        "representative_profile",
        "core_domain_map",
        "core_facet_summary",
      ],
      policyVersion,
    },
  };
}

function createResultSummary(account) {
  return {
    assessmentKind: "full",
    completedAt: account.publishedAt,
    domains: createDomains(account),
    facets: createFacets(account),
    profileCode: account.profileCode,
    profileName: account.profileName,
    resultLabel: "현재 대표 성향",
  };
}

function createShareSummary(account) {
  return {
    assessmentKind: "full",
    completedAt: account.publishedAt,
    domains: createDomains(account),
    profileCode: account.profileCode,
    profileName: account.profileName,
    resultLabel: "현재 대표 성향",
  };
}

function createDomains(account) {
  return account.scores.map((score, index) => ({
    domainId: domains[index][0],
    id: domains[index][0],
    isBoundary: false,
    label: domains[index][1],
    score,
    status: "valid",
    symbol: account.profileCode[index] ?? null,
  }));
}

function createFacets(account) {
  return facetLabels.map((label, index) => {
    const domainScore = account.scores[index % account.scores.length];
    const offset = index % 2 === 0 ? 4 : -4;

    return {
      facetId: `facet_${index + 1}`,
      label,
      score: Math.max(0, Math.min(100, domainScore + offset)),
      status: "valid",
      validResponses: 6,
    };
  });
}

async function must(query, label) {
  const { error } = await query;

  if (error) {
    console.error(`Failed to seed ${label}: ${error.message}`);
    if (error.details) console.error(error.details);
    if (error.hint) console.error(error.hint);
    process.exit(1);
  }
}

function readEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);

  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) return [line, ""];

        const key = line.slice(0, separatorIndex).trim();
        const value = stripQuotes(line.slice(separatorIndex + 1).trim());
        return [key, value];
      }),
  );
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
