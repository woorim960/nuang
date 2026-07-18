import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

const requiredFiles = [
  "docs/NUANG_MVP_MEASUREMENT_PRODUCT_REBASELINE.md",
  "docs/NUANG_PRODUCT_CANON.md",
  "docs/NUANG_CORE_MEASUREMENT_VALIDATION_PLAN.md",
  "docs/NUANG_FINAL_CODE_SEMANTIC_AUDIT.md",
  "docs/NUANG_M03_SE_TWO_FACET_SET_BALANCE_AUDIT.md",
  "docs/NUANG_M03_RO_TWO_FACET_MULTILAYER_SET_BALANCE_AUDIT.md",
  "docs/NUANG_M03_SM_EP_CANDIDATE_ITEM_BANK.md",
  "docs/NUANG_M03_SM_OS_CANDIDATE_ITEM_BANK.md",
  "docs/NUANG_M03_SM_RL_CANDIDATE_ITEM_BANK.md",
  "docs/NUANG_M03_SM_TWO_VS_THREE_FACET_SET_BALANCE_AUDIT.md",
  "docs/NUANG_M03_ER_IR_CANDIDATE_ITEM_BANK.md",
  "docs/NUANG_M03_ER_WD_CANDIDATE_ITEM_BANK.md",
  "docs/NUANG_M03_ER_TWO_FACET_SAFETY_AND_SET_BALANCE_AUDIT.md",
  "docs/NUANG_M03_RO_EC_CORE_REDUNDANCY_REPAIR.md",
  "docs/NUANG_M03_ALL_DOMAIN_INTEGRATED_SEAM_AND_METHOD_AUDIT.md",
  "docs/NUANG_M04_FULL_CORE_EXPERT_REVIEW_EXECUTION_KIT.md",
  "docs/NUANG_M04_REVIEW_INTAKE_AND_LOCK_SPEC.md",
  "docs/NUANG_M04_INTERNAL_AI_BLIND_CRITIQUE_REPORT.md",
  "docs/research/core-m04/reviewer/01_REVIEWER_BRIEF.md",
  "docs/research/core-m04/reviewer/02_BLIND_CONSTRUCT_CODEBOOK.md",
  "docs/research/core-m04/reviewer/03_STAGE1_STAGE2_RESPONSE_GUIDE.md",
  "docs/research/core-m04/internal/01_COORDINATOR_RUNBOOK.md",
  "docs/research/core-m04/internal/02_PREREGISTRATION_TEMPLATE.md",
  "docs/research/core-m04/internal/03_ADJUDICATION_GUIDE.md",
  "docs/research/core-m04/generated/internal/packet_manifest.json",
  "docs/research/core-m04/generated/internal/validation_report.json",
  "docs/research/core-m04/internal-critique/v0.1/README.md",
  "docs/research/core-m04/internal-critique/v0.1/analysis/analysis_summary.json",
  "docs/NUANG_ITEM_DESIGN_TO_UI_UX_RETURN_PLAN.md",
  "docs/NUANG_S03_CORE_ASSESSMENT_RUNNER_DESIGN_SPEC.md",
  "docs/NUANG_S03_R_V3_SCREEN_BRIEF.md",
  "docs/NUANG_S03_STATE_SUITE_V3_SCREEN_BRIEF.md",
  "docs/NUANG_S03_STATE_SUITE_V4_SCREEN_BRIEF.md",
  "docs/NUANG_S03_STATE_SUITE_V5_SCREEN_BRIEF.md",
  "docs/NUANG_S03_RECOVERY_STATE_SUITE_V1_SCREEN_BRIEF.md",
  "docs/NUANG_S04_R_QUICK_RESULT_REPORT_V1_SCREEN_BRIEF.md",
  "docs/NUANG_S04_R_QUICK_RESULT_REPORT_V2_SCREEN_BRIEF.md",
  "docs/NUANG_S04_R_QUICK_RESULT_REPORT_V3_SCREEN_BRIEF.md",
  "docs/NUANG_CODE_UNDERSTANDING_STRATEGY.md",
  "docs/NUANG_CODE_INTERPRETATION_DICTIONARY.md",
  "docs/NUANG_UX_GUARDRAILS.md",
  "docs/NUANG_ASSESSMENT_ARCHITECTURE.md",
  "docs/NUANG_DYNAMIC_TRAIT_EVIDENCE_MODEL.md",
  "docs/NUANG_FREE_TOPIC_ASSESSMENT_MAPPING_PROPOSAL.md",
  "docs/NUANG_FEED_MVP_INTERACTION_DESIGN.md",
  "docs/NUANG_STAGE_HARNESS.md",
  "docs/NUANG_MVP_SMOKE_CHECKLIST.md",
  "docs/NUANG_MVP_WORK_QUEUE.md",
  "docs/NUANG_MVP_100_STAGE_PLAN.md",
  "docs/PROFILE_VISIBILITY_AND_COMPARISON_POLICY.md",
  "docs/ACCOUNT_SHARE_API_RUNBOOK.md",
  "src/app/(tabs)/home/page.tsx",
  "src/app/(tabs)/assessments/page.tsx",
  "src/app/(tabs)/map/page.tsx",
  "src/app/(tabs)/together/page.tsx",
  "src/app/(tabs)/my/page.tsx",
  "src/app/share/[token]/page.tsx",
  "src/app/share/[token]/page.test.tsx",
  "src/lib/scoring/dynamic-trait-evidence.ts",
  "src/lib/scoring/dynamic-trait-evidence.test.ts",
  "src/features/assessment/free-topic-assessments.ts",
  "src/features/assessment/free-topic-assessments.test.ts",
  "src/features/assessment/free-topic-storage.ts",
  "src/features/nuang-code/nuang-code-dictionary.ts",
  "src/features/assessment/FreeTopicRunner.tsx",
  "src/features/assessment/FreeTopicResultView.tsx",
  "src/features/assessment/FreeTopicResultView.test.tsx",
  "src/features/account/MyTraitDetailView.tsx",
  "src/features/result/LocalResultView.tsx",
  "src/features/result/LocalResultView.test.tsx",
  "src/features/share/public-share-server.ts",
  "src/features/share/public-share-server.test.ts",
  "src/app/assessments/topics/[slug]/page.tsx",
  "src/app/assessments/topics/[slug]/result/[localResultId]/page.tsx",
  "src/app/api/free-topic-results/route.ts",
  "src/app/feed/page.tsx",
  "src/app/feed/page.test.tsx",
  "src/app/api/feed/route.ts",
  "src/features/feed/feed-contract.ts",
  "src/features/feed/feed-contract.test.ts",
  "src/features/feed/feed-write-contract.ts",
  "src/features/feed/feed-prompts.ts",
  "src/features/feed/server-writes.ts",
  "src/features/feed/server-read.ts",
  "src/features/feed/server-read.test.ts",
  "src/features/feed/FeedComposer.tsx",
  "src/features/feed/FeedComposer.test.tsx",
  "src/features/feed/FeedPollCard.tsx",
  "src/features/feed/feed-api.test.ts",
  "src/features/feed/feed-db-schema.test.ts",
  "src/features/feed/feed-seed.ts",
  "src/features/feed/feed-seed.test.ts",
  "src/app/feed/polls/[pollId]/stats/page.tsx",
  "src/app/feed/polls/[pollId]/stats/page.test.tsx",
  "src/app/feed/reports/[postId]/page.tsx",
  "src/app/feed/reports/[postId]/page.test.tsx",
  "src/features/moderation/moderation-queue-contract.ts",
  "src/features/moderation/safety-action-contract.ts",
  "src/features/public-profile/profile-image.ts",
  "src/features/public-profile/PublicProfileImageView.tsx",
  "src/features/public-profile/PublicProfileModal.tsx",
  "src/features/public-profile/public-profile-card-contract.ts",
  "src/features/public-profile/public-profile-snapshot-write-contract.ts",
  "src/features/together/server-public-comparisons.ts",
  "scripts/seed-comparison-demo.mjs",
  "scripts/check-m03-integrated-candidate-audit.mjs",
  "scripts/generate-core-expert-review-kit.mjs",
  "scripts/check-core-expert-review-intake.mjs",
  "scripts/manage-core-expert-review-intake.mjs",
  "scripts/analyze-core-expert-review.mjs",
  "src/research/core-expert-review-intake.test.ts",
  "supabase/migrations/202607090103_feed_foundation.sql",
  "supabase/migrations/202607090104_feed_seed_targets.sql",
  "supabase/migrations/202607090105_feed_api_grants.sql",
  "supabase/migrations/202607090107_unified_result_delete.sql",
  "supabase/migrations/202607100001_drop_public_profile_code.sql",
  "supabase/migrations/202607100002_free_topic_results.sql",
  "supabase/migrations/202607100003_feed_mvp_interactions.sql",
  "public/assets/assessment/nuang-loading-result-v1.webp",
  "public/assets/assessment/nuang-loading-mascot-v2.png",
];

