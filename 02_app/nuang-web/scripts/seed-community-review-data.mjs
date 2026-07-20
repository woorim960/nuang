import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes("--apply");
const now = new Date();
const release = {
  codeSchemeVersion: "NUANG-CODE-5AXIS-CANDIDATE-1.0",
  measurementReleaseId: "NUANG-CORE-FULL-CANDIDATE-1.0",
  scoringModelVersion: "CORE_SCORING_ALGORITHM_SPEC_v1.0-BETA",
  scoringReleaseId: "NUANG-CORE-FULL-CANDIDATE-SCORING-1.0",
};
const profiles = [
  profile(1, "ENAKQ", "서연 · 예시", "flame", "관계를 여는 지휘자"),
  profile(2, "IRGMC", "지호 · 예시", "water", "단서를 좇는 탐구자"),
  profile(3, "ERAKC", "하린 · 예시", "sun", "온도를 맞추는 조율가"),
  profile(4, "INAKC", "도윤 · 예시", "forest", "조용히 잇는 연결가"),
];
const posts = [
  reviewPost(1, 0, {
    body: "비가 그친 뒤 자주 가던 카페에 들렀어요. 익숙한 공간인데 창가에 앉으니 오늘은 조금 다르게 보이네요.",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=86",
    topic: ["daily_life", "카페", "비 온 뒤"],
  }),
  reviewPost(2, 0, {
    body: "좋아하는 사람이 힘든 이야기를 꺼냈을 때, 해결책보다 어떤 말을 건네면 편할지 궁금해요. 여러분은 어떻게 하나요?",
    topic: ["concerns_questions", "관계", "대화"],
  }),
  reviewPost(3, 1, {
    body: "정해진 길보다 한 번도 가보지 않은 골목으로 걸어봤어요. 예상 밖의 풍경을 만나는 게 생각보다 큰 환기가 되네요.",
    image:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=86",
    topic: ["daily_life", "산책", "새로운 길"],
  }),
  reviewPost(4, 1, {
    body: "회의에서 문제의 원인을 빨리 찾고 싶었지만, 모두가 말할 준비가 될 때까지 기다렸어요. 결과만큼 과정도 중요하다는 생각이 들었습니다.",
    topic: ["thoughts", "직장", "대화"],
  }),
  reviewPost(5, 2, {
    body: "오랜 친구들과 계절마다 한 장씩 사진을 남기기로 했어요. 별일 없는 하루도 함께 기록하면 특별해지는 것 같아요.",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=86",
    topic: ["relationships", "친구", "기록"],
  }),
  reviewPost(6, 2, {
    body: "상대가 속상해 보일 때 바로 묻는 편인가요, 조금 기다렸다가 편해 보일 때 말을 거는 편인가요?",
    topic: ["concerns_questions", "관계", "공감"],
  }),
  reviewPost(7, 3, {
    body: "주말마다 작은 화분 하나를 돌보는 시간이 좋아요. 눈에 띄는 변화는 느리지만 그래서 더 오래 바라보게 됩니다.",
    image:
      "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1200&q=86",
    topic: ["preferences", "식물", "주말"],
  }),
  reviewPost(8, 3, {
    body: "말수가 적어도 편안한 관계가 있다는 걸 알게 됐어요. 대화의 양보다 서로를 재촉하지 않는 태도가 더 중요할 때도 있네요.",
    topic: ["thoughts", "관계", "편안함"],
  }),
  reviewPost(9, 2, {
    body: "좋아하는 사람에게 서운한 일이 생겼을 때 바로 이야기하는지, 마음을 정리한 뒤 말하는지 INGMC의 실제 경험이 궁금해요.",
    sourceId: "ask_exact_ingmc",
    topic: ["concerns_questions", "관계", "대화"],
  }),
];

console.log(
  JSON.stringify(
    { applyChanges, posts: posts.length, profiles: profiles.length },
    null,
    2,
  ),
);
if (!applyChanges) process.exit(0);

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

for (const item of profiles) {
  const completedAt = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const domains = createDomains(item.code);
  const facets = createFacets(domains);
  await upsert("identity", "account", {
    created_at: completedAt,
    deleted_at: null,
    id: item.accountId,
    status: "active",
    updated_at: completedAt,
  });
  await upsert("assessment", "assessment_attempt", {
    account_id: item.accountId,
    assessment_kind: "full",
    assessment_slug: "nu-core-full",
    claimed_at: completedAt,
    code_scheme_version: release.codeSchemeVersion,
    completed_at: completedAt,
    id: item.attemptId,
    item_release_version: release.measurementReleaseId,
    measurement_release_id: release.measurementReleaseId,
    scoring_release_id: release.scoringReleaseId,
    scoring_version: release.scoringModelVersion,
    status: "claimed",
  });
  await upsert("scoring", "score_snapshot", {
    account_id: item.accountId,
    attempt_id: item.attemptId,
    code_scheme_version: release.codeSchemeVersion,
    id: item.scoreId,
    measurement_release_id: release.measurementReleaseId,
    score_payload: {
      assessmentKind: "full",
      completedAt,
      domains,
      facets,
      includesDirectResponses: false,
      profileCode: item.code,
      profileName: item.profileName,
      scoringVersion: release.scoringModelVersion,
    },
    scoring_release_id: release.scoringReleaseId,
    scoring_version: release.scoringModelVersion,
  });
  const summary = {
    assessmentKind: "full",
    completedAt,
    domains,
    facets,
    profileCode: item.code,
    profileName: item.profileName,
    resultLabel: "정밀 성향 결과",
    versionBundle: {
      assessmentReleaseId: release.measurementReleaseId,
      codeSchemeVersion: release.codeSchemeVersion,
      scoringModelVersion: release.scoringModelVersion,
      scoringReleaseId: release.scoringReleaseId,
    },
  };
  await upsert("report", "result_report", {
    account_id: item.accountId,
    attempt_id: item.attemptId,
    code_scheme_version: release.codeSchemeVersion,
    id: item.reportId,
    measurement_release_id: release.measurementReleaseId,
    profile_code: item.code,
    profile_name: item.profileName,
    report_kind: "full",
    scoring_release_id: release.scoringReleaseId,
    share_summary: summary,
    summary,
  });
  await upsert("profile", "profile_public_snapshot", {
    account_id: item.accountId,
    deleted_at: null,
    id: item.snapshotId,
    published_at: completedAt,
    result_report_id: item.reportId,
    snapshot_payload: createSnapshot(item, domains, facets, completedAt),
    status: "active",
    visibility_policy_version: "profile-visibility.v0.1",
  });
}

for (const post of posts) await upsert("feed", "feed_post", post);
for (let index = 0; index < posts.length; index += 1) {
  const author = profiles[(index + 1) % profiles.length];
  const createdAt = new Date(
    now.getTime() - (index + 1) * 18 * 60 * 1000,
  ).toISOString();
  await upsert("feed", "feed_comment", {
    author_account_id: author.accountId,
    body: [
      "저도 비슷한 순간이 있었어요. 글을 읽으니 그때가 떠오르네요.",
      "이런 관점은 생각해 보지 못했어요. 다음 이야기도 궁금해요.",
      "공감돼요. 서로 다른 선택도 편하게 나눌 수 있으면 좋겠어요.",
    ][index % 3],
    created_at: createdAt,
    id: id("26000000", index + 1),
    moderation_status: "published",
    post_id: posts[index].id,
    published_at: createdAt,
  });
}

console.log(
  JSON.stringify({
    applied: true,
    posts: posts.length,
    profiles: profiles.length,
  }),
);

async function upsert(schema, table, row) {
  const response = await client
    .schema(schema)
    .from(table)
    .upsert(row, { onConflict: "id" });
  if (response.error) {
    throw new Error(`${schema}.${table}: ${response.error.message}`);
  }
}