for (const file of requiredFiles) {
  requireFile(file);
}

requireIncludes("docs/NUANG_PRODUCT_CANON.md", [
  "뉴앙은 검사가 중심인 성향 기반 SNS다",
  "하단 메뉴",
  "홈",
  "피드",
  "검사",
  "성향지도",
  "마이",
  "피드는 커뮤니티의 별도 병기 명칭이 아니다",
  "피드 MVP 상호작용 설계의 원본은 `docs/NUANG_FEED_MVP_INTERACTION_DESIGN.md`다",
  "`함께` 탭은 제거한다",
  "카카오톡, 링크 복사, 다른 앱으로는 모두 `내 결과 리포트`를 다른 사람이 열 수 있는 동일한 30일 자동 만료 공개 리포트 URL을 사용한다",
  "피드에 공유된 리포트 preview와 연결은 일반 링크 복사 공유와 수명이 다르다",
  "1:1 비교는 링크를 직접 입력해서 시작하지 않는다",
  "상대 프로필 팝업",
  "프로필 이미지는 사용자가 설정한 공개 프로필 이미지다",
  "고객 공개 MVP의 뉴앙 코드 작업 범례는 `E/I · R/N · G/A · K/M · C/Q`다",
  "legacy runtime은 내부 UX·회귀 테스트에는 사용할 수 있지만 고객에게 검증된 대표 성향처럼 공개하지 않는다",
  "공개 코드는 사용자 경험에서 전면 폐기한다",
  "공개 코드 없는 대안 구조",
  "구현 전 승인 계약",
  "사용자에게 결과는 저장 위치와 무관하게 하나의 `내 결과`다",
  "정밀 코어는 MVP뿐 아니라 앞으로도 무료로 운영한다",
  "검사 제품 구조의 원본은 `docs/NUANG_ASSESSMENT_ARCHITECTURE.md`다",
  "누적 검사 기반 성향 갱신 알고리즘의 원본은 `docs/NUANG_DYNAMIC_TRAIT_EVIDENCE_MODEL.md`다",
  "결제 여부는 성향 정확도 가중치가 아니다",
  "사용자 화면에 노출되는 영어 알파벳 표현은 뉴앙 코드뿐이다",
  "구현된 legacy v0.1의 감사 원본은 `docs/NUANG_CODE_INTERPRETATION_DICTIONARY.md`다",
]);

requireIncludes("docs/NUANG_CODE_UNDERSTANDING_STRATEGY.md", [
  "사용자 화면에서는 이 코드를 `뉴앙 코드`라고 부른다",
  "사용자-facing 표준어",
  "`코드 지도`",
  "`코드 자리`",
  "`세부 신호`",
  "사용자 화면에서 `5축`, `10축` 표현을 쓰지 않는다",
  "`FOAMT`는 현재 32개 뉴앙 코드에 포함되지 않는 잘못된 예시",
  "사용자-facing 이름은 `모티프의 이름` 형태를 기본으로 한다",
  "피드 MVP 핵심",
  "`뉴앙 코드별 통계 보기`",
  "MVP의 핵심 비교 리포트는 서로의 현재 뉴앙 코드를 기준으로 만든다",
  "두 사람이 모두 같은 검사를 수행했고",
  "옵션 B",
  "비교 리포트는 점수 차이표가 아니라 코드 조합 기반 관계 리듬 리포트로 재설계한다",
  "Stage 2. 뉴앙 코드 해석 사전 설계",
]);

requireIncludes("docs/NUANG_CODE_INTERPRETATION_DICTIONARY.md", [
  "V0_1_IMPLEMENTED_CODE_LANGUAGE_REVIEW_REQUIRED",
  "현재 작업 범례는 `E/I · R/N · G/A · K/M · C/Q`다",
  "전체 측정이 승인되기 전까지 코드·DB·공유 URL은 변경하지 않는다",
  "사용자 화면에서 `5축`, `10축` 표현을 쓰지 않는다",
  "에너지가 시작되는 방식",
  "마음이 흔들릴 때의 반응",
  "일상을 굴리는 방식",
  "관계를 맞추는 방식",
  "생각이 넓어지는 방식",
  "두 모습이 비슷한 자리",
  "첫 두 자리 조합은 motif를 정한다",
  "마지막 세 자리는 코드 이름의 역할명을 정한다",
  "사용자-facing 이름은 `모티프의 이름` 형태를 기본으로 한다",
  "불꽃의 온기 탐험가",
  "물결의 새길 개척가",
  "숲의 편안한 조율가",
  "`FOAMT`는 유효 코드가 아니다",
  "MVP 비교 리포트는 서로의 현재 뉴앙 코드만으로 핵심 비교를 만든다",
  "직접 응답",
  "궁합 점수",
  "뉴앙 코드 비교",
  "MVP에서는 상세검사나 유료검사 기반 비교를 열지 않는다",
]);

requireIncludes("docs/NUANG_MVP_MEASUREMENT_PRODUCT_REBASELINE.md", [
  "MVP_REBASELINE_V1_APPLIED",
  "NO_GO_LEGACY_MEASUREMENT",
  "`E/I · R/N · G/A · K/M · C/Q`",
  "상위 단계 `RBL-01`은 완료됐다",
  "150개 연구 후보는 HIGH/LOW 75/75, 주력/탐색 100/50",
  "M04 전 코어 전문가 검토 키트는 생성·자동 검증을 마쳤고",
  "Stage 1·2 1,800행 dry-run",
  "실제 사람 전문가의 독립 검토 응답과 판정은 아직 시작 전이다",
  "사용자 승인 A안에 따라 G/A는 RO-EC의",
  "본인 전용 상세 신호로 `DET-RO-RN`",
  "공개 코어는 일상적인 감정 동요와 걱정·주저만 다루고",
  "M03 전 코어 후보 은행 완성",
  "전문가 검토·인지 인터뷰",
  "통합 blind review와 실제 모바일 runner 검증",
  "M06·M07 최소 정량 파일럿",
  "코드·DB versioned migration",
  "승인 UI production binding",
  "RBL-01이 끝나면 UI/UX 작업으로 즉시 복귀한다",
  "제한 베타 GO/NO-GO",
  "measurement_release_id",
]);

requireIncludes("docs/NUANG_M04_FULL_CORE_EXPERT_REVIEW_EXECUTION_KIT.md", [
  "EXECUTION_KIT_V0_1_INTERNAL_REVIEW",
  "NOT_AUTHORIZED_FOR_SCORING_RELEASE_OR_DB_MIGRATION",
  "m04-core-expert-kit.v0.1",
  "후보 150문항",
  "50문항 × 3회 Stage 1",
  "Stage 2",
  "운영 seed·DB·코드 발급은 M06~M09와 release 승인 뒤에만 변경한다",
]);

requireIncludes("docs/NUANG_M04_REVIEW_INTAKE_AND_LOCK_SPEC.md", [
  "M04_INTAKE_CONTRACT_V0_1",
  "NO_VALIDITY_CLAIM_WITHOUT_INDEPENDENT_RESPONSES",
  "stage1_response_sha256",
  "stage2_response_sha256",
  "같은 검토자의 세 Stage 1 응답",
  "운영 문항·DB로 이관하지 않는다",
]);

requireIncludes("docs/NUANG_M04_INTERNAL_AI_BLIND_CRITIQUE_REPORT.md", [
  "INTERNAL_AI_CRITIQUE_V0_1_COMPLETE",
  "NOT_EXTERNAL_VALIDATION · NOT_M04_COMPLETE · NOT_FOR_SCORING_OR_RELEASE",
  "Stage 1 제출",
  "900 rows",
  "총 단계별 평정",
  "1,800 rows",
  "PASS_TO_COGNITIVE",
  "88",
  "HOLD_FOR_RISK_REVIEW",
  "RO-EC direction protocol 결함",
  "R01·R02",
  "71/72",
  "실제 외부 M04",
  "NOT_STARTED",
  "운영 점수·DB·UI 이관",
  "BLOCKED",
]);

requireIncludes(
  "docs/research/core-m04/internal-critique/v0.1/analysis/analysis_summary.json",
  [
    '"analysis_status": "INCOMPLETE_INTERNAL_PREVIEW_NOT_FOR_ADJUDICATION"',
    '"stage1_response_rows": 900',
    '"stage2_response_rows": 900',
    '"total_stage_response_rows": 1800',
    '"fatal_risk_item_count": 4',
    '"seam_flag_item_count": 6',
  ],
);

requireIncludes(
  "docs/research/core-m04/generated/internal/validation_report.json",
  [
    '"status": "PASS"',
    '"candidate_count": 150',
    '"pair_count": 75',
    '"reviewer_count": 8',
  ],
);

requireIncludes("docs/NUANG_M03_SE_TWO_FACET_SET_BALANCE_AUDIT.md", [
  "PASS_FOR_FULL_CORE_M03_CONTINUATION",
  "RBL-01A_COMPLETE",
  "SE-AI의 HIGH 6개는 모두 `먼저`",
  "LOW 6개는 모두 `뒤·때까지`",
  "SERE-C11·C12 ↔ SEAI-C09·C10",
  "집단·말하기 상황 접근 균형",
  "PASS_TO_RO_CANDIDATE_DESIGN",
  "RBL-01B RO 두 facet 후보 은행과 set 균형 감사",
]);

requireIncludes("docs/NUANG_M03_RO_EC_CANDIDATE_ITEM_BANK.md", [
  "SUPERSEDED_BY_PROCESS_PAIR_V0_2",
  "m03-ro-ec-candidates.v0.1",
  "6개 상황 버킷, 총 12문항",
  "공감 능력",
  "DIFFICULT_STORY",
  "VISIBLE_STRAIN",
  "PROBLEM_AND_FEELING",
  "LESS_CLOSE_PERSON",
  "NO_EXPLICIT_REQUEST",
  "AFTER_CONVERSATION",
  "HIGH=좋은 사람",
  "NUANG_M03_RO_EC_PROCESS_PAIR_CANDIDATE_BANK.md",
]);

requireIncludes("docs/NUANG_MULTILAYER_TRAIT_RESPONSE_PROFILE_MODEL.md", [
  "OWNER_COPY_AND_CODE_DIRECTION_APPROVED_V2",
  "multilayer-trait-response-profile.v0.2",
  "REPORTED_FIRST_ORIENTATION",
  "ENACTED_RESPONSE",
  "SELF_REPORTED_RATIONALE",
  "GOAL_ORIENTATION_ATTENTIVE_RESPONSE",
  "유효 process pair가 최소 3개",
  "처음 드는 생각",
  "실제 나타나는 반응",
  "내가 직접 고른 이유",
  "여섯 번째 성향 축이나 새로운 코드 글자가 아니다",
]);

requireIncludes("docs/NUANG_M03_RO_EC_PROCESS_PAIR_CANDIDATE_BANK.md", [
  "OWNER_APPROVED_G_A_CORE_REDUNDANCY_V5",
  "m03-ro-ec-process-pairs.v0.5",
  "처음 드는 생각 `REPORTED_FIRST_ORIENTATION`",
  "실제 나타나는 반응 `ENACTED_RESPONSE`",
  "원인과 해결할 부분이 먼저 눈에 들어온다",
  "해결 방법을 말하기 전에 상대가 어떤 마음인지 먼저 확인한다",
  "GOAL_ORIENTATION_ATTENTIVE_RESPONSE",
  "NON_SCORING_CONTEXT",
  "최소 3개 pair·2개 상황 반복",
  "ROEC-R01-G",
  "ROEC-R02-A",
  "ROEC-R03-A",
  "대표 G/A 주점수 6G·6A 균형",
]);

requireIncludes("docs/NUANG_M03_RO_RN_PROCESS_PAIR_CANDIDATE_BANK.md", [
  "SET_AUDITED_RESEARCH_ONLY_REQUIRES_REVISION",
  "m03-ro-rn-process-pairs.v0.3",
  "처음 드는 생각 `REPORTED_FIRST_ORIENTATION`",
  "실제 나타나는 반응 `ENACTED_RESPONSE`",
  "결정을 바꿀 다른 설득 방법이 떠오른다",
  "그 선택을 그대로 둔다",
  "PRESSURE_ORIENTATION_RESPECTFUL_RESPONSE",
  "갈등 회피·포기·역할 책임",
  "6개 HIGH·6개 LOW 균형",
  "RO 두 facet·다층 24문항 세트 감사",
  "NO_GO_REBASELINE_REQUIRED",
]);

requireIncludes("docs/NUANG_M03_RO_TWO_FACET_MULTILAYER_SET_BALANCE_AUDIT.md", [
  "OWNER_APPROVED_OPTION_A_CORE_PASS_RN_SEPARATE",
  "PASS_TO_SM_CANDIDATE_DESIGN_WITH_RO_RN_SEPARATE_TRACK",
  "RO-EC와 RO-RN의 후보 은행",
  "24문항을 하나의 G/A 점수로 단순 합산",
  "NO_GO_SAME_SYMBOL_DIFFERENT_SCOPE",
  "RESEARCH_VALUE_PRESENT_PUBLIC_IDENTITY_NO_GO",
  "A안 — 승인: 대표 G/A를 가치중립적인 관심 방향으로 좁힌다",
  "B안 — 미채택: 두 facet을 대표 코드에 유지하되 코드 의미와 흐름 표기를 다시 만든다",
  "C안 — 기각: 현재 G/A와 합산을 그대로 유지한다",
  "PASS_TO_CONTINUE_SEPARATELY",
  "대표 G/A용 `REPORTED_FIRST_ORIENTATION`",
  "3G·3A",
  "DET-RO-RN",
  "SELF_ONLY",
]);