function profile(number, code, displayName, motif, profileName) {
  return {
    accountId: id("20000000", number),
    attemptId: id("21000000", number),
    code,
    displayName,
    motif,
    profileName,
    reportId: id("23000000", number),
    scoreId: id("22000000", number),
    snapshotId: id("24000000", number),
  };
}

function reviewPost(
  number,
  profileIndex,
  { body, image, sourceId = null, topic },
) {
  const item = profiles[profileIndex];
  const publishedAt = new Date(
    now.getTime() - number * 37 * 60 * 1000,
  ).toISOString();
  return {
    attachment_payload: image
      ? [
          {
            alt: `${item.displayName}님의 게시물 사진`,
            externalUrl: image,
            type: "image",
          },
        ]
      : [],
    author_account_id: item.accountId,
    body,
    created_at: publishedAt,
    deleted_at: null,
    id: id("25000000", number),
    moderation_status: "published",
    public_projection_payload: {
      authorHandle: `review.${profileIndex + 1}`,
      authorName: item.displayName,
      reviewFixture: true,
      topic: { category: topic[0], source: "manual", tags: topic.slice(1) },
    },
    published_at: publishedAt,
    source: "free_text",
    source_id: sourceId,
    visibility: "public",
  };
}

function createSnapshot(item, domains, facets, createdAt) {
  return {
    contractVersion: "public-profile-snapshot.v0.1",
    createdAt,
    displayProfile: { displayName: item.displayName, motif: item.motif },
    privacy: {
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    },
    profile: { code: item.code, name: item.profileName },
    publicData: {
      coreDomainMap: domains.map((domain) => ({
        id: domain.domainId,
        isBoundary: false,
        label: domain.label,
        score: domain.score,
        status: "valid",
        symbol: domain.symbol,
      })),
      coreFacetSummary: facets.map((facet) => ({
        id: facet.facetId,
        label: facet.label,
        score: facet.score,
        status: facet.status,
      })),
    },
    snapshotId: item.snapshotId,
    visibility: {
      includedFields: [
        "display_profile",
        "representative_profile",
        "core_domain_map",
        "core_facet_summary",
      ],
      policyVersion: "profile-visibility.v0.1",
    },
  };
}

function createDomains(code) {
  const definitions = [
    ["SE", "사람 사이 에너지", "I", "E"],
    ["OE", "생각과 탐색", "R", "N"],
    ["RO", "관계에서 관심이 가는 곳", "G", "A"],
    ["SM", "일상을 꾸리는 방식", "M", "K"],
    ["ER", "걱정과 감정 반응", "C", "Q"],
  ];
  return definitions.map(([domainId, label, , high], index) => ({
    domainId,
    label,
    score: code[index] === high ? 68 : 32,
    symbol: code[index],
  }));
}

function createFacets(domains) {
  const definitions = [
    ["SE", "SE-RE", "함께하는 에너지", -4],
    ["SE", "SE-AI", "먼저 표현하기", 4],
    ["OE", "OE-AE", "미적 경험", -5],
    ["OE", "OE-CI", "상상 확장", 2],
    ["OE", "OE-IE", "지적 탐구", 6],
    ["RO", "RO-EC", "관계에서 관심이 가는 곳", 0],
    ["SM", "SM-EP", "실행과 지속", 3],
    ["SM", "SM-OS", "질서와 구조", -3],
    ["ER", "ER-IR", "감정 동요", 4],
    ["ER", "ER-WD", "걱정과 주저", -4],
  ];
  const domainScores = new Map(
    domains.map((domain) => [domain.domainId, domain.score]),
  );

  return definitions.map(([domainId, facetId, label, offset]) => ({
    facetId,
    label,
    score: Math.max(0, Math.min(100, domainScores.get(domainId) + offset)),
    status: "valid",
  }));
}

function id(prefix, number) {
  return `${prefix}-0000-4000-8000-${String(number).padStart(12, "0")}`;
}