requireIncludes("docs/NUANG_M03_SM_EP_CANDIDATE_ITEM_BANK.md", [
  "OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW",
  "m03-sm-ep-candidates.v0.1",
  "6개 상황 버킷, 총 12문항",
  "EARLY_START",
  "RETURN_AFTER_INTERRUPTION",
  "LOW_IMMEDIATE_REWARD",
  "MULTI_DAY_CONTINUATION",
  "FEASIBLE_FINISHING",
  "RESTART_AFTER_GAP",
  "HIGH → K 증거",
  "LOW → M 증거",
  "K/M 발급",
]);

requireIncludes("docs/NUANG_M03_SM_OS_CANDIDATE_ITEM_BANK.md", [
  "OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW",
  "m03-sm-os-candidates.v0.1",
  "6개 상황 버킷, 총 12문항",
  "REPEATED_ITEM_PLACE",
  "MULTIPLE_TASKS",
  "REPEATED_SEQUENCE",
  "NEAR_FUTURE_TIMING",
  "RETRIEVABLE_STORAGE",
  "ORDERED_CHECK",
  "HIGH → K 증거",
  "LOW → M 증거",
  "K/M 발급",
]);

requireIncludes("docs/NUANG_M03_SM_RL_CANDIDATE_ITEM_BANK.md", [
  "OWNER_APPROVED_EXPLORATORY_FOR_EXPERT_AND_COGNITIVE_REVIEW",
  "m03-sm-rl-candidates.v0.1",
  "6개 상황 버킷, 총 12문항",
  "다른 사람과 연결된 맡은 일",
  "M을 무책임으로 만들지 않기",
  "본인 전용 상세 신호",
  "3-facet 주 코드 포함",
  "공개·공유·비교 노출",
]);

requireIncludes("docs/NUANG_M03_SM_TWO_VS_THREE_FACET_SET_BALANCE_AUDIT.md", [
  "OWNER_APPROVED_FOR_ER_CANDIDATE_DESIGN",
  "m03-sm-set-audit.v0.1",
  "SM-M2",
  "SM-M3",
  "SM-M2+RL-D",
  "PASS_FOR_EXPERT_AND_COGNITIVE_REVIEW_WITH_RL_PUBLIC_CODE_HOLD",
  "공개 K/M의 의미 기준선",
  "EP_PLUS_OS",
  "PUBLIC_CODE_HOLD",
  "RBL-01D — ER-IR·ER-WD 후보 은행과 불편 정서 안전 감사",
]);

requireIncludes("docs/NUANG_M03_ER_IR_CANDIDATE_ITEM_BANK.md", [
  "OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW",
  "m03-er-ir-candidates.v0.1",
  "6개 상황 버킷, 총 12문항",
  "MINOR_SETBACK",
  "EVERYDAY_DISAGREEMENT",
  "UNEXPECTED_SMALL_PROBLEM",
  "CORRECTIVE_FEEDBACK",
  "REPEATED_FRICTION",
  "EMOTION_CARRYOVER",
  "HIGH → Q 증거",
  "LOW → C 증거",
  "C/Q 발급",
]);

requireIncludes("docs/NUANG_M03_ER_WD_CANDIDATE_ITEM_BANK.md", [
  "OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW",
  "m03-er-wd-candidates.v0.1",
  "6개 상황 버킷, 총 12문항",
  "UNCERTAIN_WAIT",
  "DELAYED_RESPONSE",
  "ANTICIPATED_EVALUATION",
  "UNCERTAIN_CHOICE",
  "AFTER_SMALL_SETBACK",
  "MANAGEABLE_LOAD",
  "HIGH → Q 증거",
  "LOW → C 증거",
  "C/Q 발급",
]);

requireIncludes("docs/NUANG_M03_ER_TWO_FACET_SAFETY_AND_SET_BALANCE_AUDIT.md", [
  "OWNER_APPROVED_FOR_INTEGRATED_SEAM_AUDIT",
  "m03-er-safety-set-audit.v0.1",
  "PASS_FOR_EXPERT_AND_COGNITIVE_REVIEW_WITH_CLINICAL_AND_STATE_FIREWALL",
  "코어가 묻지 않는 위험을 코어 점수로 탐지하거나 부재를 보장할 수 없다",
  "최근 2주 동안은 평소와 비교해 어땠나요?",
  "임상·위기 선별 방화벽",
  "Q→C는 항상 `VALIDATION_BLOCKED`",
  "BLOCKED_SEPARATE_RESEARCH_REQUIRED",
  "RBL-01E — SE·OE·RO·SM·ER 전체 seam·상황·HIGH/LOW·문구 효과 통합 감사",
]);

requireIncludes(
  "docs/NUANG_M03_ALL_DOMAIN_INTEGRATED_SEAM_AND_METHOD_AUDIT.md",
  [
    "OWNER_APPROVED_ITEM_DESIGN_GATE_COMPLETE",
    "PASS_M03_INTEGRATED_INVENTORY",
    "RBL-01E-R1",
    "처음 드는 생각",
    "3G·3A",
    "실제 나타나는 반응",
    "DOMAIN_COVERAGE_PACKET",
    "SEAM_PACKET",
    "S03-R 실제 모바일 runner",
    "ITEM_DESIGN_GATE_COMPLETE",
  ],
);

requireIncludes("docs/NUANG_M03_RO_EC_CORE_REDUNDANCY_REPAIR.md", [
  "OWNER_APPROVED_MERGED_INTO_RO_EC_V0_5",
  "RBL-01E-R1",
  "ROEC-R01-G",
  "ROEC-R01-A",
  "ROEC-R02-G",
  "ROEC-R02-A",
  "ROEC-R03-G",
  "ROEC-R03-A",
  "REPORTED_FIRST_ORIENTATION",
  "CORE_TRAIT_EVIDENCE",
  "RO-EC 공식 후보 은행 v0.5",
]);

requireIncludes("docs/NUANG_M01_RO_CONSTRUCT_DEFINITION.md", [
  "OWNER_APPROVED_REBASELINED_V2",
  "G_A_OWNER_APPROVED_RO_EC_ONLY",
  "m01-ro-relational-attention.v2.0",
  "관계에서 먼저 보는 것",
  "G = 원인·해결이 먼저 보이는 편",
  "A = 상대 마음이 먼저 보이는 편",
  "RO-RN 선택·존엄 존중",
  "G/A 점수·글자·선명도에 합산하지 않는다",
  "본인 전용은 사용자에게 숨긴다는 뜻이 아니라",
]);

requireIncludes("docs/NUANG_FINAL_CODE_SEMANTIC_AUDIT.md", [
  "OWNER_APPROVED_DESIGN_RO_REBASELINED_V2",
  "관계에서 먼저 보는 것",
  "원인·해결이 먼저 보임 / 상대 마음이 먼저 보임",
  "RO-RN 선택·존엄 존중은 G/A에 합산하지 않고 본인 전용 상세 신호",
]);

requireIncludes("docs/NUANG_RESEARCH_REFERENCE_AND_ADAPTATION_LEDGER.md", [
  "EVIDENCE_LEDGER_V2_RO_REBASELINED",
  "Big Five 다섯 영역을 일대일로 복제하지 않는다",
  "선택·존엄 존중은 G/A에 합산하지 않고 본인 전용 상세 신호",
]);

requireIncludes("docs/NUANG_CODE_TRUST_PAGE_CONTENT_SPEC.md", [
  "G/A는 관계에서 원인·해결과 상대 마음 중 무엇이 먼저 보이는지만 나타내고",
  "선택과 경계를 존중하는 반응은 본인에게 보여주는 별도 상세 신호",
]);

requireIncludes("docs/NUANG_DETAIL_REACTION_CODE_COMMUNICATION_SPEC.md", [
  "OWNER_DIRECTION_APPROVED_RO_ALIGNED_V3",
  "detail-reaction-code-communication.v0.3",
  "처음 드는 생각 G → 실제 나타나는 반응 A",
  "ERGKC · 관계 반응 G → A",
  "G → G",
  "G → A",
  "A → G",
  "A → A",
  "마음과 해결이 함께 있는 상황에서",
  "RO-RN",
  "빠른 코어에서는 관계 반응 흐름을 발급하지 않는다",
  "REPORTED_FIRST_ORIENTATION",
  "ENACTED_RESPONSE",
]);

requireIncludes("docs/NUANG_ALL_CODE_DETAIL_PROFILE_ARCHITECTURE.md", [
  "OWNER_DIRECTION_APPROVED_RO_ALIGNED_V2",
  "all-code-detail-profile-architecture.v0.2",
  "FACET_MAP",
  "PROCESS_FLOW",
  "PRIVATE_DETAIL_SIGNAL",
  "SELF_ONLY",
  "contributesToMainCode: false",
  "FACET_MAP_ONLY",
  "PROCESS_FLOW_PRIMARY_CANDIDATE",
  "PROCESS_FLOW_RESEARCH_CANDIDATE",
  "PRIVATE_PROCESS_FLOW_RESEARCH_CANDIDATE",
  "E/I — 세부 성향 지도만 제공",
  "R/N — 3개 세부 성향 지도를 제공",
  "G/A — 같은 관계 주의 방향에서 대표 글자와 반응 흐름을 검증",
  "K/M — 세부 성향 지도 우선, 실행 흐름은 후속 후보",
  "C/Q — 세부 성향 지도 필수, 감정 과정은 기본 비공개 후보",
  "화살표 없는 `GA`, `QC`, `KM`은 정식 과정 표기로 사용하지 않는다",
  "G → A 관계 반응 흐름",
  "Q → C 마음 반응 흐름",
  "K → M 의도·실행 흐름",
  "빠른 코어: 대표 예비 코드와 짧은 요약만 제공",
  "사용자가 고른 이유",
]);

requireIncludes("docs/NUANG_ITEM_DESIGN_TO_UI_UX_RETURN_PLAN.md", [
  "ITEM_DESIGN_GATE_COMPLETE_S03_R_NEXT",
  "ITEM_DESIGN_GATE_COMPLETE",
  "원래 중단된 S03 검사 진행 화면으로 즉시 복귀",
  "M05가 별도 종이 문항이 아니라 실제 모바일 runner를 사용한다",
  "S03-R",
  "S04-R",
  "S05-R",
  "S06-R",
  "S07-R",
  "S08-R",
  "S01-R",
  "빠른·정밀 문항 수는 UI에 하드코딩하지 않고",
  "measurement_release_id",
]);

requireIncludes("docs/NUANG_S03_CORE_ASSESSMENT_RUNNER_DESIGN_SPEC.md", [
  "ITEM_DESIGN_GATE_COMPLETE",
  "S03_R_RECOVERY_SUITE_V1_OWNER_REVIEW",
  "상황 라벨(contextLabel)",
  "이 상황은 답하기 어려워요",
  "N개 응답 · 자동 저장됨",
  "legacy 응답 카피",
  "390px v2",
]);

requireIncludes("docs/NUANG_S03_STATE_SUITE_V3_SCREEN_BRIEF.md", [
  "DRAFT_STATE_SUITE_V3_OWNER_REVIEW",
  "UIX-01_LOADING_SAVE_ERROR_LAST_PREPARING_REVIEW",
  "응답을 바로 저장하지 못했어요",
  "이 기기에 임시 보관했어요",
  "응답을 안전하게 보관하지 못했어요",
  "completion_request_id",
  "무한 spinner",
  "결과가 준비되면 바로 보여드릴게요",
]);

requireIncludes("docs/NUANG_S03_STATE_SUITE_V4_SCREEN_BRIEF.md", [
  "REVISED_STATE_SUITE_V4_OWNER_REVIEW",
  "UIX-01_LOADING_ART_MOTION_ALIGNMENT_V4_REVIEW",
  "question_load_status",
  "시간 기반 문구 전환은 시뮬레이션 전용",
  "곧 결과를 보여드릴게요",
  "nuang-loading-result-v1.webp",
  "우측 상단 이중 타원",
  "inline-flex",
  "지금까지의 답을 종합해",
  "간단한 결과를 만들고 있어요.",
  "prefers-reduced-motion",
]);

requireIncludes("docs/NUANG_S03_STATE_SUITE_V5_SCREEN_BRIEF.md", [
  "REVISED_STATE_SUITE_V5_OWNER_REVIEW",
  "UIX-01_LOADING_MASCOT_AND_LAST_SIMPLIFICATION_V5_REVIEW",
  "답하기 편한 화면을 준비하고 있어요.",
  "곧 첫 질문을 보여드릴게요",
  "본문의 `마지막 질문` 태그를 제거한다",
  "nuang-loading-mascot-v2.png",
  "다섯 성향 신호",
  "prefers-reduced-motion",
]);

requireIncludes("docs/NUANG_S03_RECOVERY_STATE_SUITE_V1_SCREEN_BRIEF.md", [
  "RECOVERY_STATE_SUITE_V1_OWNER_APPROVED",
  "UIX-01_RECOVERY_DELAY_FAILURE_RETRY_REVIEW",
  "질문 준비 지연",
  "응답을 보관하지 못했어요",
  "결과 생성 지연",
  "다시 만들기",
  "진행 중 결과",
  "result_generation_status",
  "completion_request_id",
  "결과 생성 실패에서는 motion이 멈춰도",
]);

requireIncludes("docs/NUANG_S04_R_QUICK_RESULT_REPORT_V1_SCREEN_BRIEF.md", [
  "S04_R_QUICK_RESULT_V1_SUPERSEDED_BY_V2",
  "UIX-02_QUICK_RESULT_FIRST_READ_REVIEW",
  "빠른 결과·예비 코드",
  "ERGKC",
  "두 방향이 비슷하게 나타났어요",
  "아직 코드로 묶기 어려워요",
  "정밀 검사로 더 알아보기",
  "홈으로 돌아가기",
  "PROVISIONAL_AVAILABLE · INSUFFICIENT_EVIDENCE",
  "CLEAR · NEAR_BALANCE · INSUFFICIENT",
  "S05-R 정밀 검사 소개",
]);

requireIncludes("docs/NUANG_S04_R_QUICK_RESULT_REPORT_V2_SCREEN_BRIEF.md", [
  "S04_R_QUICK_RESULT_V2_SUPERSEDED_BY_V3",
  "UIX-02_QUICK_RESULT_SHARE_AND_COPY_REVIEW",
  "상단 왼쪽 `홈`을 제거",
  "~하는 편이에요",
  "조금 더 가까웠지만 M과 차이가 크지 않아요",
  "카카오톡으로 보내기",
  "다른 앱으로",
  "피드에 공유",
  "pending_share_method",
  "INSUFFICIENT_EVIDENCE",
  "S05-R 정밀 검사 소개",
]);

requireIncludes("docs/NUANG_S04_R_QUICK_RESULT_REPORT_V3_SCREEN_BRIEF.md", [
  "S04_R_QUICK_RESULT_V3_OWNER_REVIEW",
  "UIX-02_QUICK_RESULT_MOTION_SPACING_REVIEW",
  "실제 `.s04-app` surface와 정확히 맞춘다",
  "왜 예비 결과인가요?",
  "aria-expanded",
  "backdrop은 200ms fade",
  "정밀 검사에서 더 또렷하게",
  "홈으로 돌아가기",
  "INSUFFICIENT_EVIDENCE",
  "S05-R 정밀 검사 소개 화면",
]);

requireIncludes("docs/NUANG_S03_R_V3_SCREEN_BRIEF.md", [
  "REVISED_390_MOTION_LAYOUT_V2_OWNER_REVIEW",
  "UIX-01_NON_REFLOW_UNSURE_AND_MOTION_REVIEW",
  "판단 어려움의 non-reflow 원칙",
  "운영체제 기본 이모지는 사용하지 않는다",
  "이럴 때 내 모습은?",
  "이 상황은 답하기 어려워요",
  "비슷한 경험이 거의 없어요",
  "N개 응답 · 자동 저장됨",
  "44px 이전 icon",
  "Foundation theme token",
]);

requireIncludes("docs/PROFILE_VISIBILITY_AND_COMPARISON_POLICY.md", [
  "RO-RN 선택·경계 존중 상세 신호",
  "본인 전용",
  "RO-RN 본인 전용 상세 신호",
  "공개 프로필·피드·공유·비교에서 기본 제외",
]);

requireIncludes("docs/NUANG_FEED_MVP_INTERACTION_DESIGN.md", [
  "구현 전 승인 요청 문서",
  "글",
  "오늘의 질문",
  "밸런스 게임",
  "`리포트 공유`는 피드 composer 선택지로 노출하지 않는다",
  "피드 작성 형식을 `글`, `오늘의 질문`, `밸런스 게임` 세 가지로 둔다",
  "뉴앙 코드별 통계 보기",
  "source: `balance_game`",
  "source: `report_share`",
  "feed.feed_poll",
  "feed.feed_poll_option",
  "feed.feed_poll_vote",
  "응답 수가 1명 이상이면",
  "전체 투표 수가 2명 이상이면",
  "누가 투표했는지 알 수 없다",
  "피드에 공유된 리포트는 30일 자동 만료를 적용하지 않는다",
  "직접 응답",
  "원점수",
  "202607100003_feed_mvp_interactions.sql",
  "F-001. Feed MVP contract 확장",
  "승인 요청",
]);

requireIncludes("docs/NUANG_MVP_SMOKE_CHECKLIST.md", [
  "npm run qa:mvp",
  "글, 오늘의 질문, 밸런스 게임",
  "리포트 공유는 피드 작성기 선택지에 없다",
  "뉴앙 코드별 통계 보기",
  "1명 이상 투표한 코드는 비율을 보여준다",
  "공유 주소 복사",
  "자동 복사가 실패해도 생성된 공유 주소를 화면에 보여주고 수동 복사를 안내한다",
  "현재 뉴앙 코드 사전의 코드 이름을 우선 사용한다",
  "피드에 공유",
  "나와 비교하기",
  "직접 응답, 원점수, 민감 항목",
  "공개 코드",
  "계정 결과",
  "로컬 결과",
  "5축",
  "10축",
  "GO / NO-GO",
]);

requireIncludes("docs/NUANG_ASSESSMENT_ARCHITECTURE.md", [
  "뉴앙은 검사가 중심인 성향 기반 SNS다",
  "정밀 코어는 서비스의 기본권처럼 항상 무료여야 한다",
  "무료 주제 검사",
  "승인된 성향 증거가 충분히 쌓이면 현재 대표 코드를 갱신할 수 있다",
  "상세검사는 지금 바로 MVP 핵심 기능으로 열지 않는다",
  "MVP에서는 상세검사나 유료검사 기반 1:1 비교를 열지 않는다",
  "두 사람이 모두 같은 검사를 수행한 경우에만 비교한다",
  "그룹 검사",
  "자살, 자해, 우울, ADHD, 중독, 트라우마, 약물, 폭력 등은 재미형 검사로 열지 않는다",
]);

requireIncludes("docs/NUANG_DYNAMIC_TRAIT_EVIDENCE_MODEL.md", [
  "대표 성향 코드는 고정된 평생 유형이 아니라",
  "Σ(검사 관찰 점수 × 유효 가중치)",
  "결제 여부",
  "항상 1.0",
  "대표 코드 변경 조건",
  "v0.1 기본 가중치",
  "정밀 코어 | 1.0",
  "무료 주제 검사 | 0.35",
  "v0.1 순수 채점 엔진은 승인 후 구현했다",
  "작은 변화로 코드가 계속 왕복하지 않도록",
  "실제 앱 화면, DB 저장, 공개 프로필, 1:1 비교에 연결하기 전에는 아래 항목을 다시 사용자에게 승인받는다",
]);

requireIncludes("docs/NUANG_FREE_TOPIC_ASSESSMENT_MAPPING_PROPOSAL.md", [
  "승인·구현 상태",
  "무료 주제 검사는 기본적으로 `free_topic` source weight 0.35를 사용한다",
  "src/features/assessment/free-topic-assessments.ts",
  "코드 반영 등급",
  "A등급 무료 주제 검사는 `free_topic` source weight 0.35로 동적 성향 증거에 반영한다",
  "무료 주제 검사 신호는 v0.1에서 1:1 비교에 넣지 않는다",
  "민감/치료/위기 주제는 검사로 열지 않고 도움 연결로만 처리한다",
]);

requireIncludes("src/lib/scoring/dynamic-trait-evidence.ts", [
  "dynamic-trait-evidence.v0.1",
  "quick_core: 0.2",
  "full_core: 1",
  "free_topic: 0.35",
  "odd_lab: 0.1",
  "help: 0",
  "group: 0",
  "minCodeChangeWeight: 1.2",
  "minOpposingEvidenceCountForCodeChange: 2",
]);

requireIncludes("src/features/assessment/free-topic-assessments.ts", [
  "freeTopicSourceWeight",
  "buildFreeTopicResultReport",
  "getFreeTopicTargetDisplay",
  "openFreeTopicSlugs",
  "conversation-temperature",
  "comfort-style",
  "cafe-seat-style",
  "comparisonUse: false",
  "sourceWeight: freeTopicSourceWeight",
  'sourceKind: "free_topic"',
  "forbiddenFreeTopicKeywords",
  "상대 마음 살피기",
  "먼저 말 꺼내기",
]);

requireIncludes("src/features/nuang-code/nuang-code-dictionary.ts", [
  "nuang-code-dictionary.v0.1",
  "에너지가 시작되는 방식",
  "마음이 흔들릴 때의 반응",
  "일상을 굴리는 방식",
  "관계를 맞추는 방식",
  "생각이 넓어지는 방식",
  "불꽃의 온기 탐험가",
  "물결의 새길 개척가",
  "숲의 편안한 조율가",
  "isValidNuangCode",
  "getBoundaryCopy",
]);

requireIncludes("src/features/assessment/FreeTopicResultView.test.tsx", [
  "renders a professional user-facing report without internal trait keys",
  "shares a free topic report to the feed without exposing raw answers",
  "상대 마음 살피기",
  "기준과 선택 존중",
  "먼저 말 꺼내기",
  'source: "free_text"',
  'not.toContain("RO-EC")',
  'not.toContain("observations")',
]);

requireIncludes("src/features/assessment/free-topic-storage.ts", [
  "localStorage",
  "loadFreeTopicResultLocalFirst",
  "syncQueuedFreeTopicResults",
  "listFreeTopicResultsLocalFirst",
  "/api/free-topic-results",
  "localResultId",
  "network_unavailable",
]);

requireIncludes("src/features/feed/feed-prompts.ts", [
  "dailyQuestionTemplates",
  "balanceGameTemplates",
  "오늘 저녁 시간은 누구와 함께 보내시나요?",
  "나 혼자 여행 간다면?",
  "getDefaultBalanceGameTemplate",
]);

requireIncludes("src/features/feed/feed-contract.ts", [
  '"balance_game"',
  '"report_share"',
  '"vote_poll"',
  "pollOptionKey",
]);

requireIncludes("src/features/feed/FeedComposer.tsx", [
  'label: "글"',
  "오늘의 질문",
  "밸런스 게임",
  'router.push(`/login?next=${encodeURIComponent("/feed")}`)',
  'source: "balance_game"',
]);

requireExcludes("src/features/feed/FeedComposer.tsx", [
  "일반 글",
  'mode: "report_share"',
  "리포트 화면에서 피드 공유",
]);

requireIncludes("src/features/feed/FeedPollCard.tsx", [
  "뉴앙 코드별 통계 보기",
  "2명 이상 모이면 통계가 열려요",
  "vote_poll",
]);

requireIncludes("src/features/result/LocalResultView.tsx", [
  "공유 주소 복사",
  "피드에 공유",
  "copyShareUrlToClipboard",
  "clipboard_timeout",
  "공유 주소가 준비됐어요. 위 주소를 길게 눌러 복사할 수 있어요.",
  'source: "report_share"',
  'type: "result_summary"',
]);

requireIncludes("src/features/share/public-share-server.ts", [
  "readPublicShareToken",
  "getNuangProfileName(profileCode)",
  'stringOrFallback(shareSummary.profileName, "공유 결과")',
  "shareTokenPepper",
  'status === "revoked"',
  'status === "expired"',
]);

requireIncludes("src/features/share/public-share-server.test.ts", [
  "uses the current Nuang code name over legacy stored profile names",
  'profileCode: "SVODE"',
  'profileName: "물결 새길 개척가"',
  'profileName).toBe("물결의 새길 개척가")',
]);

requireIncludes("src/features/result/LocalResultView.test.tsx", [
  "shows the generated share address when clipboard copy is blocked",
  "clipboard blocked",
  "공유 주소가 준비됐어요. 위 주소를 길게 눌러 복사할 수 있어요.",
]);

requireIncludes("src/app/feed/polls/[pollId]/stats/page.tsx", [
  "뉴앙 코드별 통계",
  "누가 어떤 선택을 했는지는 보여주지 않고",
  "한 명 이상 투표한 뉴앙 코드만 표시돼요",
  "0명인 코드는 숨겨요",
]);

requireIncludes("src/app/feed/polls/[pollId]/stats/page.test.tsx", [
  "shows anonymous code-level stats even when a code has one vote",
  "totalVotes: 2",
  "100% · 1명",
  'not.toHaveTextContent("5명")',
]);

requireIncludes("src/app/feed/reports/[postId]/page.tsx", [
  "피드 공유 리포트",
  "문항별 답변, 원점수",
  "나도 같은 검사 해보기",
]);

requireIncludes("src/app/feed/reports/[postId]/page.test.tsx", [
  "renders a summary-only shared report detail",
  "문항별 답변, 원점수, 계정 정보는 포함하지 않습니다.",
  'not.toHaveTextContent("직접 응답")',
  'not.toHaveTextContent("raw score")',
]);

requireIncludes("src/features/feed/server-read.ts", [
  "normalizeReportShareBody",
  "readStoredReportShareProfileName",
  "getNuangProfileName(reportShare.profileCode)",
]);

requireIncludes("supabase/migrations/202607100003_feed_mvp_interactions.sql", [
  "'balance_game'",
  "'report_share'",
  "create table if not exists feed.feed_poll",
  "create table if not exists feed.feed_poll_option",
  "create table if not exists feed.feed_poll_vote",
  "feed_poll_vote_active_account_idx",
  "nuang_code text",
  "notify pgrst, 'reload schema'",
]);

requireIncludes("src/features/account/MyTraitDetailView.tsx", [
  "코드 지도",
  "세부 신호",
  "최근 더 선명해진 부분",
  "여러 검사를 통해 축적된 데이터",
]);

requireIncludes("docs/NUANG_UX_GUARDRAILS.md", [
  "모바일 우선",
  "Tailwind",
  "이모지",
  "하단 메뉴 중복 방지",
  "한 화면에서 사용자가 즉시 선택해야 하는 행동은 적어야 한다",
  "함께",
  "피드, 커뮤니티, 게시글 composer를 넣지 않는다",
  "`계정 결과`, `로컬 결과`, `기기 사본`, `계정 저장`을 사용자-facing 상태나 CTA로 쓰지 않는다",
]);

requireIncludes("docs/NUANG_STAGE_HARNESS.md", [
  "작업 시작 순서",
  "승인 게이트",
  "npm run harness:check",
  "피드는 하단 메뉴에 넣는다",
  "docs/NUANG_FEED_MVP_INTERACTION_DESIGN.md",
  "피드 MVP 작성 형식, 리포트 preview, 오늘의 질문, 밸런스 게임, 뉴앙 코드별 통계",
  "함께 탭은 제거한다",
  "결과 공유의 기본 링크 복사 흐름은 리포트 상세의 `공유하기`와 30일 자동 만료 공유 주소를 중심으로 한다",
  "피드에 공유된 리포트 preview와 연결은 작성자가 해당 피드 글을 삭제하기 전까지 유지한다",
  "`202607100003_feed_mvp_interactions.sql` 적용 후 원격 DB에서 `feed.feed_poll`, `feed.feed_poll_option`, `feed.feed_poll_vote` 접근을 확인했다",
  "개발 seed는 밸런스 게임 5표와 피드 공유 리포트 preview를 포함한다",
  "1:1 비교는 링크 직접 입력이 아니라 상대 프로필 팝업의 `나와 비교하기`에서 시작한다",
  "프로필 팝업에는 프로필 이미지가 보여야 한다",
  "공개 코드는 사용자 경험에서 전면 폐기한다",
  "공개 코드 없는 대안은 공유 링크 token과 프로필 클릭 기반 `publicSnapshotId` 내부 연결이다",
  "하단 메뉴에는 함께 탭을 넣지 않는다",
  "사용자 화면에서는 `5축`, `10축`이라는 표현을 쓰지 않고",
  "docs/NUANG_CODE_INTERPRETATION_DICTIONARY.md",
  "현재 구현된 뉴앙 코드·32개 이름·비교 문장은 legacy v0.1 회귀 표면이다",
  "고객 공개 MVP의 작업 범례는 `E/I · R/N · G/A · K/M · C/Q`",
  "OE M04 실행 키트는 전 코어 통합 검토의 기술 템플릿",
  "설정성 기능은 `마이 > 설정`으로 모은다",
  "docs/NUANG_FREE_TOPIC_ASSESSMENT_MAPPING_PROPOSAL.md",
  "무료 주제 검사는 뉴앙의 체류 시간을 만드는 핵심 콘텐츠이며 승인된 성향 증거가 충분할 때 현재 대표 성향 코드를 갱신할 수 있다",
  "결제 여부는 성향 정확도 가중치가 아니며 무료와 유료는 같은 증거 기준을 사용한다",
]);

requireIncludes("docs/NUANG_MVP_WORK_QUEUE.md", [
  "H-001",
  "RBL-00",
  "RBL-01A",
  "MVP-FEED-001",
  "MVP-TOGETHER-001",
  "MVP-PUBLIC-CODE-001",
]);

requireIncludes("docs/NUANG_MVP_100_STAGE_PLAN.md", [
  "`/feed` 기본 구조",
  "공유 리포트 계약 재정의",
  "공개 코드 폐기",
  "MVP launch",
  "동적 성향 증거 모델",
  "피드가 검사 진행이나 비교 생성 흐름을 침범하지 않는다",
  "측정·제품 재기준화 게이트",
  "`RBL-01A~01D` 영역별 후보 감사",
]);

requireExcludes("src/app/feed/page.tsx", ["커뮤니티", "함께 탭", "안전"]);

requireIncludes("src/features/public-profile/PublicProfileModal.tsx", [
  "프로필",
  "나와 비교하기",
  "비공개 항목은 비교에 사용하지 않아요",
  "/api/public-comparisons",
]);

requireIncludes("src/features/public-profile/profile-image.ts", [
  'source: "character"',
  'source: "trait_image" | "user_uploaded"',
  "nuangCharacterAssetPaths",
]);

requireIncludes("src/features/together/server-public-comparisons.ts", [
  "createPublicComparisonForUser",
  "readPublicComparisonForUser",
  "targetPublicSnapshotId",
  "viewer_full_core_missing",
  "public_comparison_created",
]);

requireIncludes("scripts/seed-comparison-demo.mjs", [
  "Seeding NUANG comparison demo dataset",
  "profile_public_snapshot",
  "feed_post",
  "feed_poll",
  "feed_poll_option",
  "feed_poll_vote",
  "balance_game",
  "report_share",
  "pollVotes",
  "publicSnapshotId",
  'source: "character"',
]);

requireExcludes("src/features/public-profile/PublicProfileModal.tsx", [
  "공개 코드",
  "publicProfileCode",
  "스냅샷",
]);

requireExcludes("src/features/feed/feed-seed.ts", [
  "커뮤니티",
  "함께 탭",
  "안전",
  "궁합",
  "진단",
  "치료",
]);

requireExcludes("src/features/assessment/FreeTopicResultView.tsx", [
  "RO-EC",
  "RO-RN",
  "SE-AI",
  "SE-RE",
  "ER-IR",
  "ER-WD",
  "SM-EP",
  "SM-OS",
  "OE-AS",
  "OE-IE",
  "facet:",
]);

requireExcludes("src/features/feed/feed-contract.ts", [
  "community",
  "raw_assessment_response",
  "direct_response",
  "raw_score",
]);

requireExcludes("supabase/migrations/202607090103_feed_foundation.sql", [
  "community",
  "raw_score",
  "direct_response",
  "assessment_response",
]);

requireExcludes("supabase/migrations/202607090104_feed_seed_targets.sql", [
  "community",
  "raw_score",
  "direct_response",
  "assessment_response",
]);

requireExcludes("supabase/migrations/202607090105_feed_api_grants.sql", [
  "community",
  "raw_score",
  "direct_response",
  "assessment_response",
]);

requireExcludes("src/features/home/HomeDashboard.tsx", [
  "함께 피드",
  "피드와 커뮤니티",
]);

requireExcludes("src/app/(tabs)/together/page.tsx", [
  "Community",
  "커뮤니티",
  "피드",
]);

requireExcludes("src/features/account/LocalResultManager.tsx", [
  "계정 결과",
  "계정 저장",
  "이 기기",
  "로컬 결과",
  "기기 사본",
]);

requireExcludes("src/features/result/AccountResultView.tsx", [
  "계정 결과",
  "계정 저장",
  "이 기기",
  "로컬 결과",
]);

requireExcludes("src/features/result/LocalResultView.tsx", [
  "계정 결과",
  "계정 저장",
  "이 기기",
  "로컬 결과",
  "공유 링크 관리",
  "공유 링크 복사",
  "활성 공유 링크",
  "철회",
]);

requireIncludes("src/components/layout/BottomNavigation.tsx", [
  'href: "/feed"',
  'label: "피드"',
]);

requireExcludes("src/components/layout/BottomNavigation.tsx", [
  'href: "/together"',
  'label: "함께"',
]);

if (existsSync(resolve(root, "src/features/community"))) {
  failures.push("Legacy src/features/community directory must stay removed.");
}

for (const removedFile of [
  "src/app/p/[code]/page.tsx",
  "src/app/api/public-profile-code/route.ts",
  "src/app/api/public-profile-resolver/route.ts",
  "src/features/public-profile/public-profile-code-api.ts",
  "src/features/public-profile/public-profile-code-policy.ts",
  "src/features/public-profile/public-profile-resolver-contract.ts",
]) {
  if (existsSync(resolve(root, removedFile))) {
    failures.push(`Public code surface must stay removed: ${removedFile}`);
  }
}

requireExcludes("src/features/together/api-schemas.ts", [
  "publicProfileCode",
  "validatePublicProfileCode",
  "normalizePublicProfileCode",
]);

requireExcludes(
  "supabase/migrations/202607040091_public_profile_code_snapshot.sql",
  ["profile.profile_public_code", "public_code_issued", "public_code_revoked"],
);

requireExcludes(
  "supabase/migrations/202607040095_public_comparison_report.sql",
  ["target_public_code_id", "profile.profile_public_code"],
);

requirePackageScripts([
  "harness:check",
  "qa:mvp",
  "seed:dev:comparison",
  "research:m03:integrated-audit",
  "research:core:expert-kit",
  "research:core:expert-kit:check",
  "research:core:review-intake:preflight",
  "research:core:review-intake:manage",
  "research:core:review-analysis",
]);

warnIfCurrentDriftExists();

if (failures.length > 0) {
  console.error("NUANG product harness check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("NUANG product harness check passed.");

if (warnings.length > 0) {
  console.log("Known follow-up warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

function requireFile(file) {
  if (!existsSync(resolve(root, file))) {
    failures.push(`Missing required file: ${file}`);
  }
}

function readText(file) {
  const path = resolve(root, file);

  if (!existsSync(path)) {
    return "";
  }

  return readFileSync(path, "utf8");
}

function requireIncludes(file, requiredText) {
  const text = readText(file);

  for (const value of requiredText) {
    if (!text.includes(value)) {
      failures.push(`${file} must include: ${value}`);
    }
  }
}

function requireExcludes(file, forbiddenText) {
  const text = readText(file);

  for (const value of forbiddenText) {
    if (text.includes(value)) {
      failures.push(`${file} must not include: ${value}`);
    }
  }
}

function requirePackageScripts(scriptNames) {
  const packageJson = JSON.parse(readText("package.json"));

  for (const scriptName of scriptNames) {
    if (!packageJson.scripts?.[scriptName]) {
      failures.push(`package.json must include scripts.${scriptName}`);
    }
  }
}

function warnIfCurrentDriftExists() {
  const togetherPage = readText("src/app/(tabs)/together/page.tsx");
  const homeDashboard = readText("src/features/home/HomeDashboard.tsx");
  const assessmentPage = readText("src/app/(tabs)/assessments/page.tsx");
  const myPage = readText("src/app/(tabs)/my/page.tsx");

  if (togetherPage.includes("Community") || togetherPage.includes("피드")) {
    warnings.push(
      "Together route still contains feed/community UI and must be separated next.",
    );
  }

  if (
    homeDashboard.includes("함께 피드") ||
    homeDashboard.includes("피드와 커뮤니티")
  ) {
    warnings.push(
      "Home copy still mixes feed/community or points feed into Together.",
    );
  }

  if (assessmentPage.includes("함께 탭 피드")) {
    warnings.push("Assessment copy still routes feed behavior into Together.");
  }

  if (myPage.includes("공개 코드")) {
    failures.push("My page must not expose public code copy.");
  }
}
